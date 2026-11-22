import test from "node:test";
import assert from "node:assert/strict";
import { crearCachePrueba } from "../test-support/cache.js";
import { ServicioDashboard } from "../src/services/dashboard.service.js";
import { ControladorDashboard } from "../src/controllers/dashboard.controller.js";
import { ServicioProducto } from "../src/services/product.service.js";
import { ServicioVenta } from "../src/services/sale.service.js";
import { ServicioUsuario } from "../src/services/user.service.js";


test("dashboard: MISS/HIT/REFRESH devuelve el mismo objeto y numeros actuales", async () => {
  let consultas = 0;
  const servicio = new ServicioDashboard({ resumen: async () => ({ productos: String(++consultas), ventas: "2", usuarios: "3", stock_bajo: "4" }) }, crearCachePrueba("dashboard").cache);
  const controlador = new ControladorDashboard(servicio);
  const res = { set(k, v) { this[k] = v; }, status() { return this; }, json(body) { this.body = body; } };
  const next = (e) => { throw e; };
  await controlador.resumen({ query: {} }, res, next);
  assert.equal(res["X-Cache"], "MISS");
  await controlador.resumen({ query: {} }, res, next);
  assert.equal(res["X-Cache"], "HIT");
  assert.equal(consultas, 1);
  assert.deepEqual(res.body, { exito: true, datos: { resumen: { productos: 1, ventas: 2, usuarios: 3, stockBajo: 4 } } });
  await controlador.resumen({ query: { refrescar: "true" } }, res, next);
  assert.equal(res["X-Cache"], "REFRESH");
  assert.equal(res.body.datos.resumen.productos, 2);
  await assert.rejects(servicio.resumen({ refrescar: "si" }), { codigo: "REFRESCAR_INVALIDO" });
});

test("dashboard: productos y movimientos invalidan pero asociaciones no alteran contadores", async () => {
  let invalidaciones = 0;
  const servicio = new ServicioProducto({ crear: async () => 1, actualizar: async () => true,
    cambiarEstado: async () => true, eliminar: async () => ({ eliminado: true }),
    buscarPorId: async () => ({ id: 1 }), registrarMovimiento: async () => 1,
    listarMovimientos: async () => [{ id: 1 }], asociarProveedor: async () => true, listarProveedores: async () => [],
  }, undefined, undefined, { invalidar: async () => { invalidaciones++; } });
  await servicio.crear({}, 1);
  assert.equal(invalidaciones, 1, "await servicio.crear debe invalidar una sola vez");
  await servicio.actualizar(1, {}, 1);
  assert.equal(invalidaciones, 2, "await servicio.actualizar debe invalidar una sola vez");
  await servicio.cambiarEstado(1, false);
  assert.equal(invalidaciones, 3, "await servicio.cambiarEstado debe invalidar una sola vez");
  await servicio.eliminar(1, 1);
  assert.equal(invalidaciones, 4, "await servicio.eliminar debe invalidar una sola vez");
  await servicio.registrarMovimiento(1, {}, 1);
  assert.equal(invalidaciones, 5);
  await servicio.asociarProveedor(1, 2);
  assert.equal(invalidaciones, 5);
});

test("dashboard: ventas confirmadas/anuladas invalidan, rechazos no", async () => {
  let invalidaciones = 0;
  const servicio = new ServicioVenta({ crear: async () => ({ id: 1 }), anular: async () => ({}),
    comprobante: async () => ({ venta: { id: 1 }, productos: [], pagos: [] }),
  }, undefined, undefined, { invalidar: async () => { invalidaciones++; } });
  await servicio.crear({ productos: [] }, 1);
  assert.equal(invalidaciones, 1, "await servicio.crear debe invalidar una sola vez");
  await servicio.anular(1, {}, { id: 1, rol: "ADMINISTRADOR" });
  assert.equal(invalidaciones, 2);
  servicio.modelo.crear = async () => ({ error: "STOCK_INSUFICIENTE" });
  await assert.rejects(servicio.crear({ productos: [] }, 1), { codigo: "STOCK_INSUFICIENTE" });
  assert.equal(invalidaciones, 2);
});

test("dashboard: usuarios activos invalidan despues del commit; rollback no invalida", async () => {
  for (const fallar of [false, true]) {
    const eventos = [];
    const conexion = { beginTransaction: async () => {}, commit: async () => { eventos.push("commit"); if (fallar) throw new Error("fallo"); },
      rollback: async () => eventos.push("rollback"), release: () => eventos.push("release"),
      execute: async (sql) => {
        if (sql.includes("SELECT id FROM roles")) return [[{ id: 1 }]];
        if (sql.includes("SELECT u.id FROM usuarios")) return [[{ id: 1 }]];
        if (sql.includes("SELECT u.id, u.nombres")) return [[{ id: 2, rol: "VENDEDOR", esta_activo: 1 }]];
        return [{ affectedRows: 1, insertId: 1 }];
      } };
    const servicio = new ServicioUsuario({ conexiones: { getConnection: async () => conexion } }, {}, {}, {}, undefined,
      { invalidar: async () => eventos.push("invalidate") });
    if (fallar) {
      await assert.rejects(servicio.eliminar(2, 1), /fallo/);
      assert.ok(!eventos.includes("invalidate"));
    } else {
      await servicio.eliminar(2, 1);
      assert.deepEqual(eventos, ["commit", "release", "invalidate"]);
    }
  }
});

test("dashboard: sin Redis devuelve BYPASS y no oculta errores MySQL", async () => {
  let estado;
  const servicio = new ServicioDashboard({ resumen: async () => null });
  assert.deepEqual(await servicio.resumen({ refrescar: "true" }, (s) => { estado = s; }), { productos: 0, ventas: 0, usuarios: 0, stockBajo: 0 });
  assert.equal(estado, "BYPASS");
  servicio.modelo.resumen = async () => { throw new Error("SQL"); };
  await assert.rejects(servicio.resumen(), /SQL/);
});
