import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Resuelve la ubicación del logo a partir de este archivo, sin depender de la
// carpeta desde la cual se haya iniciado el servidor.
const rutaLogo = fileURLToPath(
  new URL(
    "../../../frontend/src/assets/LogoPaperControl.jpeg",
    import.meta.url,
  ),
);

// El texto del formulario se muestra como contenido, nunca como marcado HTML.
function escaparHtml(valor) {
  return valor.replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[caracter]);
}

// Prepara y envía los mensajes de recuperación mediante la cuenta configurada
// en las variables de entorno.
export class ServicioCorreo {
  constructor(configuracionCorreo, configuracionRestablecimiento, solicitar = fetch) {
    this.configuracionRestablecimiento = configuracionRestablecimiento;

    this.apiKey = configuracionCorreo.apiKey;
    this.solicitar = solicitar;

    this.remitente = configuracionCorreo.remitente;
    this.destinatarioContacto = configuracionCorreo.destinatarioContacto;
  }

  async enviarRestablecimiento(correoDestino, token) {
    // Se incluyen versiones HTML y texto para funcionar en distintos clientes.
    const enlace = this.#crearEnlaceRestablecimiento(token);
    const minutosExpiracion = Math.round(
      this.configuracionRestablecimiento.tiempoTokenMs / 60_000,
    );

    const asunto = "Restablece tu contraseña de PaperControl";
    const texto = [
      "Hola:",
      "",
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta de PaperControl.",
      "",
      `Puedes crear una nueva contraseña desde este enlace: ${enlace}`,
      "",
      `El enlace estará disponible durante ${minutosExpiracion} minutos y solo podrá utilizarse una vez.`,
      "",
      "Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual seguirá funcionando.",
      "",
      "Equipo PaperControl",
    ].join("\n");

    const html = `
      <!doctype html>
      <html lang="es">
        <body style="margin:0;padding:0;background:#f3f6f7;font-family:Arial,sans-serif;color:#17313a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f7;padding:32px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dce6e8;">
                  <tr>
                    <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #e5edef;">
                      <img src="cid:logo-papercontrol" alt="PaperControl, inventario y ventas" width="300" style="display:inline-block;max-width:100%;height:auto;">
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 18px;font-size:25px;line-height:1.3;color:#006b78;">Restablece tu contraseña</h1>
                      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola:</p>
                      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Recibimos una solicitud para restablecer la contraseña de tu cuenta de PaperControl.</p>
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                        <tr>
                          <td style="border-radius:8px;background:#007887;">
                            <a href="${enlace}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">Crear nueva contraseña</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52666d;">Este enlace estará disponible durante <strong>${minutosExpiracion} minutos</strong> y solo podrá utilizarse una vez.</p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#52666d;">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual seguirá funcionando.</p>
                      <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#52666d;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                      <p style="margin:8px 0 0;font-size:12px;line-height:1.5;word-break:break-all;color:#007887;">${enlace}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 32px;background:#002f38;text-align:center;color:#d8e8ea;font-size:12px;">
                      Mensaje automático de PaperControl. Por favor, no respondas a este correo.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const logo = await readFile(rutaLogo);
    const respuesta = await this.solicitar("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        from: this.remitente,
        to: [correoDestino],
        subject: asunto,
        text: texto,
        html,
        attachments: [{
          filename: "papercontrol.jpeg",
          content: logo.toString("base64"),
          content_id: "logo-papercontrol",
        }],
      }),
    });
    if (!respuesta.ok) {
      // No incluir respuestas del proveedor: pueden contener datos personales.
      throw Object.assign(new Error("Resend rechazó el envío del correo."), {
        code: `RESEND_HTTP_${respuesta.status}`,
      });
    }
    const resultado = await respuesta.json();
    if (!resultado.id) {
      throw Object.assign(new Error("Resend no confirmó el envío del correo."), {
        code: "RESEND_RESPUESTA_INVALIDA",
      });
    }
  }

  async enviarContacto({ nombre, apellido, email, mensaje }) {
    const logo = await readFile(rutaLogo);
    const nombreCompleto = escaparHtml(`${nombre} ${apellido}`);
    const correoSeguro = escaparHtml(email);
    const mensajeSeguro = escaparHtml(mensaje).replace(/\r\n|\r|\n/g, "<br>");
    const enlaceRespuesta = escaparHtml(`mailto:${encodeURIComponent(email)}?subject=Consulta%20sobre%20PaperControl`);
    const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f6f7;font-family:Arial,Helvetica,sans-serif;color:#17313a;">
  <div style="display:none;max-height:0;overflow:hidden;">Una persona quiere conocer más sobre PaperControl. Revisa su solicitud y responde.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f7;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dce6e8;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="padding:24px;border-bottom:1px solid #e5edef;">
          <img src="cid:logo-papercontrol" alt="PaperControl, inventario y ventas" width="240" style="display:block;width:240px;max-width:100%;height:auto;">
        </td></tr>
        <tr><td style="padding:28px 24px 12px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:bold;letter-spacing:1px;color:#007887;">CONTACTO DESDE LA WEB</p>
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#002f38;">Nueva solicitud de contacto</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#52666d;">Alguien quiere dar el siguiente paso con PaperControl. Estos son sus datos:</p>
        </td></tr>
        <tr><td style="padding:12px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf7f8;border:1px solid #cfe5e8;border-radius:8px;">
            <tr><td style="padding:18px;word-break:break-word;overflow-wrap:anywhere;">
              <p style="margin:0 0 6px;color:#52666d;font-size:12px;">NOMBRE Y APELLIDO</p>
              <p style="margin:0 0 18px;font-size:18px;font-weight:bold;line-height:1.4;">${nombreCompleto}</p>
              <p style="margin:0 0 6px;color:#52666d;font-size:12px;">CORREO ELECTRÓNICO</p>
              <a href="${enlaceRespuesta}" style="color:#006b78;font-size:15px;line-height:1.5;text-decoration:underline;">${correoSeguro}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 24px;">
          <h2 style="margin:0 0 12px;font-size:16px;color:#002f38;">Mensaje del interesado</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafcfc;border:1px solid #e5edef;border-radius:8px;">
            <tr><td style="padding:18px;font-size:15px;line-height:1.7;word-break:break-word;overflow-wrap:anywhere;">${mensajeSeguro}</td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:20px 24px 28px;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#007887;border-radius:8px;">
            <a href="${enlaceRespuesta}" style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Responder al interesado</a>
          </td></tr></table>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#52666d;">También puedes usar «Responder» en tu correo: la respuesta irá directamente al interesado.</p>
        </td></tr>
        <tr><td align="center" style="padding:18px 24px;background:#002f38;color:#d8e8ea;font-size:12px;line-height:1.6;">PaperControl · Inventario y ventas<br>Solicitud recibida desde el formulario de contacto de la web.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    const respuesta = await this.solicitar("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        from: this.remitente,
        to: [this.destinatarioContacto],
        reply_to: email,
        subject: "Nueva solicitud de contacto de PaperControl",
        html,
        attachments: [{
          filename: "papercontrol.jpeg",
          content: logo.toString("base64"),
          content_id: "logo-papercontrol",
        }],
        text: `Nombre: ${nombre} ${apellido}\nCorreo: ${email}\n\n${mensaje}`,
      }),
    });
    if (!respuesta.ok) {
      throw Object.assign(new Error("Resend rechazó el correo de contacto."), {
        code: `RESEND_HTTP_${respuesta.status}`,
      });
    }
    const resultado = await respuesta.json();
    if (!resultado.id) {
      throw Object.assign(new Error("Resend no confirmó el correo de contacto."), {
        code: "RESEND_RESPUESTA_INVALIDA",
      });
    }
  }

  #crearEnlaceRestablecimiento(token) {
    // La aplicación usa HashRouter, por eso el token debe quedar dentro del hash.
    const enlace = new URL(this.configuracionRestablecimiento.urlFrontend);
    const separador = enlace.hash.includes("?") ? "&" : "?";
    enlace.hash += `${separador}token=${encodeURIComponent(token)}`;
    return enlace.toString();
  }
}
