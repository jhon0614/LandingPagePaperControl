// Controlador HTTP para los reportes consumidos por el dashboard.
export class ControladorReporte {
  constructor(servicio) {
    this.servicio = servicio;
  }
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
