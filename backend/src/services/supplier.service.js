import { ErrorAplicacion } from "../errors/app-error.js";
import { paginacion, busquedaSql } from "../utils/query.js";

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
  constructor(modelo, cache) {
    this.modelo = modelo;
    this.cache = cache;
  }
  async listar(filtros = {}, informarCache = () => {}) {
    if (filtros.refrescar !== undefined && !["true", "false"].includes(filtros.refrescar))
      throw new ErrorAplicacion("refrescar debe ser true o false.", 400, "REFRESCAR_INVALIDO");
    const { pagina, limite } = paginacion(filtros);
    busquedaSql(filtros.buscar, []);
    const consulta = { pagina, limite, buscar: filtros.buscar?.trim() || "" };
    const cargar = async () => (await this.modelo.listar(consulta)).map(presentar);
    if (!this.cache) { informarCache("BYPASS"); return cargar(); }
    return this.cache.obtenerOCargar(consulta, cargar, informarCache, { refrescar: filtros.refrescar === "true" });
  }
  async obtener(id) {
    const fila = await this.modelo.buscarPorId(this.#id(id));
    if (!fila) this.#noEncontrado();
    return presentar(fila);
  }
  async crear(datos) {
    const id = await this.modelo.crear(this.#normalizar(datos));
    await this.cache?.invalidar();
    return this.obtener(id);
  }
  async actualizar(id, datos) {
    const proveedorId = this.#id(id);
    if (!(await this.modelo.actualizar(proveedorId, this.#normalizar(datos))))
      this.#noEncontrado();
    await this.cache?.invalidar();
    return this.obtener(proveedorId);
  }
  async eliminar(id) {
    if (!(await this.modelo.eliminar(this.#id(id)))) this.#noEncontrado();
    await this.cache?.invalidar();
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
