import { calcularDescuento, validarDescuento } from "../utils/discount.js";
import { centavos, importeSql } from "../utils/money.js";
import { randomUUID } from "node:crypto";
import { ModeloMetodoPago } from "./sales/payment-method.model.js";
import { ConsultasVenta } from "./sales/sale-queries.js";

// Persiste ventas, pagos e inventario como una única unidad transaccional.
export class ModeloVenta {
  constructor(conexiones) {
    this.conexiones = conexiones;
    // Comparte el mismo grupo de conexiones con el modelo de métodos de pago.
    this.modeloMetodoPago = new ModeloMetodoPago(conexiones);
    this.consultasVenta = new ConsultasVenta(conexiones);
  }

  async listarMetodosPago() {
    return this.modeloMetodoPago.listarMetodosPago();
  }

  async actualizarMetodoPago(id, estaActivo) {
    return this.modeloMetodoPago.actualizarMetodoPago(id, estaActivo);
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
    return this.consultasVenta.existeCliente(id);
  }

  async comprasCliente(filtros) {
    return this.consultasVenta.comprasCliente(filtros);
  }

  async buscarPorVendedor(usuarioId, filtros = {}) {
    return this.consultasVenta.buscarPorVendedor(usuarioId, filtros);
  }

  async historial(filtros) {
    return this.consultasVenta.historial(filtros);
  }

  async comprobante(id) {
    return this.consultasVenta.comprobante(id);
  }

  async buscarVentaParaAnular(conexion, id) {
    const [ventas] = await conexion.execute(
      `SELECT v.id, v.numero_venta, v.vendido_por, v.estado,
            t.estado AS estado_turno
       FROM ventas v
       JOIN turnos_caja t ON t.id = v.turno_caja_id
      WHERE v.id = ? FOR UPDATE`,
      [id],
    );

    return ventas[0];
  }

  async buscarDetallesParaAnular(conexion, id) {
    const [detalles] = await conexion.execute(
      `SELECT producto_id, cantidad
       FROM detalles_venta
      WHERE venta_id = ?
      ORDER BY producto_id`,
      [id],
    );

    return detalles;
  }

  async marcarVentaAnulada(conexion, id, usuarioId, motivo) {
    await conexion.execute(
      `UPDATE ventas
        SET estado = 'ANULADA',
            cancelado_en = CURRENT_TIMESTAMP,
            cancelado_por = ?,
            motivo_cancelacion = ?
      WHERE id = ?`,
      [usuarioId, motivo, id],
    );
  }

  async buscarProductoParaAnular(conexion, productoId) {
    const [productos] = await conexion.execute(
      `SELECT id, stock_actual, stock_minimo
       FROM productos
      WHERE id = ? FOR UPDATE`,
      [productoId],
    );

    return productos;
  }

  async actualizarStockProducto(conexion, productoId, stock) {
    await conexion.execute(
      `UPDATE productos
        SET stock_actual = ?,
            actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [stock, productoId],
    );
  }

  async registrarMovimientoAnulacion(conexion, datos) {
    await conexion.execute(
      `INSERT INTO movimientos_inventario
      (producto_id, usuario_id, venta_id, tipo_movimiento, cantidad,
       stock_anterior, stock_posterior, referencia, notas)
     VALUES (?, ?, ?, 'REVERSION_VENTA', ?, ?, ?, ?, ?)`,
      [
        datos.productoId,
        datos.usuarioId,
        datos.ventaId,
        datos.cantidad,
        datos.stockAnterior,
        datos.stockPosterior,
        datos.referencia,
        datos.motivo,
      ],
    );
  }

  async resolverAlertasProducto(conexion, productoId, usuarioId) {
    await conexion.execute(
      `UPDATE alertas_inventario
        SET estado = 'RESUELTA',
            resuelto_en = CURRENT_TIMESTAMP,
            resuelto_por = ?
      WHERE producto_id = ? AND estado = 'ACTIVA'`,
      [usuarioId, productoId],
    );
  }

  async anular({ id, usuarioId, puedeAnularCualquiera, motivo }) {
    const conexion = await this.conexiones.getConnection();
    try {
      // La anulación y la devolución del stock deben confirmarse juntas.
      await conexion.beginTransaction();
      const venta = await this.buscarVentaParaAnular(conexion, id);

      if (!venta)
        return await this.#cancelar(conexion, { error: "NO_ENCONTRADA" });
      if (!puedeAnularCualquiera && Number(venta.vendido_por) !== usuarioId)
        return await this.#cancelar(conexion, { error: "SIN_PERMISO" });
      if (venta.estado === "ANULADA")
        return await this.#cancelar(conexion, { error: "YA_ANULADA" });
      if (venta.estado_turno !== "ABIERTO")
        return await this.#cancelar(conexion, { error: "TURNO_CERRADO" });

      const detalles = await this.buscarDetallesParaAnular(conexion, id);
      for (const detalle of detalles) {
        // Bloquea cada producto antes de restaurar sus existencias.
        const productos = await this.buscarProductoParaAnular(
          conexion,
          detalle.producto_id,
        );
        const anterior = Number(productos[0].stock_actual);
        const posterior = anterior + Number(detalle.cantidad);
        await this.actualizarStockProducto(
          conexion,
          detalle.producto_id,
          posterior,
        );
        await this.registrarMovimientoAnulacion(conexion, {
          productoId: detalle.producto_id,
          usuarioId,
          ventaId: id,
          cantidad: detalle.cantidad,
          stockAnterior: anterior,
          stockPosterior: posterior,
          referencia: venta.numero_venta,
          motivo,
        });

        if (posterior > Number(productos[0].stock_minimo)) {
          await this.resolverAlertasProducto(
            conexion,
            detalle.producto_id,
            usuarioId,
          );
        }
      }
      await this.marcarVentaAnulada(conexion, id, usuarioId, motivo);
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
