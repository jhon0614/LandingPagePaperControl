import { Router } from "express";
import { z } from "zod";
import { permitirRoles } from "../middleware/roles.middleware.js";
import { validar } from "../middleware/validate.js";

const dinero = z.number().finite().nonnegative().max(9999999999.99);
const rolesCaja = permitirRoles("VENDEDOR", "ADMINISTRADOR", "DUENO");

const esquemaApertura = z.object({ montoInicial: dinero });
const esquemaGasto = z.object({
  descripcion: z.string().trim().min(1).max(255),
  monto: dinero.positive(),
});
const esquemaCierre = z.object({ montoContado: dinero });

export function crearRutasTurnosCaja({ autenticar, controlador }) {
  const router = Router();
  router.use(autenticar, rolesCaja);
  router.post("/apertura", validar(esquemaApertura), controlador.abrir);
  router.get("/actual", controlador.actual);
  router.get("/resumen", controlador.resumen);
  router.get("/gastos", controlador.gastos);
  router.post("/gastos", validar(esquemaGasto), controlador.registrarGasto);
  router.post("/cierre", validar(esquemaCierre), controlador.cerrar);
  router.get("/", controlador.historial);
  return router;
}

export function crearRutasGastosCaja({ autenticar, controlador }) {
  const router = Router();
  router.delete("/:id", autenticar, rolesCaja, controlador.eliminarGasto);
  return router;
}
