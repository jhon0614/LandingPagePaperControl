import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";
import { crearLimite } from "../middleware/security.js";
import { ErrorAplicacion } from "../errors/app-error.js";

const nombre = z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/);
const esquema = z.object({
  nombre,
  apellido: nombre,
  email: z.string().trim().email().max(191),
  mensaje: z.string().trim().min(1).max(5000),
});

export function crearRutasContacto({ servicioCorreo, limitar = crearLimite }) {
  const rutas = Router();
  rutas.post("/", limitar(5, 15 * 60 * 1000), validar(esquema), async (req, res) => {
    try {
      await servicioCorreo.enviarContacto(req.body);
    } catch (error) {
      console.error("Fallo enviando solicitud de contacto", { codigo: error.code ?? "ERROR_CORREO" });
      throw new ErrorAplicacion(
        "No fue posible enviar la solicitud. Inténtalo nuevamente en unos momentos.",
        503,
        "CONTACTO_NO_DISPONIBLE",
      );
    }
    res.status(200).json({ exito: true, datos: { mensaje: "Solicitud enviada." } });
  });
  return rutas;
}
