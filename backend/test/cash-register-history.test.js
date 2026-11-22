import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { ServicioTurnoCaja } from "../src/services/cash-register.service.js";
import { ModeloTurnoCaja } from "../src/models/cash-register.model.js";
import { ControladorTurnoCaja } from "../src/controllers/cash-register.controller.js";
import { crearRutasTurnosCaja } from "../src/routes/cash-register.routes.js";
import { manejarError } from "../src/middleware/error-handler.js";

test("historial de caja: gastos por turno, contrato, validaciones y permisos", async (t) => {
  const llamadas = [];
  const gasto = { id: 8, turno_caja_id: 2, registrado_por: 4,
    usuario_nombres: "Ana", usuario_apellidos: "Pérez", descripcion: "Domicilio",
    monto: "15000.00", ocurrido_en: "2026-11-14T10:05:00", creado_en: "2026-11-14T10:05:00" };
  const servicio = new ServicioTurnoCaja({
    buscarPorId: async (id) => [2, 3].includes(id) ? { id } : null,
    buscarAbierto: async () => ({ id: 2 }),
    listarGastos: async (id) => { llamadas.push(id); return id === 2 ? [gasto] : []; },
    listar: async () => [{ id: 2, estado: "CERRADO", total_gastos: "15000.00" }, { id: 3, total_gastos: "0.00" }],
  });
  const app = express();
  app.use("/api/turnos-caja", crearRutasTurnosCaja({
    autenticar: (req, res, next) => {
      const rol = req.get("x-rol-prueba");
      if (!rol) return res.status(401).end();
      req.usuario = { id: 4, rol }; next();
    }, controlador: new ControladorTurnoCaja(servicio),
  }));
  app.use(manejarError);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/turnos-caja`;
  const pedir = (ruta, rol = "ADMINISTRADOR") => fetch(base + ruta, { headers: rol ? { "x-rol-prueba": rol } : {} });
  for (const rol of ["ADMINISTRADOR", "DUENO"]) {
    const respuesta = await pedir("/2/gastos", rol);
    assert.equal(respuesta.status, 200);
    const cuerpo = await respuesta.json();
    assert.deepEqual(cuerpo.datos.gastos, [{ id: 8, turnoId: 2, usuarioId: 4,
      usuario: "Ana Pérez", usuarioNombre: "Ana Pérez", descripcion: "Domicilio", monto: 15000,
      ocurridoEn: gasto.ocurrido_en, creadoEn: gasto.creado_en }]);
  }
  assert.deepEqual((await (await pedir("/3/gastos")).json()).datos.gastos, []);
  assert.equal((await pedir("/99/gastos")).status, 404);
  for (const id of ["abc", "0", "-1", "1.5", "9007199254740992"])
    assert.equal((await pedir(`/${id}/gastos`)).status, 400);
  assert.equal((await pedir("/2/gastos", "VENDEDOR")).status, 403);
  assert.equal((await pedir("/2/gastos", null)).status, 401);
  assert.equal((await pedir("/", "VENDEDOR")).status, 403);
  const historial = await (await pedir("/")).json();
  assert.equal(historial.datos.turnos[0].totalGastos, 15000);
  assert.equal(historial.datos.turnos[1].totalGastos, 0);
  const actual = await (await pedir("/gastos", "VENDEDOR")).json();
  assert.equal(actual.datos.gastos[0].id, 8);
  assert.deepEqual(llamadas, [2, 2, 3, 2]);
});

test("modelo: historial suma gastos en una consulta y conserva filtros y paginación", async () => {
  const consultas = [];
  const modelo = new ModeloTurnoCaja({ execute: async (sql, parametros) => {
    consultas.push({ sql, parametros }); return [[]];
  } });
  await modelo.listar({ desde: "2026-11-01", hasta: "2026-11-30", pagina: 2, limite: 10 });
  assert.equal(consultas.length, 1);
  assert.match(consultas[0].sql, /SUM\(g.monto\)/);
  assert.match(consultas[0].sql, /g.turno_caja_id = t.id/);
  assert.match(consultas[0].sql, /0\) AS total_gastos/);
  assert.match(consultas[0].sql, /LIMIT 11 OFFSET 10/);
  assert.deepEqual(consultas[0].parametros, ["2026-11-01", "2026-11-30"]);
  assert.equal(await modelo.buscarPorId(99), null);
  assert.deepEqual(consultas[1].parametros, [99]);
});
