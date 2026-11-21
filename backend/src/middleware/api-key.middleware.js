import { createHash, timingSafeEqual } from "node:crypto";
import { ErrorAplicacion } from "../errors/app-error.js";

// Filtro de identificacion del cliente. Una clave incluida en React es publica.
export function validarApiKey(clave) {
  if (!clave) return (_req, _res, next) => next();
  const esperada = createHash("sha256").update(clave).digest();
  return (req, _res, next) => {
    // Permite la sonda del hosting sin acceso a datos del negocio.
    if (req.method === "GET" && req.path === "/health") return next();
    const recibida = req.get("x-api-key");
    if (typeof recibida !== "string" ||
        !timingSafeEqual(esperada, createHash("sha256").update(recibida).digest())) {
      return next(new ErrorAplicacion("API key ausente o inválida.", 403, "API_KEY_INVALIDA"));
    }
    return next();
  };
}
