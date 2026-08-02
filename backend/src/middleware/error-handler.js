import { ErrorAplicacion } from "../errors/app-error.js";

// Se ejecuta cuando ninguna ruta coincide con la solicitud recibida.
export function manejarNoEncontrado(solicitud, _respuesta, siguiente) {
  siguiente(new ErrorAplicacion(`Ruta no encontrada: ${solicitud.method} ${solicitud.originalUrl}`, 404, "NO_ENCONTRADO"));
}

// Convierte todos los errores de la API en respuestas JSON con el mismo formato.
export function manejarError(error, _solicitud, respuesta, _siguiente) { //_solicitud y _siguiente no se usan pero son requeridos por Express.
  const esControlado = error instanceof ErrorAplicacion;
  const estadoHttp = esControlado ? error.estadoHttp : 500;

  if (!esControlado) {
    // Los detalles inesperados se muestran solo en la consola del servidor.
    console.error(error);
  }

  respuesta.status(estadoHttp).json({
    exito: false,
    error: {
      codigo: esControlado ? error.codigo : "ERROR_INTERNO",
      mensaje: esControlado ? error.message : "Ocurrió un error interno.",
      ...(esControlado && error.detalles ? { detalles: error.detalles } : {}),
    },
  });
}
