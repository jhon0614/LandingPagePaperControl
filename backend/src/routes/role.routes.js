import { Router } from "express";
import { permitirRoles } from "../middleware/roles.middleware.js";

export function crearRutasRoles({ controladorRol, autenticar }) {
  const router = Router();

  // Los roles se consultan para administrar usuarios, no para el registro público.
  router.get(
    "/",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controladorRol.listar,
  );

  return router;
}
