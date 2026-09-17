import { Router } from "express";
import { permitirRoles } from "../middleware/roles.middleware.js";

export function crearRutasDashboard({ autenticar, controlador }) {
  const router = Router();

  router.get(
    "/resumen",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controlador.resumen,
  );

  return router;
}
