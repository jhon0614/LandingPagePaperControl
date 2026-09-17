import test from "node:test";
import assert from "node:assert/strict";
import { ServicioDashboard } from "../src/services/dashboard.service.js";

test("dashboard presenta todos los contadores como números", async () => {
  const servicio = new ServicioDashboard({
    resumen: async () => ({
      productos: "7",
      ventas: 12n,
      usuarios: "3",
      stock_bajo: "2",
    }),
  });

  assert.deepEqual(await servicio.resumen(), {
    productos: 7,
    ventas: 12,
    usuarios: 3,
    stockBajo: 2,
  });
});

test("dashboard devuelve ceros si la consulta no produce una fila", async () => {
  const servicio = new ServicioDashboard({ resumen: async () => undefined });

  assert.deepEqual(await servicio.resumen(), {
    productos: 0,
    ventas: 0,
    usuarios: 0,
    stockBajo: 0,
  });
});
