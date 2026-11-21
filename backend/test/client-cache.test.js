import test from "node:test";
import assert from "node:assert/strict";
import { CacheListado } from "../src/services/list-cache.service.js";
import { ServicioCliente } from "../src/services/client.service.js";
import { ControladorCliente } from "../src/controllers/client.controller.js";
import { ServicioVenta } from "../src/services/sale.service.js";

const fila = { id: 1, tipo_documento: "CC", numero_documento: "123456", nombres: "Laura", esta_activo: 1 };
function cachePrueba() {
  const datos = new Map([["clientes:version", "1"]]);
  const cache = new CacheListado({ isReady: true, isOpen: true,
    get: async (k) => datos.get(k) ?? null, set: async (k, v) => datos.set(k, v), destroy() {} }, { prefijo: "clientes" });
  cache.disponible = true;
  return cache;
}

test("clientes: HIT/REFRESH y alcance efectivo impiden mezclar inactivos con vendedor", async () => {
  let consultas = 0;
  const servicio = new ServicioCliente({ buscar: async (_texto, _limite, incluir) => {
    consultas++;
    return incluir ? [fila, { ...fila, id: 2, esta_activo: 0 }] : [fila];
  } }, {}, cachePrueba());
  const controlador = new ControladorCliente(servicio);
  const res = { set(k, v) { this[k] = v; }, status() { return this; }, json(body) { this.body = body; } };
  const next = (error) => { throw error; };
  const req = { query: { pagina: "1", limite: "50", incluirInactivos: "true" }, usuario: { rol: "ADMINISTRADOR" } };
  await controlador.buscar(req, res, next);
  assert.equal(res.body.datos.clientes.length, 2);
  assert.equal(res["X-Cache"], "MISS");
  await controlador.buscar(req, res, next);
  assert.equal(res["X-Cache"], "HIT");
  await controlador.buscar({ ...req, usuario: { rol: "VENDEDOR" } }, res, next);
  assert.equal(res["X-Cache"], "MISS");
  assert.equal(res.body.datos.clientes.length, 1);
  assert.equal(res.body.datos.clientes[0].estaActivo, true);
  await controlador.buscar({ ...req, query: { ...req.query, refrescar: "true" } }, res, next);
  assert.equal(res["X-Cache"], "REFRESH");
  assert.equal(consultas, 3);
});

test("clientes: separa paginas y busquedas y valida antes de leer cache", async () => {
  let consultas = 0;
  const servicio = new ServicioCliente({ buscar: async () => { consultas++; return [fila]; } }, {}, cachePrueba());
  await servicio.buscar("Laura", undefined, { pagina: 1, limite: 50 });
  await servicio.buscar("Laura", undefined, { pagina: 2, limite: 50 });
  await servicio.buscar("Ana", undefined, { pagina: 1, limite: 50 });
  await servicio.buscar("Laura", undefined, { pagina: 1, limite: 10 });
  assert.equal(consultas, 4);
  await assert.rejects(servicio.buscar("Laura", undefined, { pagina: 0 }), { codigo: "PAGINACION_INVALIDA" });
  await assert.rejects(servicio.buscar("x".repeat(101)), { codigo: "TERMINO_BUSQUEDA_INVALIDO" });
  await assert.rejects(servicio.buscar(undefined, undefined, { refrescar: "si" }), { codigo: "REFRESCAR_INVALIDO" });
  assert.equal(consultas, 4);
});

test("clientes: crear, editar, activar y eliminar invalidan antes de auditar", async () => {
  let invalidaciones = 0;
  const cache = { invalidar: async () => { invalidaciones++; } };
  const servicio = new ServicioCliente({ buscarPorDocumento: async () => null, crear: async () => fila,
    buscarPorId: async () => fila, actualizar: async () => fila, actualizarEstado: async () => fila,
    eliminarLogicamente: async () => {},
  }, { registrar: async () => {} }, cache);
  await servicio.crear({ tipoDocumento: "CC", documento: "123456", nombres: "Laura" });
  await servicio.actualizar(1, { nombres: "Ana" }, 1);
  await servicio.cambiarEstado(1, false, 1);
  await servicio.eliminar(1, 1);
  assert.equal(invalidaciones, 4);
  servicio.modeloAuditoria.registrar = async () => { throw new Error("Auditoria no disponible"); };
  await assert.rejects(servicio.eliminar(1, 1), /Auditoria/);
  assert.equal(invalidaciones, 5); // MySQL ya habia cambiado aunque falle auditoria.
});

test("clientes: confirmar y anular ventas invalida las estadisticas de compra", async () => {
  let invalidaciones = 0;
  const cache = { invalidar: async () => { invalidaciones++; } };
  const servicio = new ServicioVenta({ crear: async () => ({ id: 1 }), anular: async () => ({}),
    comprobante: async () => ({ venta: { id: 1, vendido_por: 1 }, productos: [], pagos: [] }) }, undefined, cache);
  await servicio.crear({ productos: [{ productoId: 1, cantidad: 1 }], metodoPago: "EFECTIVO" }, 1);
  await servicio.anular(1, {}, { id: 1, rol: "ADMINISTRADOR" });
  assert.equal(invalidaciones, 2);
  servicio.modelo.crear = async () => ({ error: "STOCK_INSUFICIENTE" });
  await assert.rejects(servicio.crear({ productos: [] }, 1), { codigo: "STOCK_INSUFICIENTE" });
  assert.equal(invalidaciones, 2);
});

test("clientes: sin Redis refresca con BYPASS; detalle consulta MySQL cada vez", async () => {
  let detalles = 0;
  const servicio = new ServicioCliente({ buscar: async () => [fila],
    buscarPorId: async () => { detalles++; return fila; } });
  let estado;
  await servicio.buscar(undefined, undefined, { refrescar: "true" }, (s) => { estado = s; });
  assert.equal(estado, "BYPASS");
  await servicio.buscarPorId(1); await servicio.buscarPorId(1);
  assert.equal(detalles, 2);
});
