// Coordina las operaciones relacionadas con los roles.
export class ServicioRol {
  constructor(modeloRol) {
    this.modeloRol = modeloRol;
  }

  async listar() {
    // solicitar los roles al modelo.
    const roles = await this.modeloRol.listar();
    // devolver el resultado.
    return roles;
  }
}