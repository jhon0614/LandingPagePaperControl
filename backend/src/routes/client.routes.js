import { Router } from "express";
import { z } from "zod";
import { permitirRoles } from "../middleware/roles.middleware.js";
import { validar } from "../middleware/validate.js";

const esquemaRegistrarCliente = z.object({
  tipoDocumento: z.enum(["CC", "CE", "NIT", "PASAPORTE"]).default("CC"),
  documento: z.string().trim().min(6).max(30).regex(/^\d+$/),
  nombres: z.string().trim().min(1).max(80),
  apellidos: z.string().trim().max(80).optional(),
  correo: z.string().trim().email().max(191).optional(),
  telefono: z.string().trim().min(7).max(30).optional(),
  direccion: z.string().trim().max(255).optional(),
});

// PATCH permite enviar únicamente los campos que se necesitan corregir; el
// refine evita aceptar una solicitud sin ningún dato para actualizar.
const esquemaActualizarCliente = z
  .object({
    tipoDocumento: z.enum(["CC", "CE", "NIT", "PASAPORTE"]).optional(),
    documento: z.string().trim().min(6).max(30).regex(/^\d+$/).optional(),
    nombres: z.string().trim().min(1).max(80).optional(),
    apellidos: z.string().trim().max(80).optional(),
    correo: z
      .union([z.string().trim().email().max(191), z.literal("")])
      .optional(),
    telefono: z
      .union([z.string().trim().min(7).max(30), z.literal("")])
      .optional(),
    direccion: z.string().trim().max(255).optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Debes enviar al menos un campo para actualizar.",
  });

const esquemaCambiarEstadoCliente = z.object({
  estaActivo: z.boolean(),
});

export function crearRutasClientes({ autenticar, controladorCliente }) {
  const router = Router();

  router.post(
    "/",
    autenticar,
    permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO"),
    validar(esquemaRegistrarCliente),
    controladorCliente.crear,
  );

  router.patch(
    "/:id/estado",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    validar(esquemaCambiarEstadoCliente),
    controladorCliente.cambiarEstado,
  );

  router.get(
    "/",
    autenticar,
    permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO"),
    controladorCliente.buscar,
  );

  router.patch(
    "/:id",
    autenticar,
    // La actualización está disponible para los dos perfiles administrativos.
    permitirRoles("ADMINISTRADOR", "DUENO"),
    validar(esquemaActualizarCliente),
    controladorCliente.actualizar,
  );

  router.get(
    "/:id",
    autenticar,
    permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO"),
    controladorCliente.buscarPorId,
  );

  router.delete(
    "/:id",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controladorCliente.eliminar,
  );

  return router;
}
