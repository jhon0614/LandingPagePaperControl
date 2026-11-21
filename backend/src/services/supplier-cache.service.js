import { createClient } from "redis";
import { createHash, randomUUID } from "node:crypto";

const PREFIJO = "papercontrol:cache:proveedores:v1";

// Cache-aside: Redis es opcional y nunca sustituye a MySQL como fuente de verdad.
export class CacheProveedores {
  constructor(cliente, { ttl = 30, timeout = 500, prefijo = PREFIJO } = {}) {
    this.cliente = cliente;
    this.ttl = ttl;
    this.timeout = timeout;
    this.prefijo = prefijo;
    this.disponible = false;
  }

  async comando(operacion) {
    let temporizador;
    try {
      return await Promise.race([
        operacion(),
        new Promise((_, reject) => {
          temporizador = setTimeout(() => reject(new Error("CACHE_TIMEOUT")), this.timeout);
        }),
      ]);
    } catch (error) {
      this.disponible = false;
      if (this.cliente.isOpen) this.cliente.destroy();
      throw error;
    } finally {
      clearTimeout(temporizador);
    }
  }

  async obtenerOCargar(filtros, cargar, informar = () => {}, { refrescar = false } = {}) {
    if (refrescar) await this.invalidar();
    let clave;
    if (this.disponible && this.cliente.isReady) {
      try {
        const version = await this.comando(() => this.cliente.get(`${this.prefijo}:version`));
        if (version) {
          const hash = createHash("sha256").update(JSON.stringify(filtros)).digest("hex");
          clave = `${this.prefijo}:${version}:${hash}`;
          const valor = refrescar ? null : await this.comando(() => this.cliente.get(clave));
          if (valor !== null) {
            const lista = JSON.parse(valor);
            if (Array.isArray(lista)) { informar("HIT"); return lista; }
          }
        }
      } catch { clave = undefined; }
    }
    // Fuera del catch: los errores de MySQL deben propagarse normalmente.
    const lista = await cargar();
    if (clave && this.disponible) {
      try {
        await this.comando(() => this.cliente.set(clave, JSON.stringify(lista), { EX: this.ttl }));
        informar(refrescar ? "REFRESH" : "MISS");
        return lista;
      } catch { /* Redis no debe impedir responder los datos de MySQL. */ }
    }
    informar("BYPASS");
    return lista;
  }

  async invalidar() {
    if (!this.disponible || !this.cliente.isReady) return;
    try {
      // Versiones distintas invalidan todas las paginas/busquedas sin KEYS ni FLUSHDB.
      // Una lectura concurrente solo podra guardar en la version anterior.
      await this.comando(() => this.cliente.set(`${this.prefijo}:version`, randomUUID()));
    } catch { /* La siguiente conexion rota version y descarta la cache antigua. */ }
  }
}

export function crearCacheProveedores(configuracion) {
  if (!configuracion?.url) return undefined;
  const cliente = createClient({
    url: configuracion.url,
    disableOfflineQueue: true,
    commandsQueueMaxLength: 100,
    socket: { connectTimeout: 500, reconnectStrategy: false },
  });
  const cache = new CacheProveedores(cliente, { ttl: configuracion.ttl });
  let conectando = false;
  let cerrada = false;
  let falloInformado = false;
  cliente.on("error", () => {
    cache.disponible = false;
    if (!falloInformado) {
      console.warn("Redis no disponible: Proveedores usa MySQL.");
      falloInformado = true;
    }
  });
  async function conectar() {
    if (cerrada || conectando || cliente.isOpen) return;
    conectando = true;
    try {
      await cliente.connect();
      if (cerrada) { if (cliente.isOpen) cliente.destroy(); return; }
      // Descarta tambien entradas previas a escrituras hechas durante una caida.
      await cache.comando(() => cliente.set(`${PREFIJO}:version`, randomUUID()));
      cache.disponible = true;
      falloInformado = false;
      console.info(`Redis conectado: cache de Proveedores (${cache.ttl}s).`);
    } catch { cache.disponible = false; }
    finally { conectando = false; }
  }
  const intervalo = setInterval(() => { void conectar(); }, 5000);
  intervalo.unref();
  cache.iniciar = conectar;
  cache.cerrar = () => {
    cerrada = true;
    clearInterval(intervalo);
    cache.disponible = false;
    if (cliente.isOpen) cliente.destroy();
  };
  return cache;
}
