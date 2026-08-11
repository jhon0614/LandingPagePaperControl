import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";

// Define los campos y límites aceptados por el formulario de inicio de sesión.
const esquemaInicioSesion = z.object({
  correo: z.string().trim().email().max(191), //correo de string, sin espacio, formato email y maximo 191 caracteres
  contrasena: z.string().min(1).max(200), // contraseña de string, minimo 1 caracter y maximo 200 caracteres
  recordarme: z.boolean().optional().default(false),
});

// Relaciona la dirección /login con su validación y controlador.
export function crearRutasAutenticacion(controladorAutenticacion) {
  const rutas = Router(); //enrutador vacio
  rutas.post("/login", validar(esquemaInicioSesion), controladorAutenticacion.iniciarSesion);
  rutas.post("/refresh", controladorAutenticacion.renovarSesion);
  rutas.post("/logout", controladorAutenticacion.cerrarSesion);
  return rutas;
}
