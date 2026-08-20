import { randomUUID } from "node:crypto";

export class ModeloVenta {
  constructor(conexiones) { this.conexiones = conexiones; }

  async crear({ usuarioId, clienteId, productos, metodoPago, tipoDescuento, valorDescuento, referencia, montoRecibido }) {
    const conexion = await this.conexiones.getConnection();
    try {
      await conexion.beginTransaction();
      const [turnos] = await conexion.execute(
        `SELECT id FROM turnos_caja WHERE estado = 'ABIERTO'
          ORDER BY abierto_en DESC LIMIT 1 FOR UPDATE`,
      );
      if (!turnos[0]) return await this.#cancelar(conexion, { error: "SIN_TURNO" });

      if (clienteId) {
        const [clientes] = await conexion.execute(
          `SELECT id FROM clientes WHERE id = ? AND esta_activo = TRUE
            AND eliminado_en IS NULL LIMIT 1`, [clienteId],
        );
        if (!clientes[0]) return await this.#cancelar(conexion, { error: "CLIENTE_INVALIDO" });
      }

      const ids = productos.map((producto) => producto.productoId);
      const marcadores = ids.map(() => "?").join(",");
      const [filasProductos] = await conexion.execute(
        `SELECT id, nombre, sku, precio_venta, stock_actual, stock_minimo,
                alerta_stock_habilitada, esta_activo
           FROM productos WHERE id IN (${marcadores})
           ORDER BY id FOR UPDATE`, ids,
      );
      const porId = new Map(filasProductos.map((producto) => [Number(producto.id), producto]));
      for (const solicitado of productos) {
        const producto = porId.get(solicitado.productoId);
        if (!producto || !producto.esta_activo) return await this.#cancelar(conexion, { error: "PRODUCTO_INVALIDO", productoId: solicitado.productoId });
        if (Number(producto.stock_actual) < solicitado.cantidad) return await this.#cancelar(conexion, { error: "STOCK_INSUFICIENTE", productoId: solicitado.productoId, disponible: Number(producto.stock_actual) });
      }

      const [metodos] = await conexion.execute(
        `SELECT id, codigo FROM metodos_pago WHERE codigo = ? AND esta_activo = TRUE LIMIT 1`,
        [metodoPago],
      );
      if (!metodos[0]) return await this.#cancelar(conexion, { error: "METODO_PAGO_INVALIDO" });

      const subtotal = productos.reduce((total, solicitado) => total + Number(porId.get(solicitado.productoId).precio_venta) * solicitado.cantidad, 0);
      const montoDescuento = tipoDescuento === "PORCENTAJE"
        ? this.#redondear(subtotal * valorDescuento / 100)
        : tipoDescuento === "VALOR_FIJO" ? valorDescuento : 0;
      if (montoDescuento > subtotal) return await this.#cancelar(conexion, { error: "DESCUENTO_INVALIDO" });
      const total = this.#redondear(subtotal - montoDescuento);
      if (total <= 0) return await this.#cancelar(conexion, { error: "TOTAL_INVALIDO" });
      if (metodoPago === "EFECTIVO" && montoRecibido != null && montoRecibido < total) {
        return await this.#cancelar(conexion, { error: "MONTO_RECIBIDO_INSUFICIENTE", total });
      }

      const temporal = `TMP-${randomUUID()}`;
      const [venta] = await conexion.execute(
        `INSERT INTO ventas
          (numero_venta, turno_caja_id, cliente_id, vendido_por, subtotal,
           tipo_descuento, valor_descuento, monto_descuento, monto_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [temporal, turnos[0].id, clienteId, usuarioId, subtotal, tipoDescuento, valorDescuento, montoDescuento, total],
      );
      const numeroVenta = `V-${String(venta.insertId).padStart(8, "0")}`;
      await conexion.execute(`UPDATE ventas SET numero_venta = ? WHERE id = ?`, [numeroVenta, venta.insertId]);

      for (const solicitado of productos) {
        const producto = porId.get(solicitado.productoId);
        const precio = Number(producto.precio_venta);
        const stockAnterior = Number(producto.stock_actual);
        const stockPosterior = stockAnterior - solicitado.cantidad;
        await conexion.execute(
          `INSERT INTO detalles_venta
            (venta_id, producto_id, nombre_producto, sku, cantidad,
             precio_unitario, total_linea)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [venta.insertId, producto.id, producto.nombre, producto.sku, solicitado.cantidad, precio, this.#redondear(precio * solicitado.cantidad)],
        );
        await conexion.execute(`UPDATE productos SET stock_actual = ? WHERE id = ?`, [stockPosterior, producto.id]);
        const [movimiento] = await conexion.execute(
          `INSERT INTO movimientos_inventario
            (producto_id, usuario_id, venta_id, tipo_movimiento, cantidad,
             stock_anterior, stock_posterior, referencia)
           VALUES (?, ?, ?, 'VENTA', ?, ?, ?, ?)`,
          [producto.id, usuarioId, venta.insertId, -solicitado.cantidad, stockAnterior, stockPosterior, numeroVenta],
        );
        if (producto.alerta_stock_habilitada && stockPosterior <= Number(producto.stock_minimo)) {
          await conexion.execute(
            `INSERT INTO alertas_inventario
              (producto_id, movimiento_inventario_id, stock_al_crear, stock_minimo_al_crear)
             SELECT ?, ?, ?, ? WHERE NOT EXISTS (
               SELECT 1 FROM alertas_inventario WHERE producto_id = ? AND estado = 'ACTIVA'
             )`,
            [producto.id, movimiento.insertId, stockPosterior, producto.stock_minimo, producto.id],
          );
        }
      }

      const cambio = metodoPago === "EFECTIVO" && montoRecibido != null ? this.#redondear(montoRecibido - total) : null;
      await conexion.execute(
        `INSERT INTO pagos_venta
          (venta_id, metodo_pago_id, monto, referencia, monto_recibido, cambio)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [venta.insertId, metodos[0].id, total, referencia, montoRecibido, cambio],
      );
      await conexion.commit();
      return { id: venta.insertId };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally { conexion.release(); }
  }

  async #cancelar(conexion, resultado) {
    await conexion.rollback();
    return resultado;
  }

  #redondear(valor) { return Math.round((valor + Number.EPSILON) * 100) / 100; }

  async buscarPorVendedor(usuarioId) {
    const [filas] = await this.conexiones.execute(
      `${this.#consultaListado()} WHERE v.vendido_por = ?
        GROUP BY v.id ORDER BY v.confirmado_en DESC`, [usuarioId],
    );
    return filas;
  }

  async historial({ fechaInicio, fechaFin, vendedorId, orden }) {
    const condiciones = [];
    const parametros = [];
    if (fechaInicio) { condiciones.push("v.confirmado_en >= ?"); parametros.push(fechaInicio); }
    if (fechaFin) { condiciones.push("v.confirmado_en < DATE_ADD(?, INTERVAL 1 DAY)"); parametros.push(fechaFin); }
    if (vendedorId) { condiciones.push("v.vendido_por = ?"); parametros.push(vendedorId); }
    const ordenes = {
      fecha: "v.confirmado_en DESC",
      monto: "v.monto_total DESC, v.confirmado_en DESC",
      vendedor: "u.nombres, u.apellidos, v.confirmado_en DESC",
    };
    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const [filas] = await this.conexiones.execute(
      `${this.#consultaListado()} ${where} GROUP BY v.id ORDER BY ${ordenes[orden]}`,
      parametros,
    );
    return filas;
  }

  #consultaListado() {
    return `SELECT v.id, v.numero_venta, v.vendido_por, v.subtotal,
                   v.tipo_descuento, v.valor_descuento, v.monto_descuento,
                   v.monto_total, v.estado, v.confirmado_en,
                   CONCAT(u.nombres, ' ', u.apellidos) AS vendedor,
                   GROUP_CONCAT(DISTINCT mp.codigo ORDER BY mp.codigo SEPARATOR ',') AS metodos_pago,
                   GROUP_CONCAT(CONCAT(d.nombre_producto, ' x', d.cantidad)
                     ORDER BY d.id SEPARATOR ' | ') AS productos
              FROM ventas v
              JOIN usuarios u ON u.id = v.vendido_por
              JOIN detalles_venta d ON d.venta_id = v.id
              JOIN pagos_venta p ON p.venta_id = v.id
              JOIN metodos_pago mp ON mp.id = p.metodo_pago_id`;
  }

  async comprobante(id) {
    const [ventas] = await this.conexiones.execute(
      `SELECT v.*, CONCAT(u.nombres, ' ', u.apellidos) AS vendedor,
              c.tipo_documento, c.numero_documento,
              CONCAT(c.nombres, ' ', COALESCE(c.apellidos, '')) AS cliente
         FROM ventas v
         JOIN usuarios u ON u.id = v.vendido_por
         LEFT JOIN clientes c ON c.id = v.cliente_id
        WHERE v.id = ? LIMIT 1`, [id],
    );
    if (!ventas[0]) return null;
    const [productos] = await this.conexiones.execute(
      `SELECT producto_id, nombre_producto, sku, cantidad, precio_unitario,
              monto_descuento, monto_impuesto, total_linea
         FROM detalles_venta WHERE venta_id = ? ORDER BY id`, [id],
    );
    const [pagos] = await this.conexiones.execute(
      `SELECT mp.codigo, mp.nombre, p.monto, p.referencia,
              p.monto_recibido, p.cambio
         FROM pagos_venta p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
        WHERE p.venta_id = ? ORDER BY p.id`, [id],
    );
    return { venta: ventas[0], productos, pagos };
  }

  async anular({ id, usuarioId, puedeAnularCualquiera, motivo }) {
    const conexion = await this.conexiones.getConnection();
    try {
      await conexion.beginTransaction();
      const [ventas] = await conexion.execute(
        `SELECT v.id, v.numero_venta, v.vendido_por, v.estado, t.estado AS estado_turno
           FROM ventas v JOIN turnos_caja t ON t.id = v.turno_caja_id
          WHERE v.id = ? FOR UPDATE`, [id],
      );
      const venta = ventas[0];
      if (!venta) return await this.#cancelar(conexion, { error: "NO_ENCONTRADA" });
      if (!puedeAnularCualquiera && Number(venta.vendido_por) !== usuarioId) return await this.#cancelar(conexion, { error: "SIN_PERMISO" });
      if (venta.estado === "ANULADA") return await this.#cancelar(conexion, { error: "YA_ANULADA" });
      if (venta.estado_turno !== "ABIERTO") return await this.#cancelar(conexion, { error: "TURNO_CERRADO" });
      const [detalles] = await conexion.execute(
        `SELECT producto_id, cantidad FROM detalles_venta WHERE venta_id = ? ORDER BY producto_id`, [id],
      );
      for (const detalle of detalles) {
        const [productos] = await conexion.execute(
          `SELECT id, stock_actual, stock_minimo FROM productos WHERE id = ? FOR UPDATE`, [detalle.producto_id],
        );
        const anterior = Number(productos[0].stock_actual);
        const posterior = anterior + Number(detalle.cantidad);
        await conexion.execute(`UPDATE productos SET stock_actual = ? WHERE id = ?`, [posterior, detalle.producto_id]);
        await conexion.execute(
          `INSERT INTO movimientos_inventario
            (producto_id, usuario_id, venta_id, tipo_movimiento, cantidad,
             stock_anterior, stock_posterior, referencia, notas)
           VALUES (?, ?, ?, 'REVERSION_VENTA', ?, ?, ?, ?, ?)`,
          [detalle.producto_id, usuarioId, id, detalle.cantidad, anterior, posterior, venta.numero_venta, motivo],
        );
        if (posterior > Number(productos[0].stock_minimo)) {
          await conexion.execute(
            `UPDATE alertas_inventario SET estado = 'RESUELTA', resuelto_en = CURRENT_TIMESTAMP,
                    resuelto_por = ? WHERE producto_id = ? AND estado = 'ACTIVA'`,
            [usuarioId, detalle.producto_id],
          );
        }
      }
      await conexion.execute(
        `UPDATE ventas SET estado = 'ANULADA', cancelado_en = CURRENT_TIMESTAMP,
                cancelado_por = ?, motivo_cancelacion = ? WHERE id = ?`,
        [usuarioId, motivo, id],
      );
      await conexion.commit();
      return { anulada: true };
    } catch (error) { await conexion.rollback(); throw error; }
    finally { conexion.release(); }
  }
}
