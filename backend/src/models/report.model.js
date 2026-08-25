// Construye el agregado directamente en MySQL para no cargar todos los
// detalles de venta en memoria.
export class ModeloReporte {
  constructor(conexiones) {
    this.conexiones = conexiones;
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
