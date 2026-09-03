import { rateLimit } from "express-rate-limit";
import { ErrorAplicacion } from "../errors/app-error.js";

export function crearLimite(limit, windowMs) {
  return rateLimit({
    limit, windowMs, standardHeaders: "draft-8", legacyHeaders: false,
    handler: (_req, _res, next) => next(new ErrorAplicacion(
      "Has realizado demasiadas solicitudes. Intenta nuevamente más tarde.",
      429, "DEMASIADAS_SOLICITUDES",
    )),
  });
}

// CORS no bloquea por sí solo la ejecución de peticiones con cookies.
export function validarOrigen(origenPermitido) {
  return (req, _res, next) => {
    const origen = req.get("origin");
    if ((origen && origen !== origenPermitido) ||
        (!origen && req.get("sec-fetch-site") === "cross-site" &&
          !["GET", "HEAD", "OPTIONS"].includes(req.method))) {
      return next(new ErrorAplicacion("Origen no permitido.", 403, "ORIGEN_NO_PERMITIDO"));
    }
    return next();
  };
}

export function validarConsultaSimple(req, _res, next) {
  if (Object.values(req.query).some((valor) => typeof valor !== "string"))
    return next(new ErrorAplicacion("No se admiten parámetros repetidos o estructurados.", 400, "ERROR_VALIDACION"));
  return next();
}
