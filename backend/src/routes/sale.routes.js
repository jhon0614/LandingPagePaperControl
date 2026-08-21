import { Router } from "express";
import { z } from "zod";
import { validar } from "../middleware/validate.js";
import { permitirRoles } from "../middleware/roles.middleware.js";

const dinero = z.number().finite().nonnegative().max(9999999999.99);
// Valida la venta completa antes de iniciar la transacción de inventario y pago.
const itemVenta = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive().max(999999),
  precioUnitario: dinero.optional(),
});
const esquemaCrear = z
  .object({
    turnoCajaId: z.number().int().positive().optional(),
    clienteId: z.number().int().positive().nullable().optional(),
    productos: z.array(itemVenta).min(1).max(100).optional(),
    items: z.array(itemVenta).min(1).max(100).optional(),
    metodoPago: z.string().trim().transform((valor) => valor.toUpperCase())
      .pipe(z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"])),
    tipoTarjeta: z.string().trim().max(50).nullable().optional(),
    banco: z.string().trim().max(80).nullable().optional(),
    tipoDescuento: z.enum(["PORCENTAJE", "VALOR_FIJO"]).nullable().optional(),
    valorDescuento: dinero.default(0),
    referencia: z.string().trim().max(100).nullable().optional(),
    montoRecibido: dinero.nullable().optional(),
  })
  .superRefine((datos, contexto) => {
    const productos = datos.productos ?? datos.items ?? [];
    if (!datos.productos && !datos.items) {
      contexto.addIssue({ code: "custom", path: ["items"], message: "Debes enviar al menos un producto." });
    }
    // Las validaciones cruzadas dependen de más de un campo del cuerpo.
    if (!datos.tipoDescuento && datos.valorDescuento !== 0) {
      contexto.addIssue({
        code: "custom",
        path: ["tipoDescuento"],
        message: "Es obligatorio cuando hay descuento.",
      });
    }
    if (datos.tipoDescuento === "PORCENTAJE" && datos.valorDescuento > 100) {
      contexto.addIssue({
        code: "custom",
        path: ["valorDescuento"],
        message: "No puede superar 100.",
      });
    }
    if (
      new Set(productos.map((producto) => producto.productoId)).size !==
      productos.length
    ) {
      contexto.addIssue({
        code: "custom",
        path: ["productos"],
        message: "No se puede repetir un producto.",
      });
    }
  })
  .transform((datos) => ({
    ...datos,
    productos: datos.productos ?? datos.items,
    referencia: datos.referencia ?? ([datos.tipoTarjeta, datos.banco].filter(Boolean).join(" - ") || null),
  }));
const esquemaAnular = z.preprocess(
  // El DELETE solicitado desde el frontend ya representa la confirmación de
  // la acción. También se conserva compatibilidad con { confirmar: true }.
  (datos) => datos ?? {},
  z.object({
    confirmar: z.literal(true).optional().default(true),
    motivo: z.string().trim().min(3).max(500).optional(),
  }),
);

export function crearRutasVentas({ autenticar, controlador }) {
  const router = Router();
  const rolesVenta = permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO");
  // Cualquier operación de ventas requiere una cuenta autenticada con estos roles.
  router.use(autenticar, rolesVenta);
  router.post("/", validar(esquemaCrear), controlador.crear);
  router.get(
    "/historial",
    // El historial global contiene ventas de todos los vendedores.
    permitirRoles("ADMINISTRADOR", "DUENO"),
    controlador.historial,
  );
  router.get("/:id/comprobante", controlador.comprobante);
  router.delete("/:id", validar(esquemaAnular), controlador.anular);
  router.get("/", controlador.propias);
  return router;
}
