import { ErrorAplicacion } from "../errors/app-error.js";

// Comprueba el cuerpo de una petición antes de enviarlo al controlador.
export function validar(esquema) {
  return (solicitud, _respuesta, siguiente) => {
    const resultado = esquema.safeParse(solicitud.body);
    if (!resultado.success) {
      // Devuelve todos los problemas de validación en una respuesta uniforme.
      return siguiente(
        new ErrorAplicacion("Los datos enviados no son válidos.", 400, "ERROR_VALIDACION", resultado.error.flatten()),
      );
    }
    // Conserva únicamente los campos que fueron aceptados por el esquema.
    solicitud.body = resultado.data;
    return siguiente();
  };
}
