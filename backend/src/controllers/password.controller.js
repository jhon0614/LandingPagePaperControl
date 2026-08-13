// Recibe las solicitudes relacionadas con contraseñas y entrega sus datos al
// servicio. Las reglas de seguridad permanecen en ServicioContrasena.
export class ControladorContrasena {
  constructor(servicioContrasena) {
    this.servicioContrasena = servicioContrasena;
  }

  cambiarContrasena = async (solicitud, respuesta, siguiente) => {
    try {
      // El ID proviene del token validado, no del cuerpo enviado por el cliente.
      const resultado = await this.servicioContrasena.cambiarContrasena({
        usuarioId: solicitud.usuario.id,
        contrasenaActual: solicitud.body.contrasenaActual,
        contrasenaNueva: solicitud.body.contrasenaNueva,
      });

      return respuesta.status(200).json({
        exito: true,
        datos: resultado,
      });
    } catch (error) {
      return siguiente(error);
    }
  };

  solicitarRestablecimiento = async (solicitud, respuesta, siguiente) => {
    try {
      // Esta acción es pública porque se usa cuando la persona no puede ingresar.
      const resultado = await this.servicioContrasena.solicitarRestablecimiento(
        {
          correo: solicitud.body.correo,
        },
      );

      return respuesta.status(200).json({
        exito: true,
        datos: resultado,
      });
    } catch (error) {
      return siguiente(error);
    }
  };

  restablecerContrasena = async (solicitud, respuesta, siguiente) => {
    try {
      // El token llega desde el enlace enviado al correo del usuario.
      const resultado = await this.servicioContrasena.restablecerContrasena({
        token: solicitud.body.token,
        contrasenaNueva: solicitud.body.contrasenaNueva,
      });

      return respuesta.status(200).json({
        exito: true,
        datos: resultado,
      });
    } catch (error) {
      return siguiente(error);
    }
  };

  solicitarRestablecimientoAdministrativo = async (
    solicitud,
    respuesta,
    siguiente,
  ) => {
    try {
      // solicitud.usuario identifica al administrador o dueño responsable.
      const resultado =
        await this.servicioContrasena.solicitarRestablecimientoAdministrativo({
          usuarioId: solicitud.params.id,
          responsableId: solicitud.usuario.id,
          direccionIp: solicitud.ip,
        });

      return respuesta.status(200).json({
        exito: true,
        datos: resultado,
      });
    } catch (error) {
      return siguiente(error);
    }
  };

  desbloquearUsuario = async (solicitud, respuesta, siguiente) => {
    try {
      // La ruta ya comprobó que el responsable tiene permisos administrativos.
      const resultado = await this.servicioContrasena.desbloquearUsuario({
        usuarioId: solicitud.params.id,
        responsableId: solicitud.usuario.id,
        direccionIp: solicitud.ip,
      });

      return respuesta.status(200).json({
        exito: true,
        datos: resultado,
      });
    } catch (error) {
      return siguiente(error);
    }
  };
}
