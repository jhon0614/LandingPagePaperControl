// Recibe las solicitudes relacionadas con contraseñas y entrega sus datos al
// servicio. Las reglas de seguridad permanecen en ServicioContrasena.
export class ControladorContrasena {
  constructor(servicioContrasena) {
    // El controlador recibe el servicio que contiene la lógica de seguridad.
    this.servicioContrasena = servicioContrasena;
  }

  cambiarContrasena = async (solicitud, respuesta, siguiente) => {
    try {
      // El ID del usuario se obtiene del token JWT validado previamente.
      // El servicio se encarga de verificar la contraseña actual y aplicar la nueva.
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
      // Acción pública: el usuario no necesita estar autenticado.
      // El servicio genera un token y envía un correo con el enlace de restablecimiento.
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
      // El token proviene del enlace enviado al correo.
      // El servicio valida el token y aplica la nueva contraseña.
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
      // Usado por un administrador para forzar el restablecimiento de otro usuario.
      // Se registra el responsable y la IP para auditoría.
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
      // Acción administrativa: desbloquea la cuenta de un usuario.
      // La ruta ya validó que el responsable tiene permisos.
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
