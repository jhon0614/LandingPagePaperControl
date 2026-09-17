// Obtiene en una sola consulta los contadores que consume el dashboard.
export class ModeloDashboard {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async resumen() {
    const [filas] = await this.conexiones.execute(
      `SELECT
         (SELECT COUNT(*)
            FROM productos
           WHERE esta_activo = TRUE AND eliminado_en IS NULL) AS productos,
         (SELECT COUNT(*)
            FROM ventas
           WHERE estado = 'CONFIRMADA') AS ventas,
         (SELECT COUNT(*)
            FROM usuarios
           WHERE esta_activo = TRUE AND eliminado_en IS NULL) AS usuarios,
         (SELECT COUNT(*)
            FROM productos
           WHERE esta_activo = TRUE
             AND eliminado_en IS NULL
             AND stock_actual > 0
             AND stock_actual <= stock_minimo) AS stock_bajo`,
    );

    return filas[0];
  }
}
