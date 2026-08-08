// Agrupa las consultas relacionadas con los roles del sistema.
export class ModeloRol {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async listar() {
    // consultar los roles disponibles.
    const [filas] = await this.conexiones.execute(
      "SELECT id, nombre, descripcion FROM roles ORDER BY id",
    );
    // devolver las filas obtenidas.
    return filas;
  }

  async buscarPorId(id) {
    // consultar un rol por su ID.
    const [filas] = await this.conexiones.execute(
      "SELECT id, nombre, descripcion FROM roles WHERE id = ? LIMIT 1",
      [id],
    );
    // devolver la primera fila o null.
    return filas[0] ?? null;
  }
}
