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
    permitirRoles("ADMINISTRADOR"),
    validar(esquemaCambiarEstadoCliente),
    controladorCliente.cambiarEstado,
  );

  router.get(
    "/",
    autenticar,
    permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO"),
    controladorCliente.buscar,
  );

  return router;
}
