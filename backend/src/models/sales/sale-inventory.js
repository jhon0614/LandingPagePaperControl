import { centavos, importeSql } from "../../utils/money.js";

// Guarda los detalles y movimientos usando la transacción recibida.
// La creación de la venta conserva el control del commit y del rollback.
export class InventarioVenta {
  async registrarProductos(
    conexion,
    { productos, porId, ventaId, usuarioId, numeroVenta },
  ) {
    // Cada producto guarda su detalle, descuenta stock y registra el movimiento.
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
          ventaId,
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
          ventaId,
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
  }
}
