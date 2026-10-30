// Agrupa las consultas de lectura utilizadas por el modelo de ventas.
export class ConsultasVenta {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async existeCliente(id) {
    const [filas] = await this.conexiones.execute(
      "SELECT id FROM clientes WHERE id = ? AND eliminado_en IS NULL LIMIT 1",
      [id],
    );
    return filas.length > 0;
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
}
