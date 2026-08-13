import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";

// Resuelve la ubicación del logo a partir de este archivo, sin depender de la
// carpeta desde la cual se haya iniciado el servidor.
const rutaLogo = fileURLToPath(
  new URL(
    "../../../frontend/src/assets/LogoPaperControl.jpeg",
    import.meta.url,
  ),
);

// Prepara y envía los mensajes de recuperación mediante la cuenta configurada
// en las variables de entorno.
export class ServicioCorreo {
  constructor(configuracionCorreo, configuracionRestablecimiento) {
    this.configuracionRestablecimiento = configuracionRestablecimiento;

    // Con el puerto 587, requireTLS obliga a actualizar la conexión a STARTTLS.
    this.transportador = nodemailer.createTransport({
      host: configuracionCorreo.servidor,
      port: configuracionCorreo.puerto,
      secure: configuracionCorreo.seguro,
      requireTLS: !configuracionCorreo.seguro,
      auth: {
        user: configuracionCorreo.usuario,
        pass: configuracionCorreo.contrasena,
      },
    });

    this.remitente = configuracionCorreo.remitente;
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

    await this.transportador.sendMail({
      from: this.remitente,
      to: correoDestino,
      subject: asunto,
      text: texto,
      html,
      attachments: [
        {
          // cid permite mostrar el logo dentro del mensaje sin una URL pública.
          filename: "papercontrol.jpeg",
          path: rutaLogo,
          cid: "logo-papercontrol",
        },
      ],
    });
  }

  #crearEnlaceRestablecimiento(token) {
    // La aplicación usa HashRouter, por eso el token debe quedar dentro del hash.
    const enlace = new URL(this.configuracionRestablecimiento.urlFrontend);
    const separador = enlace.hash.includes("?") ? "&" : "?";
    enlace.hash += `${separador}token=${encodeURIComponent(token)}`;
    return enlace.toString();
  }
}
