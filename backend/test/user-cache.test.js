import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { crearCachePrueba } from "../test-support/cache.js";
import { ServicioUsuario } from "../src/services/user.service.js";
import { ServicioAutenticacion } from "../src/services/auth.service.js";
import { ServicioContrasena } from "../src/services/password.service.js";
import { ControladorUsuario } from "../src/controllers/user.controller.js";

const fila = { id: 2, nombres: "Laura", apellidos: "Gomez", correo: "laura@example.invalid",
  rol_id: 2, rol: "VENDEDOR", esta_activo: 1, hash_contrasena: "HASH_NO_DEBE_CACHEARSE", tokenAcceso: "TOKEN_NO_DEBE_CACHEARSE" };

test("usuarios: MISS/HIT/REFRESH conserva JSON y solo cachea el presentador sin credenciales", async () => {
  const { cache, datos } = crearCachePrueba("usuarios");
  let consultas = 0;
  const servicio = new ServicioUsuario({ listar: async () => { consultas++; return [fila]; } }, {}, {}, {}, cache);
  const controlador = new ControladorUsuario(servicio);
  const res = { set(k, v) { this[k] = v; }, status() { return this; }, json(body) { this.body = body; } };
  const query = { pagina: "1", limite: "50" };
  const next = (e) => { throw e; };
  await controlador.listar({ query }, res, next);
  assert.equal(res["X-Cache"], "MISS");
  await controlador.listar({ query }, res, next);
  assert.equal(res["X-Cache"], "HIT");
  assert.equal(consultas, 1);
  assert.equal(res.body.datos.usuarios[0].rol.nombre, "VENDEDOR");
  await controlador.listar({ query: { ...query, refrescar: "true" } }, res, next);
  assert.equal(res["X-Cache"], "REFRESH");
  await servicio.listar({ pagina: 2, limite: 50 });
  await servicio.listar({ buscar: "Ana", pagina: 1, limite: 50 });
  assert.equal(consultas, 4);
  const almacenado = JSON.stringify([...datos.values()]);
  assert.ok(!almacenado.includes(fila.hash_contrasena));
  assert.ok(!almacenado.includes(fila.tokenAcceso));
  await assert.rejects(servicio.listar({ refrescar: "si" }), { codigo: "REFRESCAR_INVALIDO" });
  await assert.rejects(servicio.listar({ pagina: 0 }), { codigo: "PAGINACION_INVALIDA" });
  await assert.rejects(servicio.listar({ buscar: "x".repeat(101) }), { codigo: "TERMINO_BUSQUEDA_INVALIDO" });
});

test("usuarios: cambiar datos, estado, Google y eliminar invalidan; detalle sigue en MySQL", async () => {
  let invalidaciones = 0, detalles = 0;
  const servicio = new ServicioUsuario({ buscarPorId: async () => { detalles++; return fila; },
    actualizar: async () => fila, actualizarEstado: async () => fila,
    cambiarEstadoGoogle: async () => true, eliminarLogicamente: async () => true,
  }, {}, { revocarPorUsuario: async () => {} }, { registrar: async () => {} },
  { invalidar: async () => { invalidaciones++; } });
  await servicio.actualizar(2, { nombres: "Ana" }, 1);
  assert.equal(invalidaciones, 1, "await servicio.actualizar debe invalidar una sola vez");
  await servicio.cambiarEstado(2, false, 1);
  assert.equal(invalidaciones, 2, "await servicio.cambiarEstado debe invalidar una sola vez");
  await servicio.cambiarGoogle(2, "aprobar", 1);
  assert.equal(invalidaciones, 3, "await servicio.cambiarGoogle debe invalidar una sola vez");
  await servicio.eliminar(2, 1);
  assert.equal(invalidaciones, 4);
  const antes = detalles;
  await servicio.buscarPorId(2); await servicio.buscarPorId(2);
  assert.equal(detalles, antes + 2);
});

test("usuarios: la invalidacion administrativa ocurre despues del commit, nunca al hacer rollback", async () => {
  for (const fallarCommit of [false, true]) {
    const eventos = [];
    const conexion = {
      beginTransaction: async () => eventos.push("begin"),
      commit: async () => { eventos.push("commit"); if (fallarCommit) throw new Error("rollback necesario"); },
      rollback: async () => eventos.push("rollback"), release: () => eventos.push("release"),
      execute: async (sql) => {
        if (sql.includes("SELECT id FROM roles")) return [[{ id: 1 }]];
        if (sql.includes("SELECT u.id FROM usuarios")) return [[{ id: 1 }]];
        if (sql.includes("SELECT u.id, u.nombres")) return [[fila]];
        return [{ affectedRows: 1, insertId: 1 }];
      },
    };
    const servicio = new ServicioUsuario({ conexiones: { getConnection: async () => conexion } }, {}, {}, {},
      { invalidar: async () => eventos.push("invalidate") });
    if (fallarCommit) {
      await assert.rejects(servicio.eliminar(2, 1), /rollback necesario/);
      assert.ok(!eventos.includes("invalidate"));
    } else {
      await servicio.eliminar(2, 1);
      assert.deepEqual(eventos, ["begin", "commit", "release", "invalidate"]);
    }
  }
});

test("usuarios: intentos de login y solicitudes Google invalidan aunque respondan 401/403", async () => {
  let invalidaciones = 0;
  const usuario = { ...fila, hash_contrasena: await bcrypt.hash("Correcta123!", 4), google_estado: "NINGUNO" };
  const servicio = new ServicioAutenticacion({
    modeloUsuario: { buscarParaAutenticacion: async () => usuario,
      registrarAccesoFallido: async () => {}, solicitarGoogle: async () => true },
    modeloIntentoAcceso: { crear: async () => {} }, modeloSesion: {},
    modeloConfiguracion: { obtenerEnteroPositivo: async (_k, valor) => valor },
    configuracionAutenticacion: {}, cacheUsuarios: { invalidar: async () => { invalidaciones++; } },
  });
  servicio.verificarRecaptcha = async () => {};
  await assert.rejects(servicio.iniciarSesion({ correo: usuario.correo, contrasena: "Incorrecta123!" }), { estadoHttp: 401 });
  assert.equal(invalidaciones, 1);
  servicio.clienteGoogle.verifyIdToken = async () => ({ getPayload: () => ({ sub: "google-ficticio", email: usuario.correo, email_verified: true }) });
  await assert.rejects(servicio.vincularGoogle({ usuarioId: usuario.id, credential: "ficticio" }), { codigo: "GOOGLE_PENDIENTE" });
  assert.equal(invalidaciones, 2);
});

test("usuarios: desbloqueo y recuperacion invalidan; sin Redis hay BYPASS", async () => {
  let invalidaciones = 0;
  const servicio = new ServicioContrasena({
    modeloUsuario: { buscarPorId: async () => fila, desbloquear: async () => true },
    modeloRestablecimiento: { consumirYActualizarContrasena: async () => 2 },
    modeloAuditoria: { registrar: async () => {} },
    cacheUsuarios: { invalidar: async () => { invalidaciones++; } },
  });
  await servicio.desbloquearUsuario({ usuarioId: 2, responsableId: 1 });
  assert.equal(invalidaciones, 1, "await servicio.desbloquearUsuario debe invalidar una sola vez");
  await servicio.restablecerContrasena({ token: "ficticio", contrasenaNueva: "Nueva123456!" });
  assert.equal(invalidaciones, 2);
  let estado;
  await new ServicioUsuario({ listar: async () => [fila] }).listar({ refrescar: "true" }, (s) => { estado = s; });
  assert.equal(estado, "BYPASS");
});
