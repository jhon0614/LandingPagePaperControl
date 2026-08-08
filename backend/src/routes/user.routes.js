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
    .regex(/[0-9]/),
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

export function crearRutasUsuarios({ autenticar, controladorUsuario }) {
  const router = Router();

  router.get(
    "/",
    autenticar,
    permitirRoles("ADMINISTRADOR"),
    controladorUsuario.listar,
  );

  router.post(
    "/",
    autenticar,
    permitirRoles("ADMINISTRADOR"),
    validar(esquemaCrearUsuario),
    controladorUsuario.crear,
  );

  router.patch(
    "/:id/estado",
    autenticar,
    permitirRoles("ADMINISTRADOR"),
    validar(esquemaCambiarEstadoUsuario),
    controladorUsuario.cambiarEstado,
  );

  router.patch(
    "/:id",
    autenticar,
    permitirRoles("ADMINISTRADOR"),
    validar(esquemaActualizarUsuario),
    controladorUsuario.actualizar,
  );

  router.get(
    "/:id",
    autenticar,
    permitirRoles("ADMINISTRADOR"),
    controladorUsuario.buscarPorId,
  );

  router.delete(
    "/:id",
    autenticar,
    permitirRoles("ADMINISTRADOR"),
    controladorUsuario.eliminar,
  );

  return router;
}
