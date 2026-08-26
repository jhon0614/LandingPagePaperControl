import test from "node:test";
import assert from "node:assert/strict";
import { ControladorAutenticacion } from "../src/controllers/auth.controller.js";

function crearRespuestaSimulada() {
  return {
    estado: null,
    cuerpo: undefined,
    cookies: [],
    cookiesEliminadas: [],
    cookie(nombre, valor, opciones) {
      this.cookies.push({ nombre, valor, opciones });
      return this;
    },
    clearCookie(nombre, opciones) {
      this.cookiesEliminadas.push({ nombre, opciones });
      return this;
    },
    status(estado) {
      this.estado = estado;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
    send() {
      return this;
    },
  };
}

function crearSolicitud({ body = {}, cookie } = {}) {
  return {
    body,
    ip: "127.0.0.1",
    get(nombre) {
      if (nombre === "cookie") return cookie;
      if (nombre === "user-agent") return "navegador-prueba";
      return undefined;
    },
  };
}

const configuracion = { entorno: "development" };

test("login crea una cookie de sesión cuando recordarme está desactivado", async () => {
  const servicio = {
    iniciarSesion: async () => ({
      tokenAcceso: "access",
      tokenRenovacion: "refresh",
      expiracionTokenRenovacion: new Date(Date.now() + 60_000),
      esPersistente: false,
      usuario: { id: 1 },
    }),
  };
  const controlador = new ControladorAutenticacion(servicio, configuracion);
  const respuesta = crearRespuestaSimulada();

  await controlador.iniciarSesion(crearSolicitud(), respuesta, assert.fail);

  assert.equal(respuesta.estado, 200);
  assert.equal(respuesta.cookies[0].opciones.httpOnly, true);
  assert.equal(respuesta.cookies[0].opciones.expires, undefined);
});

test("login crea una cookie persistente cuando recordarme está activado", async () => {
  const expiracion = new Date(Date.now() + 60_000);
  const servicio = {
    iniciarSesion: async () => ({
      tokenAcceso: "access",
      tokenRenovacion: "refresh",
      expiracionTokenRenovacion: expiracion,
      esPersistente: true,
      usuario: { id: 1 },
    }),
  };
  const controlador = new ControladorAutenticacion(servicio, configuracion);
  const respuesta = crearRespuestaSimulada();

  await controlador.iniciarSesion(crearSolicitud(), respuesta, assert.fail);

  assert.equal(respuesta.cookies[0].opciones.expires, expiracion);
});

test("refresh toma la cookie HttpOnly y devuelve un token de acceso nuevo", async () => {
  let tokenRecibido;
  const servicio = {
    renovarSesion: async (token) => {
      tokenRecibido = token;
      return {
        tokenAcceso: "access-nuevo",
        tokenRenovacion: "refresh-nuevo",
        expiracionTokenRenovacion: new Date(Date.now() + 60_000),
        esPersistente: false,
        usuario: { id: 1, rol: "ADMINISTRADOR" },
      };
    },
  };
  const controlador = new ControladorAutenticacion(servicio, configuracion);
  const respuesta = crearRespuestaSimulada();
  const solicitud = crearSolicitud({ cookie: "otra=valor; tokenRenovacion=refresh-original" });

  await controlador.renovarSesion(solicitud, respuesta, assert.fail);

  assert.equal(tokenRecibido, "refresh-original");
  assert.equal(respuesta.cuerpo.datos.tokenAcceso, "access-nuevo");
  assert.equal(respuesta.cookies[0].valor, "refresh-nuevo");
});

test("logout revoca la sesión, elimina la cookie y responde 204", async () => {
  let tokenRevocado;
  const servicio = {
    cerrarSesion: async (token) => {
      tokenRevocado = token;
    },
  };
  const controlador = new ControladorAutenticacion(servicio, configuracion);
  const respuesta = crearRespuestaSimulada();
  const solicitud = crearSolicitud({ cookie: "tokenRenovacion=refresh-a-cerrar" });

  await controlador.cerrarSesion(solicitud, respuesta, assert.fail);

  assert.equal(tokenRevocado, "refresh-a-cerrar");
  assert.equal(respuesta.estado, 204);
  assert.equal(respuesta.cookiesEliminadas[0].nombre, "tokenRenovacion");
});

test("refresh fallido no borra una cookie rotada por otra solicitud", async () => {
  const errorSesion = new Error("sesión inválida");
  const servicio = {
    renovarSesion: async () => {
      throw errorSesion;
    },
  };
  const controlador = new ControladorAutenticacion(servicio, configuracion);
  const respuesta = crearRespuestaSimulada();
  let errorRecibido;

  await controlador.renovarSesion(
    crearSolicitud({ cookie: "tokenRenovacion=refresh-invalido" }),
    respuesta,
    (error) => {
      errorRecibido = error;
    },
  );

  assert.equal(errorRecibido, errorSesion);
  assert.equal(respuesta.cookiesEliminadas.length, 0);
});

test("logout elimina la cookie aunque falle la revocación", async () => {
  const errorBaseDatos = new Error("base de datos no disponible");
  const servicio = {
    cerrarSesion: async () => {
      throw errorBaseDatos;
    },
  };
  const controlador = new ControladorAutenticacion(servicio, configuracion);
  const respuesta = crearRespuestaSimulada();
  let errorRecibido;

  await controlador.cerrarSesion(
    crearSolicitud({ cookie: "tokenRenovacion=refresh-a-cerrar" }),
    respuesta,
    (error) => {
      errorRecibido = error;
    },
  );

  assert.equal(errorRecibido, errorBaseDatos);
  assert.equal(respuesta.cookiesEliminadas[0].nombre, "tokenRenovacion");
});
