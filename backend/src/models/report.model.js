// Construye el agregado directamente en MySQL para no cargar todos los
// detalles de venta en memoria.
export class ModeloReporte {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }
  async caja({ desde, hasta, vendedorId }) {
    // Una sola consulta mantiene pagos y gastos en una misma vista consistente.
    // UNION ALL evita multiplicar importes al combinar varios pagos y gastos.
    const filtroVenta = vendedorId == null ? "" : "AND v.vendido_por = ?";
    const filtroGasto = vendedorId == null ? "" : "AND g.registrado_por = ?";
    const parametros = [desde, hasta, ...(vendedorId == null ? [] : [vendedorId])];
    const [filas] = await this.conexiones.execute(
      `SELECT fecha, SUM(total_ventas) AS total_ventas, SUM(efectivo) AS efectivo,
              SUM(tarjeta) AS tarjeta, SUM(transferencia) AS transferencia,
              SUM(total_gastos) AS total_gastos
         FROM (
           SELECT DATE_FORMAT(v.confirmado_en, '%Y-%m-%d') AS fecha,
                  SUM(p.monto) AS total_ventas,
                  SUM(CASE WHEN mp.codigo = 'EFECTIVO' THEN p.monto ELSE 0 END) AS efectivo,
                  SUM(CASE WHEN mp.codigo = 'TARJETA' THEN p.monto ELSE 0 END) AS tarjeta,
                  SUM(CASE WHEN mp.codigo = 'TRANSFERENCIA' THEN p.monto ELSE 0 END) AS transferencia,
                  0 AS total_gastos
             FROM ventas v JOIN pagos_venta p ON p.venta_id = v.id
             JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
            WHERE v.estado = 'CONFIRMADA' AND v.confirmado_en >= ?
              AND v.confirmado_en < DATE_ADD(?, INTERVAL 1 DAY) ${filtroVenta}
            GROUP BY DATE_FORMAT(v.confirmado_en, '%Y-%m-%d')
           UNION ALL
           SELECT DATE_FORMAT(g.ocurrido_en, '%Y-%m-%d') AS fecha,
                  0, 0, 0, 0, SUM(g.monto)
             FROM gastos_caja g
            WHERE g.ocurrido_en >= ? AND g.ocurrido_en < DATE_ADD(?, INTERVAL 1 DAY) ${filtroGasto}
            GROUP BY DATE_FORMAT(g.ocurrido_en, '%Y-%m-%d')
         ) actividad
        GROUP BY fecha ORDER BY fecha`,
      [...parametros, ...parametros],
    );
    return filas;
  }
  async productosMasVendidos({ periodo, desde, hasta }) {
    let condicion;
    let parametros = [];
    if (periodo === "semana")
      condicion = "v.confirmado_en >= DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY)";
    // El mes se cuenta desde el primer día del mes calendario actual.
    else if (periodo === "mes")
      condicion = "v.confirmado_en >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')";
    else {
      condicion =
        "v.confirmado_en >= ? AND v.confirmado_en < DATE_ADD(?, INTERVAL 1 DAY)";
      parametros = [desde, hasta];
    }
    const [filas] = await this.conexiones.execute(
      `SELECT p.id, p.nombre, SUM(d.cantidad) AS cantidad_vendida
         FROM detalles_venta d
         JOIN ventas v ON v.id = d.venta_id
         JOIN productos p ON p.id = d.producto_id
        WHERE v.estado = 'CONFIRMADA' AND ${condicion}
        GROUP BY p.id, p.nombre
        ORDER BY cantidad_vendida DESC, p.nombre`,
      parametros,
    );
    return filas;
  }
}
