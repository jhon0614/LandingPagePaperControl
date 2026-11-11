import test from "node:test";
import assert from "node:assert/strict";
import { ServicioCorreo } from "../src/services/email.service.js";

function servicio(solicitar) {
  return new ServicioCorreo(
    { apiKey: "re_prueba", remitente: "PaperControl <notificaciones@papercontrol.online>" },
    { tiempoTokenMs: 1800000, urlFrontend: "https://www.papercontrol.online/#/restablecer-contrasena" },
    solicitar,
  );
}

test("envía por HTTPS con autenticación, enlace y logo inline", async () => {
  const correo = servicio(async (url, opciones) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(opciones.method, "POST");
    assert.equal(opciones.headers.Authorization, "Bearer re_prueba");
    const cuerpo = JSON.parse(opciones.body);
    assert.equal(cuerpo.from, "PaperControl <notificaciones@papercontrol.online>");
    assert.deepEqual(cuerpo.to, ["usuario@example.com"]);
    assert.ok(cuerpo.text.includes("https://www.papercontrol.online/#/restablecer-contrasena?token=token%2Bprueba"));
    assert.ok(cuerpo.html.includes("cid:logo-papercontrol"));
    assert.equal(cuerpo.attachments[0].content_id, "logo-papercontrol");
    assert.ok(Buffer.from(cuerpo.attachments[0].content, "base64").length > 0);
    return { ok: true, json: async () => ({ id: "email-id" }) };
  });
  await correo.enviarRestablecimiento("usuario@example.com", "token+prueba");
});

test("propaga rechazo de Resend sin exponer respuesta ni credenciales", async () => {
  const correo = servicio(async () => ({ ok: false, status: 403 }));
  await assert.rejects(correo.enviarRestablecimiento("usuario@example.com", "token"), {
    code: "RESEND_HTTP_403",
  });
});

test("no confirma envío sin identificador del proveedor", async () => {
  const correo = servicio(async () => ({ ok: true, json: async () => ({}) }));
  await assert.rejects(correo.enviarRestablecimiento("usuario@example.com", "token"), {
    code: "RESEND_RESPUESTA_INVALIDA",
  });
});
