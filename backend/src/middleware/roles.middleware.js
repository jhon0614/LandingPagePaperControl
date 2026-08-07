import { ErrorAplicacion } from "../errors/app-error.js";

export function permitirRoles(...rolesPermitidos) {
  return function autorizarRol(solicitud, _respuesta, siguiente) {
    try {
      // 1. Obtener el usuario que dejó el middleware de autenticación.
      const usuario = solicitud.usuario;

      // comprobar que solicitud.usuario exista.
      // Si no existe, responder con un error 401.
      // Esto indicaría que no pasó primero por el middleware de autenticación.
      if (!usuario)
        throw new ErrorAplicacion(
          "No se ha encontrado el usuario",
          401,
          "USUARIO_NO_AUTENTICADO",
        );

      // comprobar que el usuario tenga un rol.
      if (!usuario.rol) {
        throw new ErrorAplicacion(
          "No se ha encontrado el rol del usuario",
          401,
          "USUARIO_NO_AUTENTICADO",
        );
      }

      // 2. Comprobar si el rol está dentro de rolesPermitidos.
      const tienePermiso = rolesPermitidos.includes(usuario.rol); // valida que si tenga un rol permitido

      if (!tienePermiso) {
        throw new ErrorAplicacion(
          "No tienes permiso para realizar esta acción.",
          403,
          "ACCESO_DENEGADO",
        );
      }

      // 3. Permitir que la solicitud llegue al controlador.
      return siguiente();
    } catch (error) {
      // 4. Enviar el error al manejador general.

      return siguiente(error);
    }
  };
}
