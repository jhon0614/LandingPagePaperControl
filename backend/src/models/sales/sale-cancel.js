// Agrupa la anulación y la devolución de existencias en una sola transacción.
export class AnuladorVenta {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async #cancelar(conexion, resultado) {
    // Devuelve un resultado de dominio después de restaurar todos los cambios.
    await conexion.rollback();
    return resultado;
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
