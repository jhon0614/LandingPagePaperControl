// Lee una cookie concreta sin exponer el token en el cuerpo de la petición.
function obtenerCookie(solicitud, nombre) {
  const encabezadoCookies = solicitud.get("cookie");
  if (!encabezadoCookies) return undefined;

  for (const parte of encabezadoCookies.split(";")) {
    const posicionIgual = parte.indexOf("=");
    if (posicionIgual < 0) continue;

    const nombreCookie = parte.slice(0, posicionIgual).trim();
    if (nombreCookie !== nombre) continue;

    const valorCookie = parte.slice(posicionIgual + 1).trim();
    try {
      return decodeURIComponent(valorCookie);
    } catch {
      return valorCookie;
    }
  }

  return undefined;
}

// Recibe las peticiones de autenticación y transforma los resultados del
// servicio en respuestas que puede consumir el frontend.
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
      this.#guardarCookieRenovacion(respuesta, resultado);

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

  renovarSesion = async (solicitud, respuesta, siguiente) => {
    try {
      const resultado = await this.servicioAutenticacion.renovarSesion(
        obtenerCookie(solicitud, "tokenRenovacion"), //valida la cookie tokenRenovación
      );

      this.#guardarCookieRenovacion(respuesta, resultado); //devuelve un token de acceso y datos del usuario
      respuesta.status(200).json({
        exito: true,
        datos: {
          tokenAcceso: resultado.tokenAcceso,
          usuario: resultado.usuario,
        },
      });
    } catch (error) {
      // Una cookie inválida también se elimina para no repetir el mismo error.
      this.#eliminarCookieRenovacion(respuesta);
      siguiente(error);
    }
  };

  cerrarSesion = async (solicitud, respuesta, siguiente) => {
    try {
      await this.servicioAutenticacion.cerrarSesion(
        obtenerCookie(solicitud, "tokenRenovacion"), // lee la cookie tokenRenovación
      );
      this.#eliminarCookieRenovacion(respuesta); //invalida el token
      respuesta.status(204).send();
    } catch (error) {
      siguiente(error);
    }
  };

  #opcionesCookie() {
    return {
      httpOnly: true, //no accesible desde JS
      secure: this.configuracion.entorno === "production", //solo se envía en conexiones HTTPS
      sameSite: "strict", //no se envía en solicitudes cross-site
      path: "/api/auth", //ruta donde se encuentra el endpoint de autenticación
    };
  }

  #guardarCookieRenovacion(respuesta, resultado) {
    //almacena el token de renovación en una cookie
    const opciones = this.#opcionesCookie();
    if (resultado.esPersistente) {
      opciones.expires = resultado.expiracionTokenRenovacion;
    }

    respuesta.cookie("tokenRenovacion", resultado.tokenRenovacion, opciones);
  }

  #eliminarCookieRenovacion(respuesta) {
    //elimina la cookie de renovación
    respuesta.clearCookie("tokenRenovacion", this.#opcionesCookie());
  }
}
