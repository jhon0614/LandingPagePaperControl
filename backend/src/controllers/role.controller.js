// Recibe las solicitudes HTTP relacionadas con los roles.
export class ControladorRol {
  constructor(servicioRol) {
    this.servicioRol = servicioRol;
  }

  listar = async (_solicitud, respuesta, siguiente) => {
    try {
      // solicitar los roles al servicio.
      const roles = await this.servicioRol.listar();
      // responder con estado 200 y el arreglo de roles.
      return respuesta.status(200).json({
        exito: true,
        datos: {
          roles,
        },
      });
    } catch (error) {
      // enviar el error al manejador general.
      return siguiente(error);
    }
  };
}
