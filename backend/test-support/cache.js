import { CacheListado } from "../src/services/list-cache.service.js";

// Redis en memoria con vencimiento controlado, sin esperas ni conexión externa.
export function crearCachePrueba(prefijo, opciones = {}, ClaseCache = CacheListado) {
  let ahora = 0;
  const datos = new Map([[`${prefijo}:version`, "1"]]);
  const vencimientos = new Map();
  const cliente = {
    isReady: true,
    isOpen: true,
    async get(clave) {
      if ((vencimientos.get(clave) ?? Infinity) <= ahora) {
        datos.delete(clave);
        vencimientos.delete(clave);
      }
      return datos.get(clave) ?? null;
    },
    async set(clave, valor, config) {
      datos.set(clave, valor);
      vencimientos.set(clave, config?.EX ? ahora + config.EX * 1000 : Infinity);
    },
    destroy() { this.isReady = this.isOpen = false; },
  };
  const cache = new ClaseCache(cliente, { ...opciones, prefijo });
  cache.disponible = true;
  return { cache, cliente, datos, avanzar: (ms) => { ahora += ms; } };
}
