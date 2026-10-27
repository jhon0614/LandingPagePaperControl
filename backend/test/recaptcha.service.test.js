import test from "node:test";
import assert from "node:assert/strict";
import { ServicioAutenticacion } from "../src/services/auth.service.js";

function construirServicio() {
  const intentos = [];
  const servicio = new ServicioAutenticacion({
    modeloUsuario: {
      buscarParaAutenticacion: async () => assert.fail("No debe consultar usuarios si falla CAPTCHA"),
    },
    modeloSesion: {},
    modeloConfiguracion: {},
    modeloIntentoAcceso: { crear: async (intento) => intentos.push(intento) },
    configuracionAutenticacion: {
      recaptchaSecretKey: "secreto-de-prueba",
      recaptchaHostnames: ["localhost", "papercontrol.vercel.app"],
    },
  });
  return { servicio, intentos };
}

// Las sustituciones de fetch se ejecutan en serie y se restauran incluso al fallar.
test("verificación reCAPTCHA sin llamadas reales a Google", async (t) => {
  const casos = [
    { nombre: "token ausente", token: undefined, estado: 400, codigo: "CAPTCHA_REQUERIDO" },
    { nombre: "token en blanco", token: "  ", estado: 400, codigo: "CAPTCHA_REQUERIDO" },
    { nombre: "token inválido", respuesta: { success: false }, estado: 403, codigo: "CAPTCHA_INVALIDO" },
    { nombre: "dominio diferente", respuesta: { success: true, hostname: "otro.example.com" }, estado: 403, codigo: "CAPTCHA_INVALIDO" },
    { nombre: "dominio ausente", respuesta: { success: true }, estado: 403, codigo: "CAPTCHA_INVALIDO" },
    { nombre: "Google inaccesible", falloRed: true, estado: 503, codigo: "CAPTCHA_SERVICIO_NO_DISPONIBLE" },
    { nombre: "Google responde HTTP 503", falloHttp: true, estado: 503, codigo: "CAPTCHA_SERVICIO_NO_DISPONIBLE" },
    { nombre: "respuesta JSON inválida", falloJson: true, estado: 503, codigo: "CAPTCHA_SERVICIO_NO_DISPONIBLE" },
  ];

  for (const caso of casos) {
    await t.test(caso.nombre, async () => {
      const fetchOriginal = globalThis.fetch;
      const { servicio, intentos } = construirServicio();
      let llamadas = 0;
      globalThis.fetch = async () => {
        llamadas++;
        if (caso.falloRed) throw new Error("Sin conexión");
        return {
          ok: !caso.falloHttp,
          json: async () => {
            if (caso.falloJson) throw new SyntaxError("JSON inválido");
            return caso.respuesta;
          },
        };
      };
      try {
        await assert.rejects(servicio.iniciarSesion({
          correo: " Usuario@Example.com ", contrasena: "no-se-consulta",
          captchaToken: Object.hasOwn(caso, "token") ? caso.token : "token-de-prueba",
          direccionIp: "127.0.0.1", agenteUsuario: "prueba",
        }), (error) => error.estadoHttp === caso.estado && error.codigo === caso.codigo);
        assert.equal(llamadas, caso.estado === 400 ? 0 : 1);
        assert.deepEqual(intentos, [{
          usuarioId: null, correo: "usuario@example.com", fueExitoso: false,
          motivoFallo: caso.codigo, direccionIp: "127.0.0.1", agenteUsuario: "prueba",
        }]);
      } finally {
        globalThis.fetch = fetchOriginal;
      }
    });
  }

  await t.test("acepta token válido y envía los parámetros de verificación", async () => {
    const fetchOriginal = globalThis.fetch;
    const { servicio } = construirServicio();
    globalThis.fetch = async (url, opciones) => {
      assert.equal(url, "https://www.google.com/recaptcha/api/siteverify");
      assert.equal(opciones.method, "POST");
      assert.equal(opciones.body.get("secret"), "secreto-de-prueba");
      assert.equal(opciones.body.get("response"), "token-valido");
      assert.ok(opciones.signal instanceof AbortSignal);
      return { ok: true, json: async () => ({ success: true, hostname: "localhost" }) };
    };
    try {
      await servicio.verificarRecaptcha("token-valido");
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  });
});
