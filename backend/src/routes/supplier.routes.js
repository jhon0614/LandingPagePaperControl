import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";
import { permitirRoles } from "../middleware/roles.middleware.js";

const esquema = z.object({
  nombre: z.string().trim().min(1).max(150),
  contacto: z.string().trim().max(150).optional().default(""),
  telefono: z.string().trim().max(30).optional().default(""),
  correo: z
    .union([z.string().trim().email().max(191), z.literal("")])
    .optional()
    .default(""),
  direccion: z.string().trim().max(255).optional().default(""),
});
export function crearRutasProveedores({ autenticar, controlador }) {
  const router = Router();
  // La administración de proveedores no está disponible para vendedores.
  router.use(autenticar, permitirRoles("ADMINISTRADOR", "DUENO"));
  router.get("/", controlador.listar);
  router.get("/:id", controlador.obtener);
  router.post("/", validar(esquema), controlador.crear);
  router.patch("/:id", validar(esquema), controlador.actualizar);
  router.delete("/:id", controlador.eliminar);
  return router;
}
