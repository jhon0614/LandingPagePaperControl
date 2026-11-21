import { ErrorAplicacion } from "../errors/app-error.js";

export class ServicioCategoria {
  constructor(modelo, cache) {
    this.modelo = modelo;
    this.cache = cache;
  }
  async listar(filtros = {}, informarCache = () => {}) {
    if (filtros.refrescar !== undefined && !["true", "false"].includes(filtros.refrescar))
      throw new ErrorAplicacion("refrescar debe ser true o false.", 400, "REFRESCAR_INVALIDO");
    const cargar = () => this.modelo.listar();
    if (!this.cache) { informarCache("BYPASS"); return cargar(); }
    return this.cache.obtenerOCargar({}, cargar, informarCache, { refrescar: filtros.refrescar === "true" });
  }

  async crear(datos) {
    try {
      const categoria = await this.modelo.crear(this.#nombre(datos.nombre));
      await this.cache?.invalidar();
      return categoria;
    } catch (error) {
      this.#traducir(error);
    }
  }

  async actualizar(id, datos) {
    try {
      const categoria = await this.modelo.actualizar(
        this.#id(id),
        this.#nombre(datos.nombre),
      );
      if (!categoria) this.#noEncontrada();
      await this.cache?.invalidar();
      return categoria;
    } catch (error) {
      this.#traducir(error);
    }
  }

  async eliminar(id) {
    try {
      if (!(await this.modelo.eliminar(this.#id(id)))) this.#noEncontrada();
      await this.cache?.invalidar();
    } catch (error) {
      this.#traducir(error);
    }
  }

  #id(valor) {
    if (
      !/^[1-9]\d*$/.test(String(valor)) ||
      !Number.isSafeInteger(Number(valor))
    )
      throw new ErrorAplicacion(
        "El ID de categoría no es válido.",
        400,
        "ID_CATEGORIA_INVALIDO",
      );
    return Number(valor);
  }
  #nombre(valor) {
    if (typeof valor !== "string" || !valor.trim() || valor.trim().length > 100)
      throw new ErrorAplicacion(
        "El nombre debe tener entre 1 y 100 caracteres.",
        400,
        "ERROR_VALIDACION",
      );
    return valor.trim();
  }
  #noEncontrada() {
    throw new ErrorAplicacion(
      "La categoría no fue encontrada.",
      404,
      "CATEGORIA_NO_ENCONTRADA",
    );
  }
  #traducir(error) {
    if (error.code === "ER_DUP_ENTRY")
      throw new ErrorAplicacion(
        "Ya existe una categoría con ese nombre.",
        409,
        "CATEGORIA_EXISTENTE",
      );
    if (error.code === "ER_ROW_IS_REFERENCED_2")
      throw new ErrorAplicacion(
        "Reasigna los productos antes de eliminar la categoría.",
        409,
        "CATEGORIA_CON_PRODUCTOS",
      );
    throw error;
  }
}
