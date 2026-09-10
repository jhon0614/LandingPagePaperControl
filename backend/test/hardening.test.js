import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { centavos, importeSql, dinero } from "../src/utils/money.js";
import { rangoFechas, paginacion, listaPaginada } from "../src/utils/query.js";
import { crearMiddlewareAutenticacion } from "../src/middleware/auth.middleware.js";
import { ServicioReporte } from "../src/services/report.service.js";
import { ServicioContrasena } from "../src/services/password.service.js";
import { manejarError } from "../src/middleware/error-handler.js";

test("dinero rechaza fracciones de centavo y conserva aritmética decimal exacta", () => {
  for (const valor of [0.001, 10.999, -1, Infinity, 10000000000]) assert.equal(dinero.safeParse(valor).success, false);
  assert.equal(dinero.safeParse(9999999999.99).success, true);
  assert.equal(importeSql(centavos("0.10") + centavos("0.20")), "0.30");
  assert.throws(() => importeSql(1000000000000n), { codigo: "IMPORTE_FUERA_DE_RANGO" });
});

test("listados validan páginas y no truncan silenciosamente consumidores antiguos", () => {
  for (const filtros of [{ pagina: 0 }, { pagina: "1 OR 1=1" }, { limite: 501 }, { limite: -1 }])
    assert.throws(() => paginacion(filtros), { codigo: "PAGINACION_INVALIDA" });
  assert.throws(() => listaPaginada("ventas", Array(501).fill({})), { codigo: "PAGINACION_REQUERIDA" });
  const resultado = listaPaginada("ventas", [1, 2, 3], { pagina: 2, limite: 2 });
  assert.deepEqual(resultado.datos, { ventas: [1, 2], paginacion: { pagina: 2, limite: 2, hayMas: true } });
});

test("rangos rechazan días inexistentes y más de 366 días inclusivos", () => {
  for (const rango of [["2026-02-30", "2026-03-01"], ["2026-01-01", "2027-01-02"], ["2026-02-02", "2026-01-01"]])
    assert.throws(() => rangoFechas(...rango), { codigo: "RANGO_FECHAS_INVALIDO" });
  assert.doesNotThrow(() => rangoFechas("2024-02-29", "2024-02-29"));
});

test("JWT sin sesión, con sesión revocada o de otro usuario no autoriza", async () => {
  const secreto = "secret-with-at-least-thirty-two-characters";
  let consultoUsuario = false;
  for (const contenido of [{}, { sid: "99" }]) {
    let error;
    const token = jwt.sign(contenido, secreto, { subject: "1", expiresIn: "5m" });
    const middleware = crearMiddlewareAutenticacion({ secretoAcceso: secreto,
      modeloUsuario: { buscarPorId: async () => { consultoUsuario = true; } },
      modeloSesion: { estaActiva: async (id, usuarioId) => { assert.equal(id, 99); assert.equal(usuarioId, 1); return false; } },
    });
    await middleware({ get: () => `Bearer ${token}` }, {}, (resultado) => { error = resultado; });
    assert.equal(error.codigo, "SESION_NO_VALIDA");
  }
  assert.equal(consultoUsuario, false);
});

test("el reporte suma centavos sin residuos de punto flotante", async () => {
  const servicio = new ServicioReporte({ caja: async () => ["0.10", "0.20"].map((total, i) => ({
    fecha: `2026-09-0${i + 1}`, total_ventas: total, efectivo: total, tarjeta: "0", transferencia: "0", total_gastos: "0.10",
  })) });
  const resultado = await servicio.caja({ desde: "2026-09-01", hasta: "2026-09-02" });
  assert.equal(resultado.resumen.totalVentas, 0.3);
  assert.equal(resultado.resumen.flujoNeto, 0.1);
});

test("la recuperación pública solo encola y no depende de usuarios ni SMTP", async () => {
  const cola = [];
  const servicio = new ServicioContrasena({ modeloColaCorreo: { encolar: async (correo) => cola.push(correo) },
    modeloUsuario: { buscarActivoPorCorreo: assert.fail },
    servicioCorreo: { enviarRestablecimiento: assert.fail } });
  const a = await servicio.solicitarRestablecimiento({ correo: " UNO@example.test " });
  const b = await servicio.solicitarRestablecimiento({ correo: "desconocido@example.test" });
  assert.deepEqual(a, b);
  assert.deepEqual(cola, ["uno@example.test", "desconocido@example.test"]);
});

test("errores de saturación y concurrencia no exponen SQL", () => {
  for (const [code, estado] of [["ER_LOCK_DEADLOCK", 409], ["ER_LOCK_WAIT_TIMEOUT", 409], ["ETIMEDOUT", 503], ["ER_DUP_ENTRY", 409]]) {
    const respuesta = { set() {}, status(valor) { assert.equal(valor, estado); return this; },
      json(valor) { assert.ok(!JSON.stringify(valor).includes("SQL privado")); } };
    manejarError(Object.assign(new Error("SQL privado"), { code }), {}, respuesta, () => {});
  }
});
