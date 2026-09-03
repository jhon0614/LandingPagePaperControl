import { Router } from "express";
import { crearLimite } from "../middleware/security.js";
import { z } from "zod";
import { validar } from "../middleware/validate.js";

// Estas reglas se comparten entre el cambio y el restablecimiento para que
// ambas entradas exijan el mismo nivel mínimo de contraseña.
const esquemaContrasenaSegura = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres.")
  .max(200, "La contraseña no puede superar 200 caracteres.")
  .regex(/[A-Z]/, "Debe contener una letra mayúscula.")
  .regex(/[a-z]/, "Debe contener una letra minúscula.")
  .regex(/[0-9]/, "Debe contener un número.")
  .refine((valor) => Buffer.byteLength(valor, "utf8") <= 72, "La contraseña no puede superar 72 bytes UTF-8.");

const esquemaInicioSesion = z.object({
  correo: z.string().trim().email().max(191),
  contrasena: z.string().min(1).max(200),
  recordarme: z.boolean().optional().default(false),
});

// Además de las reglas individuales, impide enviar el mismo texto en ambos campos.
const esquemaCambiarContrasena = z
  .object({
    contrasenaActual: z.string().min(1).max(200),
    contrasenaNueva: esquemaContrasenaSegura,
  })
  .refine((datos) => datos.contrasenaActual !== datos.contrasenaNueva, {
    message: "La nueva contraseña debe ser diferente de la actual.",
    path: ["contrasenaNueva"],
  });

const esquemaSolicitarRestablecimiento = z.object({
  correo: z.string().trim().email().max(191),
});

const esquemaRestablecerContrasena = z.object({
  token: z.string().trim().min(20).max(200),
  contrasenaNueva: esquemaContrasenaSegura,
});

export function crearRutasAutenticacion({
  controladorAutenticacion,
  controladorContrasena,
  autenticar,
}) {
  // Las rutas públicas validan sus datos, pero no requieren un token de acceso.
  // Cambiar la contraseña sí exige conocer la sesión y la contraseña actual.
  const rutas = Router();
  const limitarRecuperacion = crearLimite(5, 15 * 60 * 1000);
  const limitarLogin = crearLimite(20, 15 * 60 * 1000);
  const limitarRenovacion = crearLimite(60, 15 * 60 * 1000);
  const limitarCambio = crearLimite(5, 15 * 60 * 1000);

  rutas.post(
    "/login",
    limitarLogin,
    validar(esquemaInicioSesion),
    controladorAutenticacion.iniciarSesion,
  );
  rutas.post("/refresh", limitarRenovacion, controladorAutenticacion.renovarSesion);
  rutas.post("/logout", controladorAutenticacion.cerrarSesion);
  rutas.patch(
    "/contrasena",
    limitarCambio,
    autenticar,
    validar(esquemaCambiarContrasena),
    controladorContrasena.cambiarContrasena,
  );
  rutas.post(
    "/olvide-contrasena",
    limitarRecuperacion,
    validar(esquemaSolicitarRestablecimiento),
    controladorContrasena.solicitarRestablecimiento,
  );
  rutas.post(
    "/restablecer-contrasena",
    limitarRecuperacion,
    validar(esquemaRestablecerContrasena),
    controladorContrasena.restablecerContrasena,
  );

  return rutas;
}
