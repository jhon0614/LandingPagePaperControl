import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { crearRutasContacto } from "../src/routes/contact.routes.js";
import { manejarError } from "../src/middleware/error-handler.js";

const datos = { nombre: "Ana", apellido: "Pérez", email: "ana@example.com", mensaje: "Solicito información" };

test("contacto sin CAPTCHA valida, limita y no confirma fallos de entrega", async (t) => {
  let enviados = 0;
  let correoDisponible = true;
  const app = express();
  app.use(express.json());
  app.use("/api/contacto", crearRutasContacto({
    servicioCorreo: { enviarContacto: async (cuerpo) => {
      assert.equal(cuerpo.email, datos.email);
      if (!correoDisponible) throw Object.assign(new Error("privado"), { code: "RESEND_HTTP_403" });
      enviados++;
    } },
  }));
  app.use(manejarError);
  const servidor = app.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  t.after(() => servidor.close());
  const enviar = (cuerpo) => fetch(`http://127.0.0.1:${servidor.address().port}/api/contacto`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
  });
  assert.equal((await enviar({ ...datos, email: "inválido" })).status, 400);
  correoDisponible = false;
  const fallo = await enviar(datos);
  assert.equal(fallo.status, 503);
  assert.ok(!(await fallo.text()).includes("privado"));
  correoDisponible = true;
  assert.equal((await enviar(datos)).status, 200);
  assert.equal(enviados, 1);
  assert.equal((await enviar({ ...datos, mensaje: "x".repeat(5001) })).status, 400);
  assert.equal((await enviar({ ...datos, nombre: "" })).status, 400);
  assert.equal((await enviar(datos)).status, 429);
  assert.equal(enviados, 1);
});
