import { Router } from "express";
import { permitirRoles } from "../middleware/roles.middleware.js";
export function crearRutasReportes({ autenticar, controlador }) {
  const router = Router();
  // El ranking global contiene información de todas las ventas y se reserva a
  // los perfiles administrativos.
  router.get(
    "/productos-mas-vendidos",
    autenticar,
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controlador.productosMasVendidos,
  );
  return router;
}
