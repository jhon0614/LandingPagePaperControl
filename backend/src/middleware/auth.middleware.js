import jwt from "jsonwebtoken";
import { ErrorAplicacion } from "../errors/app-error.js";

export function crearMiddlewareAutenticacion({ modeloUsuario, secretoAcceso }) {
  return async function autenticar(solicitud, _respuesta, siguiente) {
    try {
      // 1. Obtener el encabezado Authorization.
      const encabezadoAutorizacion = solicitud.get("authorization");

      if (!encabezadoAutorizacion) {
        throw new ErrorAplicacion(
          "Debes iniciar sesión.",
          401,
          "NO_AUTENTICADO",
        );
      }

      // 2. Separar "Bearer" del token.
      const partes = encabezadoAutorizacion.trim().split(/\s+/);
      if (partes.length !== 2) {
        throw new ErrorAplicacion(
          "El encabezado de autorización debe tener exactamente dos partes.",
          401,
          "TOKEN_MAL_FORMADO",
        );
      }

      const [tipo, token] = partes;

      if (tipo !== "Bearer") {
        throw new ErrorAplicacion(
          "El token tiene un formato incorrecto.",
          401,
          "TOKEN_MAL_FORMADO",
        );
      }

      if (!token) {
        throw new ErrorAplicacion(
          "El token no es válido.",
          401,
          "TOKEN_INVALIDO",
        );
      }

      // 3. Validar y decodificar el token.
      const contenidoToken = jwt.verify(token, secretoAcceso);

      // obtener el ID desde contenidoToken.sub.
      const id = Number(contenidoToken.sub);

      // comprobar que sea un número entero mayor que cero.
      if (!Number.isInteger(id) || id <= 0) {
        throw new ErrorAplicacion(
          "ID inválido.",
          401,
          "TOKEN_INVALIDO",
        );
      }

      // 4. Consultar el usuario actual en MySQL.
      const usuario = await modeloUsuario.buscarPorId(id);

      if (!usuario) {
        throw new ErrorAplicacion(
          "El usuario no se encuentra disponible.",
          401,
          "USUARIO_NO_DISPONIBLE",
        );
      }

      if (!usuario.esta_activo) {
        throw new ErrorAplicacion(
          "El usuario no se encuentra disponible.",
          401,
          "USUARIO_NO_DISPONIBLE",
        );
      }

      // 5. Guardar únicamente información segura.
      solicitud.usuario = {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        debeCambiarContrasena: Boolean(usuario.debe_cambiar_contrasena),
      };

      // Una cuenta creada con contraseña temporal solo puede cambiarla antes
      // de utilizar los demás módulos protegidos.
      if (
        solicitud.usuario.debeCambiarContrasena &&
        solicitud.originalUrl?.split("?")[0] !== "/api/auth/contrasena"
      ) {
        throw new ErrorAplicacion(
          "Debes cambiar la contraseña temporal antes de continuar.",
          403,
          "CAMBIO_CONTRASENA_REQUERIDO",
        );
      }

      // 6. Permitir que continúe la solicitud.
      return siguiente();
    } catch (error) {
      // Diferenciar errores de JWT
      if (error.name === "TokenExpiredError") {
        return siguiente(
          new ErrorAplicacion("El token ha expirado.", 401, "TOKEN_EXPIRADO"),
        );
      }

      
      if (error.name === "NotBeforeError") {
        return siguiente(
          new ErrorAplicacion(
            "El token aún no es válido.",
            401,
            "TOKEN_NO_VALIDO",
          ),
        );
      }
      
      if (error.name === "JsonWebTokenError") {
        return siguiente(
          new ErrorAplicacion("El token es inválido.", 401, "TOKEN_INVALIDO"),
        );
      }

      // Si ya es un ErrorAplicacion, lo pasamos tal cual
      if (error instanceof ErrorAplicacion) {
        return siguiente(error);
      }

      // Cualquier otro error inesperado
      return siguiente(error);
    }
  };
}
