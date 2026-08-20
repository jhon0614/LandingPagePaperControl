import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";
import { permitirRoles } from "../middleware/roles.middleware.js";

const dinero = z.number().finite().nonnegative().max(9999999999.99);
const esquemaCrear = z.object({
  clienteId: z.number().int().positive().nullable().optional(),
  productos: z.array(z.object({
    productoId: z.number().int().positive(),
    cantidad: z.number().int().positive().max(999999),
  })).min(1).max(100),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]),
  tipoDescuento: z.enum(["PORCENTAJE", "VALOR_FIJO"]).nullable().optional(),
  valorDescuento: dinero.default(0),
  referencia: z.string().trim().max(100).nullable().optional(),
  montoRecibido: dinero.nullable().optional(),
}).superRefine((datos, contexto) => {
  if (!datos.tipoDescuento && datos.valorDescuento !== 0) {
    contexto.addIssue({ code: "custom", path: ["tipoDescuento"], message: "Es obligatorio cuando hay descuento." });
  }
  if (datos.tipoDescuento === "PORCENTAJE" && datos.valorDescuento > 100) {
    contexto.addIssue({ code: "custom", path: ["valorDescuento"], message: "No puede superar 100." });
  }
  if (new Set(datos.productos.map((producto) => producto.productoId)).size !== datos.productos.length) {
    contexto.addIssue({ code: "custom", path: ["productos"], message: "No se puede repetir un producto." });
  }
});
const esquemaAnular = z.object({
  confirmar: z.literal(true),
  motivo: z.string().trim().min(3).max(500).optional(),
});

export function crearRutasVentas({ autenticar, controlador }) {
  const router = Router();
  const rolesVenta = permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO");
  router.use(autenticar, rolesVenta);
  router.post("/", validar(esquemaCrear), controlador.crear);
  router.get("/historial", permitirRoles("ADMINISTRADOR", "DUENO"), controlador.historial);
  router.get("/:id/comprobante", controlador.comprobante);
  router.delete("/:id", validar(esquemaAnular), controlador.anular);
  router.get("/", controlador.propias);
  return router;
}
