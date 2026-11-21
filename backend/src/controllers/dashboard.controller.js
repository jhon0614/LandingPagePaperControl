export class ControladorDashboard {
  constructor(servicio) {
    this.servicio = servicio;
  }

  resumen = async (_requerimiento, respuesta, siguiente) => {
    try {
      const resumen = await this.servicio.resumen(_requerimiento.query, (estado) => respuesta.set("X-Cache", estado));
      return respuesta.status(200).json({ exito: true, datos: { resumen } });
    } catch (error) {
      return siguiente(error);
    }
  };
}
