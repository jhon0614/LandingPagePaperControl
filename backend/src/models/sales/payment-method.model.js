export class ModeloMetodoPago {
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
}
