import { calcularDescuento, validarDescuento } from "../utils/discount.js";
import { limiteSql } from "../utils/query.js";
import { centavos, importeSql } from "../utils/money.js";
import { randomUUID } from "node:crypto";

// Persiste ventas, pagos e inventario como una única unidad transaccional.
export class ModeloVenta {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async listarMetodosPago() {
    // La configuración se consulta desde la base de datos para que todas las
    // cajas compartan el mismo estado y no dependa del navegador utilizado.
    const [filas] = await this.conexiones.execute(
      `SELECT id, codigo, nombre, esta_activo
         FROM metodos_pago
        ORDER BY id`,
    );
    return filas;
  }

  async actualizarMetodoPago(id, estaActivo) {
    const [resultado] = await this.conexiones.execute(
      `UPDATE metodos_pago SET esta_activo = ? WHERE id = ?`,
      [estaActivo, id],
    );
    if (resultado.affectedRows === 0) return null;
    const [filas] = await this.conexiones.execute(
      `SELECT id, codigo, nombre, esta_activo
         FROM metodos_pago WHERE id = ? LIMIT 1`,
      [id],
    );
    return filas[0] ?? null;
  }

  async crear({
    usuarioId,
    clienteId,
    productos,
    metodoPago,
    tipoDescuento,
    valorDescuento = 0,
    referencia,
    montoRecibido,
    turnoCajaId,
    claveIdempotencia,
    hashSolicitud,
  }) {
    // Protege también a los consumidores internos que no pasan por la ruta HTTP.
    if (
      !Array.isArray(productos) ||
      productos.length === 0 ||
      productos.some(
        (p) =>
          !Number.isSafeInteger(p.productoId) ||
          p.productoId <= 0 ||
          !Number.isSafeInteger(p.cantidad) ||
          p.cantidad <= 0,
      ) ||
      new Set(productos.map((p) => p.productoId)).size !== productos.length
    ) {
      return { error: "PRODUCTO_INVALIDO" };
    }
    validarDescuento(tipoDescuento, valorDescuento);
    const conexion = await this.conexiones.getConnection();
    try {
      // La venta completa se confirma únicamente si caja, stock y pago son válidos.
      await conexion.beginTransaction();
      if (claveIdempotencia) {
        await conexion.execute(
          `INSERT INTO solicitudes_venta (usuario_id, clave, hash_solicitud)
            VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE clave = clave`,
          [usuarioId, claveIdempotencia, hashSolicitud],
        );
        const [solicitudes] = await conexion.execute(
          `SELECT hash_solicitud, venta_id FROM solicitudes_venta
            WHERE usuario_id = ? AND clave = ? FOR UPDATE`,
          [usuarioId, claveIdempotencia],
        );
        if (solicitudes[0].hash_solicitud !== hashSolicitud)
          return await this.#cancelar(conexion, {
            error: "IDEMPOTENCIA_CONFLICTO",
          });
        if (solicitudes[0].venta_id) {
          await conexion.commit();
          return { id: solicitudes[0].venta_id };
        }
      }
      const [turnos] = await conexion.execute(
        `SELECT id FROM turnos_caja WHERE estado = 'ABIERTO'
          AND (? IS NULL OR id = ?)
          ORDER BY abierto_en DESC LIMIT 1 FOR UPDATE`,
        [turnoCajaId ?? null, turnoCajaId ?? null],
      );
      if (!turnos[0])
        return await this.#cancelar(conexion, { error: "SIN_TURNO" });

      if (clienteId) {
        const [clientes] = await conexion.execute(
          `SELECT id FROM clientes WHERE id = ? AND esta_activo = TRUE
            AND eliminado_en IS NULL LIMIT 1`,
          [clienteId],
        );
        if (!clientes[0])
          return await this.#cancelar(conexion, { error: "CLIENTE_INVALIDO" });
      }

