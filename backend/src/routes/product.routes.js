import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";
import { permitirRoles } from "../middleware/roles.middleware.js";

const dinero = z.number().finite().nonnegative().max(9999999999.99);
const esquemaProducto = z.object({
  nombre: z.string().trim().min(1).max(150),
  marca: z.string().trim().min(1).max(500),
  codigo: z.string().trim().min(1).max(60),
  categoria: z.string().trim().min(1).max(100),
  precioMayor: dinero,
  precioDetal: dinero,
  stock: z.number().int().nonnegative().max(4294967295),
  stockMinimo: z.number().int().nonnegative().max(4294967295),
});
const esquemaEstado = z.object({ estaActivo: z.boolean() });
const esquemaMovimiento = z.object({
  tipo: z.enum(["ENTRADA", "AJUSTE"]),
  cantidad: z.number().int().positive().max(4294967295),
  nota: z.string().trim().max(500).default(""),
});
const esquemaProveedor = z.object({ proveedorId: z.number().int().positive() });

// Las consultas son accesibles al vendedor para alimentar el POS. Las
// operaciones administrativas se limitan a ADMINISTRADOR y DUENO.
export function crearRutasProductos({ autenticar, controlador }) {
  const router = Router();
  const todos = permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO");
  const administrar = permitirRoles("ADMINISTRADOR", "DUENO");
  router.use(autenticar, todos);
  // Las rutas literales se declaran antes de /:id para evitar ambigüedades.
  router.get("/alertas-stock", controlador.alertas);
  router.get("/:id/movimientos", controlador.movimientos);
  router.post(
    "/:id/movimientos",
    administrar,
    validar(esquemaMovimiento),
    controlador.registrarMovimiento,
  );
  router.get("/:id/proveedores", controlador.proveedores);
  router.post(
    "/:id/proveedores",
    administrar,
    validar(esquemaProveedor),
    controlador.asociarProveedor,
  );
  router.delete(
    "/:id/proveedores/:proveedorId",
    administrar,
    controlador.quitarProveedor,
  );
  router.patch(
    "/:id/estado",
    administrar,
    validar(esquemaEstado),
    controlador.cambiarEstado,
  );
  router.get("/:id", controlador.obtener);
  router.post("/", administrar, validar(esquemaProducto), controlador.crear);
  router.patch(
    "/:id",
    administrar,
    validar(esquemaProducto),
    controlador.actualizar,
  );
  router.delete("/:id", administrar, controlador.eliminar);
  router.get("/", controlador.listar);
  return router;
}
