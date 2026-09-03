export class ModeloCategoria {
  constructor(conexiones) { this.conexiones = conexiones; }

  async listar() {
    const [filas] = await this.conexiones.execute(
      "SELECT id, nombre FROM categorias WHERE esta_activo = TRUE ORDER BY nombre",
    );
    return filas;
  }

  async crear(nombre) {
    const [resultado] = await this.conexiones.execute(
      "INSERT INTO categorias (nombre) VALUES (?)", [nombre],
    );
    return { id: resultado.insertId, nombre };
  }

  async actualizar(id, nombre) {
    const [resultado] = await this.conexiones.execute(
      "UPDATE categorias SET nombre = ? WHERE id = ? AND esta_activo = TRUE", [nombre, id],
    );
    return resultado.affectedRows ? { id, nombre } : null;
  }

  async eliminar(id) {
    // La FK bloquea también una asignación concurrente y protege el historial.
    const [resultado] = await this.conexiones.execute("DELETE FROM categorias WHERE id = ?", [id]);
    return resultado.affectedRows > 0;
  }
}
