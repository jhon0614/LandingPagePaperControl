import { ErrorAplicacion } from "../errors/app-error.js";

// Presenta los COUNT de MySQL como números JSON, aunque el driver los entregue
// como texto o bigint según la configuración de la conexión.
export class ServicioDashboard {
  constructor(modelo, cache) {
    this.modelo = modelo;
    this.cache = cache;
  }

  async resumen(filtros = {}, informarCache = () => {}) {
    if (filtros.refrescar !== undefined && !["true", "false"].includes(filtros.refrescar))
      throw new ErrorAplicacion("refrescar debe ser true o false.", 400, "REFRESCAR_INVALIDO");
    const cargar = async () => {
      const fila = await this.modelo.resumen();
      return {
        productos: Number(fila?.productos ?? 0),
        ventas: Number(fila?.ventas ?? 0),
        usuarios: Number(fila?.usuarios ?? 0),
        stockBajo: Number(fila?.stock_bajo ?? 0),
      };
    };
    if (!this.cache) { informarCache("BYPASS"); return cargar(); }
    // El almacen compartido conserva arreglos; la API sigue entregando un objeto.
    const filas = await this.cache.obtenerOCargar({}, async () => [await cargar()], informarCache,
      { refrescar: filtros.refrescar === "true" });
    return filas[0];
  }
}
