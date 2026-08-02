// Recibe la petición HTTP del login y transforma el resultado del servicio en
// una respuesta que puede consumir el frontend.
export class ControladorAutenticacion {
  constructor(servicioAutenticacion, configuracion) {
    this.servicioAutenticacion = servicioAutenticacion;
    this.configuracion = configuracion;
  }

  iniciarSesion = async (solicitud, respuesta, siguiente) => {
    try {
      const resultado = await this.servicioAutenticacion.iniciarSesion({
        ...solicitud.body, // extrae los datos del cuerpo de la petición
        direccionIp: solicitud.ip, // extrae la IP del cliente desde donde está accediendo
        agenteUsuario: solicitud.get("user-agent"), // extrae el agente de usuario del navegador
      });

      // La cookie HttpOnly no puede ser leída directamente desde JavaScript.
      respuesta.cookie("tokenRenovacion", resultado.tokenRenovacion, {
        httpOnly: true,
        secure: this.configuracion.entorno === "production",
        sameSite: "strict",
        expires: resultado.expiracionTokenRenovacion,
        path: "/api/auth",
      });

      // El frontend sí recibe el token de acceso y los datos básicos del usuario.
      respuesta.status(200).json({
        exito: true,
        datos: {
          tokenAcceso: resultado.tokenAcceso,
          usuario: resultado.usuario,
        },
      });
    } catch (error) {
      // Los errores pasan al manejador general para conservar el mismo formato.
      siguiente(error);
    }
  };
}
