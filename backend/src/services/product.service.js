import { ErrorAplicacion } from "../errors/app-error.js";
import { paginacion, busquedaSql } from "../utils/query.js";

// Traduce las filas de MySQL al contrato en camelCase que consume Inventario.jsx.
const numero = (valor) => Number(valor ?? 0);
const proveedor = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  telefono: fila.telefono,
});

function presentarProducto(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    marca: fila.descripcion ?? "",
    codigo: fila.sku,
    categoria: fila.categoria,
    categoriaId: fila.categoria_id,
    precioMayor: numero(fila.precio_compra),
    precioDetal: numero(fila.precio_venta),
    // Ventas.jsx utiliza precio como alias del precio al detal.
    precio: numero(fila.precio_venta),
    stock: Number(fila.stock_actual),
    stockMinimo: Number(fila.stock_minimo),
    estaActivo: Boolean(fila.esta_activo),
    proveedores: (fila.proveedores ?? []).map(proveedor),
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

function presentarMovimiento(fila) {
  return {
    id: fila.id,
    tipo: fila.tipo_movimiento,
    cantidad: Number(fila.cantidad),
    stockAnterior: Number(fila.stock_anterior),
    stockPosterior: Number(fila.stock_posterior),
    usuarioId: fila.usuario_id,
    usuarioNombre: fila.usuario,
    nota: fila.notas,
    referencia: fila.referencia,
    creadoEn: fila.creado_en,
  };
}

export class ServicioProducto {
  constructor(modelo, cacheCategorias, cacheProductos, cacheDashboard) {
    this.modelo = modelo;
    this.cacheCategorias = cacheCategorias;
    this.cacheProductos = cacheProductos;
    this.cacheDashboard = cacheDashboard;
  }

  async categorias() {
    return this.modelo.categorias();
  }

  async listar(incluirInactivos, categoriaId, filtros = {}, informarCache = () => {}) {
    if (filtros.refrescar !== undefined && !["true", "false"].includes(filtros.refrescar))
      throw new ErrorAplicacion("refrescar debe ser true o false.", 400, "REFRESCAR_INVALIDO");
    const { pagina, limite } = paginacion(filtros);
    busquedaSql(filtros.buscar, []);
    const categoria =
      categoriaId == null ? undefined : this.#id(categoriaId, "categoria");
    const consulta = { pagina, limite, buscar: filtros.buscar?.trim() || "" };
    const cargar = async () => (
      await this.modelo.listar(incluirInactivos === "true", categoria, consulta)
    ).map(presentarProducto);
    if (!this.cacheProductos) { informarCache("BYPASS"); return cargar(); }
    const clave = { ...consulta, categoriaId: categoria ?? null, incluirInactivos: incluirInactivos === "true" };
    return this.cacheProductos.obtenerOCargar(clave, cargar, informarCache, { refrescar: filtros.refrescar === "true" });
  }

  async obtener(id) {
    const producto = await this.modelo.buscarPorId(this.#id(id));
    if (!producto)
      throw new ErrorAplicacion(
        "El producto no fue encontrado.",
        404,
        "PRODUCTO_NO_ENCONTRADO",
      );
    return presentarProducto(producto);
  }

  async crear(datos, usuarioId) {
    try {
      const id = await this.modelo.crear(datos, usuarioId);
      await this.cacheDashboard?.invalidar();
      await this.cacheProductos?.invalidar();
      await this.cacheCategorias?.invalidar();
      return this.obtener(id);
    } catch (error) {
      this.#traducirDuplicado(error);
      throw error;
    }
  }

  async actualizar(id, datos, usuarioId) {
    const productoId = this.#id(id);
    try {
      if (!(await this.modelo.actualizar(productoId, datos, usuarioId)))
        this.#noEncontrado();
      await this.cacheDashboard?.invalidar();
      await this.cacheProductos?.invalidar();
      await this.cacheCategorias?.invalidar();
      return this.obtener(productoId);
    } catch (error) {
      this.#traducirDuplicado(error);
      throw error;
    }
  }

  async cambiarEstado(id, estaActivo) {
    const productoId = this.#id(id);
    if (!(await this.modelo.cambiarEstado(productoId, estaActivo)))
      this.#noEncontrado();
    await this.cacheDashboard?.invalidar();
    await this.cacheProductos?.invalidar();
    return this.obtener(productoId);
  }

  async eliminar(id, usuarioId) {
    // El modelo decide entre eliminación física y desactivación según exista
    // historial que deba conservarse.
    const resultado = await this.modelo.eliminar(
      this.#id(id),
      this.#id(usuarioId, "usuario"),
    );
    if (resultado.noExiste) this.#noEncontrado();
    if (resultado.tieneVentas)
      throw new ErrorAplicacion(
        "No se puede eliminar un producto con ventas registradas. Puede desactivarlo para impedir nuevas ventas.",
        409,
        "PRODUCTO_CON_VENTAS",
      );
    await this.cacheDashboard?.invalidar();
    await this.cacheProductos?.invalidar();
    return resultado;
  }

  async movimientos(id) {
    const productoId = this.#id(id);
    await this.obtener(productoId);
    return (await this.modelo.listarMovimientos(productoId)).map(
      presentarMovimiento,
    );
  }

  async registrarMovimiento(id, datos, usuarioId) {
    const productoId = this.#id(id);
    const resultado = await this.modelo.registrarMovimiento({
      productoId,
      usuarioId,
      ...datos,
    });
    if (resultado == null) this.#noEncontrado();
    if (resultado.sinCambio)
      throw new ErrorAplicacion(
        "El ajuste no modifica el stock actual.",
        409,
        "MOVIMIENTO_SIN_CAMBIO",
      );
    await this.cacheDashboard?.invalidar();
    await this.cacheProductos?.invalidar();
    const movimientos = await this.modelo.listarMovimientos(productoId);
    return presentarMovimiento(
      movimientos.find((fila) => Number(fila.id) === Number(resultado)) ??
        movimientos[0],
    );
  }

  async alertas() {
    return (await this.modelo.alertasStock()).map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      stock: Number(fila.stock_actual),
      stockMinimo: Number(fila.stock_minimo),
      proveedores: (fila.proveedores ?? []).map(proveedor),
    }));
  }

  async proveedores(id) {
    const productoId = this.#id(id);
    await this.obtener(productoId);
    return (await this.modelo.listarProveedores(productoId)).map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      contacto: fila.nombre_contacto,
      telefono: fila.telefono,
      correo: fila.correo,
      direccion: fila.direccion,
    }));
  }

  async asociarProveedor(id, proveedorId) {
    // Asociar dos veces es idempotente: se devuelve la lista actual sin error.
    const productoId = this.#id(id);
    const idProveedor = this.#id(proveedorId, "proveedor");
    await this.obtener(productoId);
    if (!(await this.modelo.asociarProveedor(productoId, idProveedor))) {
      const existentes = await this.modelo.listarProveedores(productoId);
      if (!existentes.some((fila) => Number(fila.id) === idProveedor)) {
        throw new ErrorAplicacion(
          "El proveedor no fue encontrado.",
          404,
          "PROVEEDOR_NO_ENCONTRADO",
        );
      }
    }
    await this.cacheProductos?.invalidar();
    return this.proveedores(productoId);
  }

  async quitarProveedor(id, proveedorId) {
    const productoId = this.#id(id);
    const idProveedor = this.#id(proveedorId, "proveedor");
    if (!(await this.modelo.quitarProveedor(productoId, idProveedor))) {
      throw new ErrorAplicacion(
        "La asociación no fue encontrada.",
        404,
        "ASOCIACION_NO_ENCONTRADA",
      );
    }
    await this.cacheProductos?.invalidar();
  }

  #id(valor, entidad = "producto") {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0)
      throw new ErrorAplicacion(
        `El ID de ${entidad} no es válido.`,
        400,
        `ID_${entidad.toUpperCase()}_INVALIDO`,
      );
    return id;
  }
  #noEncontrado() {
    throw new ErrorAplicacion(
      "El producto no fue encontrado.",
      404,
      "PRODUCTO_NO_ENCONTRADO",
    );
  }
  #traducirDuplicado(error) {
    // Evita exponer al frontend los mensajes internos de índices de MySQL.
    if (error?.code === "ER_DUP_ENTRY")
      throw new ErrorAplicacion(
        "Ya existe un producto con ese código.",
        409,
        "CODIGO_PRODUCTO_EXISTENTE",
      );
  }
}
