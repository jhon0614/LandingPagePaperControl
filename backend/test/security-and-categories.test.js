import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { crearAplicacion } from "../src/app.js";
import { ServicioCategoria } from "../src/services/category.service.js";
import { ModeloReporte } from "../src/models/report.model.js";
import { ServicioReporte } from "../src/services/report.service.js";

const secreto = "test-secret-with-at-least-32-random-characters";
const configuracion = { origenFrontend: "http://localhost:5173", entorno: "production",
  autenticacion: { secretoAcceso: secreto }, correo: {}, restablecimientoContrasena: {} };

async function servidorPrueba(t) {
  const consultas = [];
  const categorias = new Map();
  let secuencia = 0;
  const conexiones = { execute: async (sql, params) => {
    consultas.push({ sql, params });
    if (sql.includes("FROM usuarios")) return [[{ id: params[0], esta_activo: 1,
      rol: Number(params[0]) === 1 ? "ADMINISTRADOR" : "VENDEDOR" }]];
    if (sql.startsWith("INSERT INTO categorias")) {
      if ([...categorias.values()].includes(params[0])) throw Object.assign(new Error(), { code: "ER_DUP_ENTRY" });
      categorias.set(++secuencia, params[0]); return [{ insertId: secuencia }];
    }
    if (sql.startsWith("UPDATE categorias")) {
      if (!categorias.has(params[1])) return [{ affectedRows: 0 }];
      categorias.set(params[1], params[0]); return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("DELETE FROM categorias")) {
      if (params[0] === 99) throw Object.assign(new Error(), { code: "ER_ROW_IS_REFERENCED_2" });
      return [{ affectedRows: categorias.delete(params[0]) ? 1 : 0 }];
    }
    if (sql.includes("FROM categorias")) return [[...categorias].map(([id, nombre]) => ({ id, nombre }))];
    if (sql.includes("FROM sesiones_usuario")) return [[]];
    if (sql.includes("UPDATE sesiones_usuario")) return [{ affectedRows: 1 }];
    if (sql.includes("UNION ALL")) return [[]];
    throw new Error(`Consulta inesperada en prueba: ${sql}`);
  } };
  const app = crearAplicacion({ conexiones, configuracion });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const solicitar = (ruta, { usuario = 1, body, headers = {}, ...opciones } = {}) => fetch(base + ruta, {
    ...opciones,
    headers: {
      ...(usuario == null ? {} : { authorization: `Bearer ${jwt.sign({}, secreto, { subject: String(usuario), expiresIn: "5m" })}` }),
      ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers,
    },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  return { solicitar, consultas };
}

test("categorías HTTP: CRUD, duplicados, referencias y permisos", async (t) => {
  const { solicitar } = await servidorPrueba(t);
  assert.equal((await solicitar("/api/categorias", { usuario: null })).status, 401);
  assert.equal((await solicitar("/api/categorias", { usuario: 2, method: "POST", body: { nombre: "Papel" } })).status, 403);
  assert.equal((await solicitar("/api/categorias", { method: "POST", body: { nombre: " " } })).status, 400);
  assert.equal((await solicitar("/api/categorias", { method: "POST", body: { nombre: "Papel", esta_activo: false } })).status, 400);
  const creada = await solicitar("/api/categorias", { method: "POST", body: { nombre: " Papel " } });
  assert.equal(creada.status, 201);
  assert.equal((await creada.json()).datos.categoria.nombre, "Papel");
  assert.equal((await solicitar("/api/categorias", { method: "POST", body: { nombre: "Papel" } })).status, 409);
  const editada = await solicitar("/api/categorias/1", { method: "PATCH", body: { nombre: "Papelería" } });
  assert.equal((await editada.json()).datos.categoria.nombre, "Papelería");
  assert.equal((await solicitar("/api/categorias/99", { method: "DELETE" })).status, 409);
  assert.equal((await solicitar("/api/categorias/1", { method: "DELETE" })).status, 204);
  assert.equal((await solicitar("/api/categorias/1", { method: "DELETE" })).status, 404);
  assert.deepEqual((await (await solicitar("/api/categorias", { usuario: 2 })).json()).datos.categorias, []);
});

test("seguridad HTTP: origen, cabeceras, JSON, tamaño, consultas repetidas y JWT", async (t) => {
  const { solicitar } = await servidorPrueba(t);
  const salud = await solicitar("/api/health");
  assert.equal(salud.headers.get("x-powered-by"), null);
  assert.equal(salud.headers.get("x-content-type-options"), "nosniff");
  assert.equal(salud.headers.get("cache-control"), "no-store");
  assert.equal((await solicitar("/api/auth/refresh", { method: "POST", headers: { origin: "https://otro.example" } })).status, 403);
  assert.equal((await solicitar("/api/categorias", { method: "POST", body: "{" })).status, 400);
  assert.equal((await solicitar("/api/categorias", { method: "POST", body: { nombre: "x".repeat(110000) } })).status, 413);
  assert.equal((await solicitar("/api/productos?categoriaId=1&categoriaId=2")).status, 400);
  const token = jwt.sign({}, secreto, { subject: "1", algorithm: "HS384" });
  assert.equal((await solicitar("/api/categorias", { headers: { authorization: `Bearer ${token}` } })).status, 401);
  const expirado = jwt.sign({}, secreto, { subject: "1", expiresIn: -1 });
  assert.equal((await solicitar("/api/categorias", { headers: { authorization: `Bearer ${expirado}` } })).status, 401);
});

test("login limita intentos antes de consultar la base", async (t) => {
  const { solicitar, consultas } = await servidorPrueba(t);
  for (let i = 0; i < 20; i++) assert.equal((await solicitar("/api/auth/login", { method: "POST", body: {} })).status, 400);
  const limite = await solicitar("/api/auth/login", { method: "POST", body: {} });
  assert.equal(limite.status, 429);
  assert.equal((await limite.json()).error.codigo, "DEMASIADAS_SOLICITUDES");
  assert.ok(limite.headers.get("retry-after"));
  assert.equal(consultas.length, 0);
});

test("renovación y recuperación tienen límites propios", async (t) => {
  const { solicitar } = await servidorPrueba(t);
  for (let i = 0; i < 60; i++) assert.equal((await solicitar("/api/auth/refresh", { method: "POST" })).status, 401);
  assert.equal((await solicitar("/api/auth/refresh", { method: "POST" })).status, 429);
  for (let i = 0; i < 5; i++) assert.equal((await solicitar("/api/auth/olvide-contrasena", { method: "POST", body: {} })).status, 400);
  assert.equal((await solicitar("/api/auth/olvide-contrasena", { method: "POST", body: {} })).status, 429);
});

test("límite general responde 429 al superar 300 solicitudes por minuto", async (t) => {
  const { solicitar } = await servidorPrueba(t);
  for (let i = 0; i < 300; i++) assert.equal((await solicitar("/api/health")).status, 200);
  assert.equal((await solicitar("/api/health")).status, 429);
});

test("logout limpia la cookie antes de terminar la respuesta", async (t) => {
  const { solicitar } = await servidorPrueba(t);
  const res = await solicitar("/api/auth/logout", { method: "POST" });
  assert.equal(res.status, 204);
  assert.match(res.headers.get("set-cookie"), /tokenRenovacion=;/);
  assert.match(res.headers.get("set-cookie"), /HttpOnly/);
  assert.match(res.headers.get("set-cookie"), /Secure/);
  assert.match(res.headers.get("set-cookie"), /SameSite=Strict/);
});

test("contraseñas nuevas rechazan truncamiento bcrypt y cambio tiene límite propio", async (t) => {
  const { solicitar } = await servidorPrueba(t);
  const contrasenaNueva = "Aa1" + "é".repeat(36);
  assert.equal(contrasenaNueva.length < 72, true);
  for (let i = 0; i < 5; i++) {
    const res = await solicitar("/api/auth/contrasena", { method: "PATCH",
      body: { contrasenaActual: "Actual12345678", contrasenaNueva } });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.codigo, "ERROR_VALIDACION");
  }
  assert.equal((await solicitar("/api/auth/contrasena", { method: "PATCH", body: {} })).status, 429);
  const reset = await solicitar("/api/auth/restablecer-contrasena", { method: "POST",
    body: { token: "x".repeat(48), contrasenaNueva } });
  assert.equal(reset.status, 400);
  assert.equal((await reset.json()).error.codigo, "ERROR_VALIDACION");
  const usuario = await solicitar("/api/usuarios", { method: "POST", body: {
    nombres: "Prueba", apellidos: "Usuario", correo: "prueba@example.com", rolId: 1,
    contrasenaTemporal: contrasenaNueva,
  } });
  assert.equal(usuario.status, 400);
});

test("reporte SQL filtra fechas de cada operación y vendedor con parámetros", async () => {
  const modelo = new ModeloReporte({ execute: async (sql, params) => {
    assert.match(sql, /v\.confirmado_en >= \?/);
    assert.match(sql, /g\.ocurrido_en >= \?/);
    assert.match(sql, /v\.vendido_por = \?/);
    assert.match(sql, /g\.registrado_por = \?/);
    assert.match(sql, /v\.estado = 'CONFIRMADA'/);
    assert.match(sql, /UNION ALL/);
    assert.doesNotMatch(sql, /abierto_en/);
    assert.deepEqual(params, ["2026-09-01", "2026-09-02", 7, "2026-09-01", "2026-09-02", 7]);
    return [[]];
  } });
  await modelo.caja({ desde: "2026-09-01", hasta: "2026-09-02", vendedorId: 7 });
});

test("reporte rechaza IDs manipulados y rangos excesivos antes de consultar", async () => {
  const servicio = new ServicioReporte({ caja: assert.fail });
  for (const vendedorId of ["1 OR 1=1", "0", "1.5", ["1"], "9007199254740992"]) {
    await assert.rejects(servicio.caja({ desde: "2026-09-01", hasta: "2026-09-02", vendedorId }),
      { codigo: "VENDEDOR_ID_INVALIDO" });
  }
  await assert.rejects(servicio.caja({ desde: "2020-01-01", hasta: "2026-09-02" }), { codigo: "RANGO_FECHAS_INVALIDO" });
});

test("servicio de categorías rechaza IDs inseguros y propaga fallos inesperados", async () => {
  const servicio = new ServicioCategoria({ eliminar: assert.fail, crear: async () => { throw new Error("DB offline"); } });
  await assert.rejects(servicio.eliminar("9007199254740992"), { codigo: "ID_CATEGORIA_INVALIDO" });
  await assert.rejects(servicio.crear({ nombre: "Papel" }), /DB offline/);
});
