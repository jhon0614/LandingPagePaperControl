import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";
import { permitirRoles } from "../middleware/roles.middleware.js";

const nombre = z.object({ nombre: z.string().trim().min(1).max(100) }).strict();

export function crearRutasCategorias({ autenticar, controlador }) {
  const router = Router();
  router.use(autenticar, permitirRoles("ADMINISTRADOR", "DUENO", "VENDEDOR"));
  router.get("/", controlador.listar);
  router.use(permitirRoles("ADMINISTRADOR", "DUENO"));
  router.post("/", validar(nombre), controlador.crear);
  router.patch("/:id", validar(nombre), controlador.actualizar);
  router.delete("/:id", controlador.eliminar);
  return router;
}
