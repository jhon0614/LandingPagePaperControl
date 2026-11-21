import { CacheListado, crearCacheListado } from "./list-cache.service.js";

const PREFIJO = "papercontrol:cache:proveedores:v1";

// Conserva el contrato existente de Proveedores sobre la cache reutilizable.
export class CacheProveedores extends CacheListado {
  constructor(cliente, opciones = {}) {
    super(cliente, { prefijo: PREFIJO, ...opciones });
  }
}

export function crearCacheProveedores(configuracion) {
  return crearCacheListado(configuracion, { prefijo: PREFIJO, nombre: "Proveedores" });
}
