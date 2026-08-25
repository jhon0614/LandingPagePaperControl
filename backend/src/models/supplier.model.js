// Consultas de persistencia para proveedores. La eliminación es lógica para
// conservar las asociaciones históricas con productos.
export class ModeloProveedor {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }
  async listar() {
    const [filas] = await this.conexiones.execute(
      `SELECT id, nombre, nombre_contacto, telefono, correo, direccion,
              esta_activo, creado_en, actualizado_en
         FROM proveedores WHERE eliminado_en IS NULL AND esta_activo = TRUE
        ORDER BY nombre`,
    );
    return filas;
  }
  async buscarPorId(id) {
    const [filas] = await this.conexiones.execute(
      `SELECT id, nombre, nombre_contacto, telefono, correo, direccion,
              esta_activo, creado_en, actualizado_en
         FROM proveedores WHERE id = ? AND eliminado_en IS NULL LIMIT 1`,
      [id],
    );
    return filas[0] ?? null;
  }
  async crear(datos) {
    const [resultado] = await this.conexiones.execute(
      `INSERT INTO proveedores (nombre, nombre_contacto, telefono, correo, direccion)
       VALUES (?, ?, ?, ?, ?)`,
      [
        datos.nombre,
        datos.contacto,
        datos.telefono,
        datos.correo,
        datos.direccion,
      ],
    );
    return resultado.insertId;
  }
  async actualizar(id, datos) {
    const [resultado] = await this.conexiones.execute(
      `UPDATE proveedores SET nombre = ?, nombre_contacto = ?, telefono = ?,
              correo = ?, direccion = ? WHERE id = ? AND eliminado_en IS NULL`,
      [
        datos.nombre,
        datos.contacto,
        datos.telefono,
        datos.correo,
        datos.direccion,
        id,
      ],
    );
    return resultado.affectedRows > 0;
  }
  async eliminar(id) {
    const [resultado] = await this.conexiones.execute(
      `UPDATE proveedores SET esta_activo = FALSE, eliminado_en = CURRENT_TIMESTAMP
        WHERE id = ? AND eliminado_en IS NULL`,
      [id],
    );
    return resultado.affectedRows > 0;
  }
}
