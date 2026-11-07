import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { crearRutasUsuarios } from "../src/routes/user.routes.js";
import { ControladorUsuario } from "../src/controllers/user.controller.js";
import { ServicioUsuario } from "../src/services/user.service.js";
import { ModeloUsuario } from "../src/models/user.model.js";

// La identidad simulada sustituye solo la autenticación; se prueban el router,
// los permisos, validación, controlador y servicio reales.
test("Google administrativo HTTP: permisos, acciones, listado y errores", async (t) => {
  const fila = { id: 7, correo: "ana@example.com", google_estado: "PENDIENTE", google_correo: "ana@example.com" };
  const revocadas = [], auditorias = [];
  const servicio = new ServicioUsuario({
    listar: async () => [fila],
    buscarPorId: async (id) => id === 7 ? { ...fila } : null,
    cambiarEstadoGoogle: async (_id, estado) => {
      if (!fila.google_correo) return false;
      fila.google_estado = estado;
      if (estado === "NINGUNO") fila.google_correo = null;
      return true;
    },
  }, {}, { revocarPorUsuario: async (id) => revocadas.push(id) },
  { registrar: async (datos) => auditorias.push(datos) });
  const app = express();
  app.use(express.json());
  app.use("/api/usuarios", crearRutasUsuarios({
    autenticar: (req, _res, next) => { req.usuario = { id: 1, rol: req.get("x-rol") }; next(); },
    controladorUsuario: new ControladorUsuario(servicio),
    controladorContrasena: { desbloquearUsuario: (_q, _s, n) => n(), solicitarRestablecimientoAdministrativo: (_q, _s, n) => n() },
  }));
  app.use((err, _req, res, _next) => res.status(err.estadoHttp ?? 500).json({ codigo: err.codigo }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/usuarios`;
  const patch = (accion, rol = "ADMINISTRADOR", id = 7) => fetch(`${base}/${id}/google`, {
    method: "PATCH", headers: { "content-type": "application/json", "x-rol": rol }, body: JSON.stringify({ accion }),
  });
  for (const accion of ["aprobar", "rechazar", "revocar"]) {
    assert.equal((await patch(accion, "VENDEDOR")).status, 403);
  }
  assert.equal(fila.google_estado, "PENDIENTE");
  assert.equal((await patch("invalida")).status, 400);
  assert.equal((await patch("aprobar", "ADMINISTRADOR", "abc")).status, 400);
  assert.equal((await patch("aprobar", "DUENO", 99)).status, 404);
  const listado = await fetch(base, { headers: { "x-rol": "DUENO" } });
  const datos = await listado.json();
  assert.equal(datos.datos.usuarios[0].google_estado, "PENDIENTE");
  assert.equal(datos.datos.usuarios[0].google_correo, fila.google_correo);
  for (const [accion, rol, esperado] of [["aprobar", "ADMINISTRADOR", "APROBADO"], ["rechazar", "DUENO", "RECHAZADO"], ["aprobar", "DUENO", "APROBADO"], ["revocar", "ADMINISTRADOR", "NINGUNO"]]) {
    const respuesta = await patch(accion, rol);
    assert.equal(respuesta.status, 200);
    assert.equal((await respuesta.json()).datos.usuario.google_estado, esperado);
  }
  assert.equal(fila.google_correo, null);
  assert.deepEqual(revocadas, [7, 7]);
  assert.equal(auditorias.length, 4);
  assert.equal((await patch("aprobar")).status, 409);
});

test("modelo Google: solicitud condicionada, conflictos y limpieza al revocar", async () => {
  const consultas = [];
  const modelo = new ModeloUsuario({ execute: async (sql, parametros) => {
    consultas.push({ sql, parametros });
    return [{ affectedRows: 1 }];
  } });
  assert.equal(await modelo.solicitarGoogle(7, "sub", "ana@example.com"), true);
  assert.match(consultas[0].sql, /google_estado = 'NINGUNO'/);
  assert.match(consultas[0].sql, /google_sub IS NULL/);
  assert.match(consultas[0].sql, /correo = \?/);
  await modelo.cambiarEstadoGoogle(7, "NINGUNO");
  assert.deepEqual(consultas[1].parametros, ["NINGUNO", "NINGUNO", "NINGUNO", 7]);
  assert.match(consultas[1].sql, /NULL, google_sub/);
  modelo.conexiones.execute = async () => { throw Object.assign(new Error(), { code: "ER_DUP_ENTRY" }); };
  assert.equal(await modelo.solicitarGoogle(7, "sub", "ana@example.com"), false);
});
