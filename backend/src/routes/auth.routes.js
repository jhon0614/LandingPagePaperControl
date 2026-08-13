import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { ErrorAplicacion } from "../errors/app-error.js";
import { validar } from "../middleware/validate.js";

// Estas reglas se comparten entre el cambio y el restablecimiento para que
// ambas entradas exijan el mismo nivel mínimo de contraseña.
const esquemaContrasenaSegura = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres.")
  .max(200, "La contraseña no puede superar 200 caracteres.")
  .regex(/[A-Z]/, "Debe contener una letra mayúscula.")
  .regex(/[a-z]/, "Debe contener una letra minúscula.")
  .regex(/[0-9]/, "Debe contener un número.");

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

// Reduce el envío abusivo de correos y los intentos repetidos con tokens.
const limitarRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_solicitud, _respuesta, siguiente) => {
    siguiente(
      new ErrorAplicacion(
        "Has realizado demasiadas solicitudes. Intenta nuevamente más tarde.",
        429,
        "DEMASIADAS_SOLICITUDES",
      ),
    );
  },
});

export function crearRutasAutenticacion({
  controladorAutenticacion,
  controladorContrasena,
  autenticar,
}) {
  // Las rutas públicas validan sus datos, pero no requieren un token de acceso.
  // Cambiar la contraseña sí exige conocer la sesión y la contraseña actual.
  const rutas = Router();

  rutas.post(
    "/login",
    validar(esquemaInicioSesion),
    controladorAutenticacion.iniciarSesion,
  );
  rutas.post("/refresh", controladorAutenticacion.renovarSesion);
  rutas.post("/logout", controladorAutenticacion.cerrarSesion);
  rutas.patch(
    "/contrasena",
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
