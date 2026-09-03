import { Router } from "express";
import { permitirRoles } from "../middleware/roles.middleware.js";
import { z } from "zod";
import { validar } from "../middleware/validate.js";

const esquemaCrearUsuario = z.object({
  nombres: z.string().trim().min(1).max(80),
  apellidos: z.string().trim().min(1).max(80),
  correo: z.string().trim().email().max(191),
  contrasenaTemporal: z
    .string()
    .min(12)
    .max(200)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .refine((valor) => Buffer.byteLength(valor, "utf8") <= 72, "La contraseña no puede superar 72 bytes UTF-8."),
  rolId: z.number().int().positive(),
});

const esquemaActualizarUsuario = z
  .object({
    nombres: z.string().trim().min(1).max(80).optional(),
    apellidos: z.string().trim().min(1).max(80).optional(),
    correo: z.string().trim().email().max(191).optional(),
    rolId: z.number().int().positive().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Debes enviar al menos un campo para actualizar.",
  });

const esquemaCambiarEstadoUsuario = z.object({
  estaActivo: z.boolean(),
});

// Agrupa las rutas administrativas de usuarios. Todas comprueban primero la
// sesión y luego permiten únicamente a ADMINISTRADOR o DUENO.
export function crearRutasUsuarios({
  autenticar,
  controladorUsuario,
  controladorContrasena,
}) {
  const router = Router();

  router.get(
    "/",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controladorUsuario.listar,
  );

  router.post(
    "/",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    validar(esquemaCrearUsuario),
    controladorUsuario.crear,
  );

  router.patch(
    "/:id/estado",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    validar(esquemaCambiarEstadoUsuario),
    controladorUsuario.cambiarEstado,
  );

  router.patch(
    "/:id/desbloqueo",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controladorContrasena.desbloquearUsuario,
  );

  // El responsable solo solicita el envío; la nueva contraseña la elige el usuario.
  router.post(
    "/:id/restablecimiento-contrasena",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controladorContrasena.solicitarRestablecimientoAdministrativo,
  );

  router.patch(
    "/:id",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    validar(esquemaActualizarUsuario),
    controladorUsuario.actualizar,
  );

  router.get(
    "/:id",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controladorUsuario.buscarPorId,
  );

  router.delete(
    "/:id",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controladorUsuario.eliminar,
  );

  return router;
}