      const ids = productos.map((producto) => producto.productoId);
      const marcadores = ids.map(() => "?").join(",");
      // Bloquea los productos para evitar vender el mismo stock simultáneamente.
      const [filasProductos] = await conexion.execute(
        `SELECT id, nombre, sku, precio_venta, stock_actual, stock_minimo,
                alerta_stock_habilitada, esta_activo
           FROM productos WHERE id IN (${marcadores}) AND eliminado_en IS NULL
           ORDER BY id FOR UPDATE`,
        ids,
      );
      const porId = new Map(
        filasProductos.map((producto) => [Number(producto.id), producto]),
      );
      for (const solicitado of productos) {
        const producto = porId.get(solicitado.productoId);
        if (!producto || !producto.esta_activo)
          return await this.#cancelar(conexion, {
            error: "PRODUCTO_INVALIDO",
            productoId: solicitado.productoId,
          });
        if (Number(producto.stock_actual) < solicitado.cantidad)
          return await this.#cancelar(conexion, {
            error: "STOCK_INSUFICIENTE",
            productoId: solicitado.productoId,
            disponible: Number(producto.stock_actual),
          });
      }

      const [metodos] = await conexion.execute(
        `SELECT id, codigo FROM metodos_pago WHERE codigo = ? AND esta_activo = TRUE LIMIT 1`,
        [metodoPago],
      );
      if (!metodos[0])
        return await this.#cancelar(conexion, {
          error: "METODO_PAGO_INVALIDO",
        });

      // Los importes se calculan con los precios recuperados de la base de datos.
      const subtotalCentavos = productos.reduce(
        (total, solicitado) =>
          total +
          centavos(porId.get(solicitado.productoId).precio_venta) *
            BigInt(solicitado.cantidad),
        0n,
      );
      const descuentoCentavos = calcularDescuento(
        subtotalCentavos,
        tipoDescuento,
        valorDescuento,
      );
      const totalCentavos = subtotalCentavos - descuentoCentavos;
      if (totalCentavos <= 0n)
        return await this.#cancelar(conexion, { error: "TOTAL_INVALIDO" });
      const subtotal = importeSql(subtotalCentavos);
      const montoDescuento = importeSql(descuentoCentavos);
      const total = importeSql(totalCentavos);
      if (
        metodoPago === "EFECTIVO" &&
        montoRecibido != null &&
        centavos(montoRecibido) < totalCentavos
      )
        return await this.#cancelar(conexion, {
          error: "MONTO_RECIBIDO_INSUFICIENTE",
          total: Number(total),
        });

      // El valor temporal satisface la clave única hasta conocer el insertId.
      // numero_venta admite 30 caracteres, por eso se eliminan los guiones del
      // UUID y se limita la parte aleatoria a 26 caracteres más el prefijo.
      const temporal = `TMP-${randomUUID().replaceAll("-", "").slice(0, 26)}`;
      const [venta] = await conexion.execute(
        `INSERT INTO ventas
          (numero_venta, turno_caja_id, cliente_id, vendido_por, subtotal,
           tipo_descuento, valor_descuento, monto_descuento, monto_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          temporal,
          turnos[0].id,
          clienteId,
          usuarioId,
          subtotal,
          tipoDescuento,
          valorDescuento,
          montoDescuento,
          total,
        ],
      );
      const numeroVenta = `V-${String(venta.insertId).padStart(8, "0")}`;
      await conexion.execute(
        `UPDATE ventas SET numero_venta = ? WHERE id = ?`,
        [numeroVenta, venta.insertId],
      );

      for (const solicitado of productos) {
        // Cada línea descuenta existencias y deja trazabilidad en inventario.
        const producto = porId.get(solicitado.productoId);
        const precio = importeSql(centavos(producto.precio_venta));
        const stockAnterior = Number(producto.stock_actual);
        const stockPosterior = stockAnterior - solicitado.cantidad;
        await conexion.execute(
          `INSERT INTO detalles_venta
            (venta_id, producto_id, nombre_producto, sku, cantidad,
             precio_unitario, total_linea)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            venta.insertId,
            producto.id,
            producto.nombre,
            producto.sku,
            solicitado.cantidad,
            precio,
            importeSql(centavos(precio) * BigInt(solicitado.cantidad)),
          ],
        );
        await conexion.execute(
          `UPDATE productos SET stock_actual = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
          [stockPosterior, producto.id],
        );
        const [movimiento] = await conexion.execute(
          `INSERT INTO movimientos_inventario
            (producto_id, usuario_id, venta_id, tipo_movimiento, cantidad,
             stock_anterior, stock_posterior, referencia)
           VALUES (?, ?, ?, 'VENTA', ?, ?, ?, ?)`,
          [
            producto.id,
            usuarioId,
            venta.insertId,
            -solicitado.cantidad,
            stockAnterior,
            stockPosterior,
            numeroVenta,
          ],
        );
        // Solo crea una alerta activa por producto para evitar duplicados.
        if (
          producto.alerta_stock_habilitada &&
          stockPosterior <= Number(producto.stock_minimo)
        ) {
          await conexion.execute(
            `INSERT INTO alertas_inventario
              (producto_id, movimiento_inventario_id, stock_al_crear, stock_minimo_al_crear)
             SELECT ?, ?, ?, ? WHERE NOT EXISTS (
               SELECT 1 FROM alertas_inventario WHERE producto_id = ? AND estado = 'ACTIVA'
             )`,
            [
              producto.id,
              movimiento.insertId,
              stockPosterior,
              producto.stock_minimo,
              producto.id,
            ],
          );
        }
      }

      const cambio =
        metodoPago === "EFECTIVO" && montoRecibido != null
          ? importeSql(centavos(montoRecibido) - totalCentavos)
          : null;
      await conexion.execute(
        `INSERT INTO pagos_venta
          (venta_id, metodo_pago_id, monto, referencia, monto_recibido, cambio)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          venta.insertId,
          metodos[0].id,
          total,
          referencia,
          montoRecibido,
          cambio,
        ],
      );
      if (claveIdempotencia) {
        await conexion.execute(
          `UPDATE solicitudes_venta SET venta_id = ? WHERE usuario_id = ? AND clave = ?`,
          [venta.insertId, usuarioId, claveIdempotencia],
        );
      }
      await conexion.commit();
      return { id: venta.insertId };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async #cancelar(conexion, resultado) {
    // Devuelve un resultado de dominio después de restaurar todos los cambios.
    await conexion.rollback();
    return resultado;
  }

  async existeCliente(id) {
    const [filas] = await this.conexiones.execute(
      "SELECT id FROM clientes WHERE id = ? AND eliminado_en IS NULL LIMIT 1",
      [id],
    );
    return filas.length > 0;
  }

  async comprasCliente({
    clienteId,
    vendedorId,
    fechaInicio,
    fechaFin,
    estado,
    ...filtros
  }) {
    const condiciones = ["v.cliente_id = ?"];
    const parametros = [clienteId];
    if (vendedorId !== undefined) {
      condiciones.push("v.vendido_por = ?");
      parametros.push(vendedorId);
    }
    if (fechaInicio) {
      condiciones.push("v.confirmado_en >= ?");
      parametros.push(fechaInicio);
    }
    if (fechaFin) {
      condiciones.push("v.confirmado_en < DATE_ADD(?, INTERVAL 1 DAY)");
      parametros.push(fechaFin);
    }
    if (estado !== "TODAS") {
      condiciones.push("v.estado = ?");
      parametros.push(estado);
    }
    const [ventas] = await this.conexiones.execute(
      `SELECT v.*, CONCAT(u.nombres, ' ', u.apellidos) AS vendedor
        FROM ventas v JOIN usuarios u ON u.id = v.vendido_por
        WHERE ${condiciones.join(" AND ")} ORDER BY v.confirmado_en DESC, v.id DESC ${limiteSql(filtros)}`,
      parametros,
    );
    if (!ventas.length) return ventas;
    // Dos consultas por página: no se truncan productos con GROUP_CONCAT ni hay N+1.
    const ids = ventas.map((venta) => venta.id);
    const marcadores = ids.map(() => "?").join(",");
    const [items] = await this.conexiones.execute(
      `SELECT venta_id, producto_id, nombre_producto, sku, cantidad, precio_unitario, total_linea
        FROM detalles_venta WHERE venta_id IN (${marcadores}) ORDER BY venta_id, id`,
      ids,
    );
    const [pagos] = await this.conexiones.execute(
      `SELECT p.venta_id, mp.codigo FROM pagos_venta p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
        WHERE p.venta_id IN (${marcadores}) ORDER BY p.id`,
      ids,
    );
    const porVenta = new Map(
      ventas.map((venta) => [
        Number(venta.id),
        { ...venta, items: [], metodos: [] },
      ]),
    );
    for (const item of items)
      porVenta.get(Number(item.venta_id)).items.push(item);
    for (const pago of pagos)
      porVenta.get(Number(pago.venta_id)).metodos.push(pago.codigo);
    return [...porVenta.values()].map((venta) => ({
      ...venta,
      productos: venta.items
        .map((p) => `${p.nombre_producto} x${p.cantidad}`)
        .join(" | "),
      metodos_pago: [...new Set(venta.metodos)].join(","),
    }));
  }

  async buscarPorVendedor(usuarioId, filtros = {}) {
    const [filas] = await this.conexiones.execute(
      `${this.#consultaListado()} WHERE v.vendido_por = ?
        GROUP BY v.id ORDER BY v.confirmado_en DESC, v.id DESC ${limiteSql(filtros)}`,
      [usuarioId],
    );
    return filas;
  }

  async historial({ fechaInicio, fechaFin, vendedorId, orden, ...filtros }) {
    // Los nombres de columna para ordenar provienen de esta lista controlada.
    const condiciones = [];
    const parametros = [];
    if (fechaInicio) {
      condiciones.push("v.confirmado_en >= ?");
      parametros.push(fechaInicio);
    }
    if (fechaFin) {
      condiciones.push("v.confirmado_en < DATE_ADD(?, INTERVAL 1 DAY)");
      parametros.push(fechaFin);
    }
    if (vendedorId) {
      condiciones.push("v.vendido_por = ?");
      parametros.push(vendedorId);
    }
    const ordenes = {
      fecha: "v.confirmado_en DESC",
      monto: "v.monto_total DESC, v.confirmado_en DESC",
      vendedor: "u.nombres, u.apellidos, v.confirmado_en DESC",
    };
    const where = condiciones.length
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";
    const [filas] = await this.conexiones.execute(
      `${this.#consultaListado()} ${where} GROUP BY v.id ORDER BY ${ordenes[orden]}, v.id DESC ${limiteSql(filtros)}`,
      parametros,
    );
    return filas;
  }

  #consultaListado() {
    // Centraliza la proyección compartida entre ventas propias e historial.
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
    // Se consulta en tres bloques para evitar duplicar productos por cada pago.
    const [ventas] = await this.conexiones.execute(
      `SELECT v.*, CONCAT(u.nombres, ' ', u.apellidos) AS vendedor,
              c.tipo_documento, c.numero_documento,
              CONCAT(c.nombres, ' ', COALESCE(c.apellidos, '')) AS cliente
         FROM ventas v
         JOIN usuarios u ON u.id = v.vendido_por
         LEFT JOIN clientes c ON c.id = v.cliente_id
        WHERE v.id = ? LIMIT 1`,
      [id],
    );
    if (!ventas[0]) return null;
    const [productos] = await this.conexiones.execute(
      `SELECT producto_id, nombre_producto, sku, cantidad, precio_unitario,
              monto_descuento, monto_impuesto, total_linea
         FROM detalles_venta WHERE venta_id = ? ORDER BY id`,
      [id],
    );
    const [pagos] = await this.conexiones.execute(
      `SELECT mp.codigo, mp.nombre, p.monto, p.referencia,
              p.monto_recibido, p.cambio
         FROM pagos_venta p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
        WHERE p.venta_id = ? ORDER BY p.id`,
      [id],
    );
    return { venta: ventas[0], productos, pagos };
  }

  async anular({ id, usuarioId, puedeAnularCualquiera, motivo }) {
    const conexion = await this.conexiones.getConnection();
    try {
      // La anulación y la devolución del stock deben confirmarse juntas.
      await conexion.beginTransaction();
      const [ventas] = await conexion.execute(
        `SELECT v.id, v.numero_venta, v.vendido_por, v.estado, t.estado AS estado_turno
           FROM ventas v JOIN turnos_caja t ON t.id = v.turno_caja_id
          WHERE v.id = ? FOR UPDATE`,
        [id],
      );
      const venta = ventas[0];
      if (!venta)
        return await this.#cancelar(conexion, { error: "NO_ENCONTRADA" });
      if (!puedeAnularCualquiera && Number(venta.vendido_por) !== usuarioId)
        return await this.#cancelar(conexion, { error: "SIN_PERMISO" });
      if (venta.estado === "ANULADA")
        return await this.#cancelar(conexion, { error: "YA_ANULADA" });
      if (venta.estado_turno !== "ABIERTO")
        return await this.#cancelar(conexion, { error: "TURNO_CERRADO" });
      const [detalles] = await conexion.execute(
        `SELECT producto_id, cantidad FROM detalles_venta WHERE venta_id = ? ORDER BY producto_id`,
        [id],
      );
      for (const detalle of detalles) {
        // Bloquea cada producto antes de restaurar sus existencias.
        const [productos] = await conexion.execute(
          `SELECT id, stock_actual, stock_minimo FROM productos WHERE id = ? FOR UPDATE`,
          [detalle.producto_id],
        );
        const anterior = Number(productos[0].stock_actual);
        const posterior = anterior + Number(detalle.cantidad);
        await conexion.execute(
          `UPDATE productos SET stock_actual = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
          [posterior, detalle.producto_id],
        );
        await conexion.execute(
          `INSERT INTO movimientos_inventario
            (producto_id, usuario_id, venta_id, tipo_movimiento, cantidad,
             stock_anterior, stock_posterior, referencia, notas)
           VALUES (?, ?, ?, 'REVERSION_VENTA', ?, ?, ?, ?, ?)`,
          [
            detalle.producto_id,
            usuarioId,
            id,
            detalle.cantidad,
            anterior,
            posterior,
            venta.numero_venta,
            motivo,
          ],
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
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }
}
