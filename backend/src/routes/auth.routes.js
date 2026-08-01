import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";

// Define los campos y límites aceptados por el formulario de inicio de sesión.
const esquemaInicioSesion = z.object({
  correo: z.string().trim().email().max(191),
  contrasena: z.string().min(1).max(200),
});

// Relaciona la dirección /login con su validación y controlador.
export function crearRutasAutenticacion(controladorAutenticacion) {
  const rutas = Router();
  rutas.post("/login", validar(esquemaInicioSesion), controladorAutenticacion.iniciarSesion);
  return rutas;
}
