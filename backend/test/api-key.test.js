import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { crearAplicacion } from "../src/app.js";

test("API key: filtra peticiones, admite CORS y mantiene autenticacion obligatoria", async (t) => {
  const clave = "clave-publica-ficticia-para-pruebas-123456";
  const origin = "http://localhost:5173";
  const app = crearAplicacion({ conexiones: {}, configuracion: {
    apiKey: clave, origenFrontend: origin, entorno: "development",
    autenticacion: { secretoAcceso: "secreto-ficticio-de-tests-con-32-caracteres" },
    correo: {}, restablecimientoContrasena: {},
  } });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const valor of [undefined, "incorrecta"]) {
    const res = await fetch(base + "/api/auth/refresh", {
      method: "POST", headers: { origin, ...(valor ? { "X-API-Key": valor } : {}) },
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.codigo, "API_KEY_INVALIDA");
    assert.equal(res.headers.get("access-control-allow-origin"), origin);
  }
  assert.equal((await fetch(base + "/api/health")).status, 200);
  const res = await fetch(base + "/api/usuarios", { headers: { "X-API-Key": clave, origin } });
  assert.equal(res.status, 401); // La clave no sustituye el JWT.
  const options = await fetch(base + "/api/auth/login", { method: "OPTIONS", headers: {
    origin, "access-control-request-method": "POST", "access-control-request-headers": "content-type,x-api-key",
  } });
  assert.equal(options.status, 204);
  assert.match(options.headers.get("access-control-allow-headers"), /x-api-key/i);
});
