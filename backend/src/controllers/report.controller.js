// Controlador HTTP para los reportes consumidos por el dashboard.
export class ControladorReporte {
  constructor(servicio) {
    this.servicio = servicio;
  }
  caja = async (requerimiento, respuesta, siguiente) => {
    try {
      const reporte = await this.servicio.caja(requerimiento.query);
      return respuesta.json({ exito: true, datos: { reporte } });
    } catch (error) {
      return siguiente(error);
    }
  };
  productosMasVendidos = async (requerimiento, respuesta, siguiente) => {
    try {
      const productos = await this.servicio.productosMasVendidos(
        requerimiento.query,
      );
      return respuesta.json({ exito: true, datos: { productos } });
    } catch (error) {
      return siguiente(error);
    }
  };
}
