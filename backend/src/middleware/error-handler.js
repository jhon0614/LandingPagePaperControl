import { ErrorAplicacion } from "../errors/app-error.js";

// Se ejecuta cuando ninguna ruta coincide con la solicitud recibida.
export function manejarNoEncontrado(solicitud, _respuesta, siguiente) {
  siguiente(
    new ErrorAplicacion(
      `Ruta no encontrada: ${solicitud.method} ${solicitud.originalUrl}`,
      404,
      "NO_ENCONTRADO",
    ),
  );
}

// Convierte todos los errores de la API en respuestas JSON con el mismo formato.
export function manejarError(error, _solicitud, respuesta, _siguiente) {
  //_solicitud y _siguiente no se usan pero son requeridos por Express.
  if (error.type === "entity.parse.failed")
    error = new ErrorAplicacion(
      "El cuerpo no contiene JSON válido.",
      400,
      "JSON_INVALIDO",
    );
  if (error.type === "entity.too.large")
    error = new ErrorAplicacion(
      "La solicitud supera el tamaño permitido.",
      413,
      "CUERPO_DEMASIADO_GRANDE",
    );
  if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(error.code))
    error = new ErrorAplicacion(
      "Otra operación modificó estos datos. Reintenta la solicitud.",
      409,
      "CONFLICTO_CONCURRENCIA",
    );
  if (error.code === "ER_DUP_ENTRY")
    error = new ErrorAplicacion(
      "Ya existe un registro con esos datos únicos.",
      409,
      "REGISTRO_DUPLICADO",
    );
  if (
    [
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ER_CON_COUNT_ERROR",
      "ER_QUERY_TIMEOUT",
    ].includes(error.code) ||
    error.message === "Queue limit reached."
  ) {
    respuesta.set("Retry-After", "2");
    error = new ErrorAplicacion(
      "El servicio está ocupado o temporalmente no disponible.",
      503,
      "SERVICIO_NO_DISPONIBLE",
    );
  }
  const esControlado = error instanceof ErrorAplicacion;
  const estadoHttp = esControlado ? error.estadoHttp : 500;

  if (!esControlado) {
    // Evita volcar SQL, valores de parámetros, hashes o credenciales en los logs.
    console.error({
      tipo: error.name,
      codigo: error.code ?? "ERROR_INTERNO",
      origen: error.stack?.split("\n").slice(1, 4).join("\n"),
    });
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
