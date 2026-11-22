import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { ModeloProveedor } from "../src/models/supplier.model.js";
import { ServicioProveedor } from "../src/services/supplier.service.js";
import { ControladorProveedor } from "../src/controllers/supplier.controller.js";
import { crearRutasProveedores } from "../src/routes/supplier.routes.js";
import { manejarError } from "../src/middleware/error-handler.js";
import { CacheListado } from "../src/services/list-cache.service.js";

test("modelo: incluir inactivos conserva exclusion de eliminados; estado no modifica eliminado_en", async () => {
  const consultas = [];
  const modelo = new ModeloProveedor({ execute: async (sql, parametros) => {
    consultas.push({ sql, parametros });
    return sql.startsWith("UPDATE") ? [{ affectedRows: 1 }] : [[]];
  } });
  await modelo.listar({ pagina: 2, limite: 50 });
  assert.match(consultas[0].sql, /esta_activo = TRUE/);
  await modelo.listar({ incluirInactivos: true, buscar: "papel", pagina: 2, limite: 50 });
  assert.match(consultas[1].sql, /eliminado_en IS NULL/);
  assert.ok(!consultas[1].sql.includes("esta_activo = TRUE"));
  assert.match(consultas[1].sql, /LIMIT 51 OFFSET 50/);
  await modelo.cambiarEstado(3, false);
  const { sql, parametros } = consultas[2];
  assert.match(sql, /SET esta_activo = \?/);
  assert.match(sql, /WHERE id = \? AND eliminado_en IS NULL/);
  assert.ok(!sql.includes("eliminado_en ="));
  assert.deepEqual(parametros, [false, 3]);
});

test("HTTP: listar ambas variantes, desactivar/reactivar, errores y permisos", async (t) => {
  const filas = new Map([
    [1, { id: 1, nombre: "Papel", esta_activo: true, eliminado_en: null }],
    [2, { id: 2, nombre: "Arte", esta_activo: false, eliminado_en: null }],
    [3, { id: 3, nombre: "Eliminado anterior", esta_activo: false, eliminado_en: "2026-11-01" }],
  ]);
  let escrituras = 0, invalidacionesProductos = 0;
  const datos = new Map([["prueba:version", "1"]]);
  const cache = new CacheListado({ isReady: true, isOpen: true,
    get: async (k) => datos.get(k) ?? null, set: async (k, v) => datos.set(k, v), destroy() {} }, { prefijo: "prueba" });
  cache.disponible = true;
  const modelo = {
    listar: async (f) => [...filas.values()].filter((p) => !p.eliminado_en && (f.incluirInactivos || p.esta_activo)),
    buscarPorId: async (id) => { const fila = filas.get(id); return fila && !fila.eliminado_en ? fila : null; },
    cambiarEstado: async (id, estado) => { escrituras++; filas.get(id).esta_activo = estado; return true; },
  };
  const servicio = new ServicioProveedor(modelo, cache, { invalidar: async () => { invalidacionesProductos++; } });
  const app = express();
  app.use(express.json());
  app.use("/api/proveedores", crearRutasProveedores({
    autenticar: (req, res, next) => {
      const rol = req.get("x-rol-prueba");
      if (!rol) return res.status(401).end();
      req.usuario = { id: 1, rol }; next();
    }, controlador: new ControladorProveedor(servicio),
  }));
  app.use(manejarError);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/proveedores`;
  const pedir = (ruta = "", { rol = "ADMINISTRADOR", body, method = "GET" } = {}) => fetch(base + ruta, {
    method, headers: { ...(rol ? { "x-rol-prueba": rol } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let res = await pedir("?pagina=1&limite=50");
  assert.equal(res.headers.get("x-cache"), "MISS");
  assert.deepEqual((await res.json()).datos.proveedores.map((p) => p.id), [1]);
  assert.equal((await pedir("?pagina=1&limite=50")).headers.get("x-cache"), "HIT");
  res = await pedir("?incluirInactivos=true&pagina=1&limite=50");
  assert.equal(res.headers.get("x-cache"), "MISS");
  assert.deepEqual((await res.json()).datos.proveedores.map((p) => [p.id, p.estaActivo]), [[1, true], [2, false]]);
  res = await pedir("/1/estado", { method: "PATCH", body: { estaActivo: false } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).datos.proveedor.estaActivo, false);
  assert.equal(filas.get(1).eliminado_en, null);
  res = await pedir("?pagina=1&limite=50");
  assert.equal(res.headers.get("x-cache"), "MISS");
  assert.deepEqual((await res.json()).datos.proveedores, []);
  assert.equal((await pedir("?incluirInactivos=true&pagina=1&limite=50")).headers.get("x-cache"), "MISS");
  res = await pedir("/1/estado", { rol: "DUENO", method: "PATCH", body: { estaActivo: true } });
  assert.equal((await res.json()).datos.proveedor.estaActivo, true);
  assert.equal(invalidacionesProductos, 2);
  await pedir("/1/estado", { method: "PATCH", body: { estaActivo: true } });
  assert.equal(escrituras, 2); // Repetir el mismo estado es idempotente.
  for (const body of [{}, { estaActivo: "false" }, { estaActivo: 0 }, { estaActivo: null }, { estaActivo: false, nombre: "No permitido" }])
    assert.equal((await pedir("/1/estado", { method: "PATCH", body })).status, 400);
  for (const id of [3, 99]) assert.equal((await pedir(`/${id}/estado`, { method: "PATCH", body: { estaActivo: true } })).status, 404);
  assert.equal((await pedir("/abc/estado", { method: "PATCH", body: { estaActivo: true } })).status, 400);
  assert.equal((await pedir("/1/estado", { rol: "VENDEDOR", method: "PATCH", body: { estaActivo: false } })).status, 403);
  assert.equal((await pedir("?incluirInactivos=true", { rol: "VENDEDOR" })).status, 403);
  assert.equal((await pedir("", { rol: null })).status, 401);
  assert.equal((await pedir("?incluirInactivos=si")).status, 400);
  res = await pedir("?incluirInactivos=true&refrescar=true&pagina=1&limite=50");
  assert.equal(res.headers.get("x-cache"), "REFRESH");
  assert.equal(filas.get(3).eliminado_en, "2026-11-01");
});
