import { ErrorAplicacion } from "../errors/app-error.js";

// Presenta los nombres esperados por Proveedores.jsx y normaliza los campos
// opcionales antes de enviarlos a MySQL.
const presentar = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  contacto: fila.nombre_contacto,
  telefono: fila.telefono,
  correo: fila.correo,
  direccion: fila.direccion,
  estaActivo: Boolean(fila.esta_activo),
  creadoEn: fila.creado_en,
  actualizadoEn: fila.actualizado_en,
});

export class ServicioProveedor {
  constructor(modelo) {
    this.modelo = modelo;
  }
  async listar() {
    return (await this.modelo.listar()).map(presentar);
  }
  async obtener(id) {
    const fila = await this.modelo.buscarPorId(this.#id(id));
    if (!fila) this.#noEncontrado();
    return presentar(fila);
  }
  async crear(datos) {
    const id = await this.modelo.crear(this.#normalizar(datos));
    return this.obtener(id);
  }
  async actualizar(id, datos) {
    const proveedorId = this.#id(id);
    if (!(await this.modelo.actualizar(proveedorId, this.#normalizar(datos))))
      this.#noEncontrado();
    return this.obtener(proveedorId);
  }
  async eliminar(id) {
    if (!(await this.modelo.eliminar(this.#id(id)))) this.#noEncontrado();
  }
  #normalizar(datos) {
    return {
      nombre: datos.nombre.trim(),
      contacto: datos.contacto?.trim() || null,
      telefono: datos.telefono?.trim() || null,
      correo: datos.correo?.trim().toLowerCase() || null,
      direccion: datos.direccion?.trim() || null,
    };
  }
  #id(valor) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0)
      throw new ErrorAplicacion(
        "El ID de proveedor no es válido.",
        400,
        "ID_PROVEEDOR_INVALIDO",
      );
    return id;
  }
  #noEncontrado() {
    throw new ErrorAplicacion(
      "El proveedor no fue encontrado.",
      404,
      "PROVEEDOR_NO_ENCONTRADO",
    );
  }
}
