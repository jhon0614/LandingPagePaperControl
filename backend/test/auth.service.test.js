import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ServicioAutenticacion } from "../src/services/auth.service.js";

// Crea el servicio con modelos simulados para probarlo sin depender de MySQL.
function construirServicio(reemplazos = {}) {
  const intentos = [];
  const sesiones = [];
  const modeloSesion = {
    crear: async (sesion) => sesiones.push(sesion),
    buscarActivaPorHash: async () => null,
    rotarToken: async () => false,
    revocarPorHash: async () => {},
    ...reemplazos.modeloSesion,
  };
  const modeloUsuario = {
    buscarParaAutenticacion: async () => null,
    registrarAccesoFallido: async () => ({ intentos_acceso_fallidos: 1, bloqueado_hasta: null }),
    registrarAccesoExitoso: async () => {},
    ...reemplazos.modeloUsuario,
  };

  const servicio = new ServicioAutenticacion({
    modeloUsuario,
    modeloIntentoAcceso: { crear: async (intento) => intentos.push(intento) },
    modeloSesion,
    modeloConfiguracion: { obtenerEnteroPositivo: async (_clave, valorDefecto) => valorDefecto },
    configuracionAutenticacion: {
      secretoAcceso: "a-secure-test-secret-with-more-than-32-characters",
      minutosAcceso: 15,
      diasRenovacion: 7,
    },
  });

  return { servicio, intentos, sesiones };
}

// Cada prueba representa uno de los resultados esperados en la historia HU-35.
test("rechaza credenciales inválidas sin revelar qué dato falló", async () => {
  const { servicio, intentos } = construirServicio();
  await assert.rejects(
    servicio.iniciarSesion({ correo: "nobody@example.com", contrasena: "wrong" }),
    (error) => error.estadoHttp === 401 && error.codigo === "CREDENCIALES_INCORRECTAS",
  );
  assert.equal(intentos.length, 1);
  assert.equal(intentos[0].motivoFallo, "CREDENCIALES_INCORRECTAS");
});

test("no revela una cuenta inactiva cuando la contraseña es incorrecta", async () => {
  const hashContrasena = await bcrypt.hash("correct-contrasena", 4);
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarParaAutenticacion: async () => ({
        id: 7,
        esta_activo: false,
        bloqueado_hasta: null,
        hash_contrasena: hashContrasena,
      }),
    },
  });
  await assert.rejects(
    servicio.iniciarSesion({ correo: "inactive@example.com", contrasena: "wrong-contrasena" }),
    (error) => error.estadoHttp === 401 && error.codigo === "CREDENCIALES_INCORRECTAS",
  );
});

test("informa que la cuenta está inactiva si la contraseña es correcta", async () => {
  const hashContrasena = await bcrypt.hash("correct-contrasena", 4);
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarParaAutenticacion: async () => ({
        id: 7,
        esta_activo: false,
        bloqueado_hasta: null,
        hash_contrasena: hashContrasena,
      }),
    },
  });
  await assert.rejects(
    servicio.iniciarSesion({ correo: "inactive@example.com", contrasena: "correct-contrasena" }),
    (error) => error.estadoHttp === 403 && error.codigo === "CUENTA_INACTIVA",
  );
});

test("no informa cuándo un intento incorrecto alcanza el bloqueo", async () => {
  const hashContrasena = await bcrypt.hash("correct-contrasena", 4);
  const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000);
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarParaAutenticacion: async () => ({
        id: 9,
        correo: "seller@example.com",
        esta_activo: true,
        bloqueado_hasta: null,
        hash_contrasena: hashContrasena,
      }),
      registrarAccesoFallido: async () => ({ intentos_acceso_fallidos: 5, bloqueado_hasta: bloqueadoHasta }),
    },
  });
  await assert.rejects(
    servicio.iniciarSesion({ correo: "seller@example.com", contrasena: "wrong-contrasena" }),
    (error) => error.estadoHttp === 401 && error.codigo === "CREDENCIALES_INCORRECTAS",
  );
});

test("una cuenta bloqueada solo informa el bloqueo con la contraseña correcta", async () => {
  const hashContrasena = await bcrypt.hash("correct-contrasena", 4);
  const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000);
  let accesosFallidos = 0;
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarParaAutenticacion: async () => ({
        id: 9,
        correo: "seller@example.com",
        esta_activo: true,
        bloqueado_hasta: bloqueadoHasta,
        hash_contrasena: hashContrasena,
      }),
      registrarAccesoFallido: async () => {
        accesosFallidos += 1;
      },
    },
  });

  await assert.rejects(
    servicio.iniciarSesion({ correo: "seller@example.com", contrasena: "wrong-contrasena" }),
    (error) => error.estadoHttp === 401 && error.codigo === "CREDENCIALES_INCORRECTAS",
  );
  assert.equal(accesosFallidos, 0);

  await assert.rejects(
    servicio.iniciarSesion({ correo: "seller@example.com", contrasena: "correct-contrasena" }),
    (error) => error.estadoHttp === 423 && error.codigo === "CUENTA_BLOQUEADA",
  );
});

test("crea tokens y sesión cuando las credenciales son correctas", async () => {
  const hashContrasena = await bcrypt.hash("correct-contrasena", 4);
  let idAccesoExitoso;
  const { servicio, intentos, sesiones } = construirServicio({
    modeloUsuario: {
      buscarParaAutenticacion: async () => ({
        id: 12,
        nombres: "Kelly",
        apellidos: "Lopera",
        correo: "seller@example.com",
        rol: "VENDEDOR",
        esta_activo: true,
        bloqueado_hasta: null,
        hash_contrasena: hashContrasena,
      }),
      registrarAccesoExitoso: async (id) => {
        idAccesoExitoso = id;
      },
    },
  });

  const resultado = await servicio.iniciarSesion({
    correo: "SELLER@example.com",
    contrasena: "correct-contrasena",
    direccionIp: "127.0.0.1",
  });

  const contenidoToken = jwt.verify(
    resultado.tokenAcceso,
    "a-secure-test-secret-with-more-than-32-characters",
  );
  assert.equal(contenidoToken.sub, "12");
  assert.equal(contenidoToken.rol, "VENDEDOR");
  assert.equal(resultado.usuario.correo, "seller@example.com");
  assert.equal(idAccesoExitoso, 12);
  assert.equal(sesiones.length, 1);
  assert.equal(sesiones[0].hashTokenRenovacion.length, 64);
  assert.equal(sesiones[0].esPersistente, false);
  assert.equal(intentos.at(-1).fueExitoso, true);
});

test("guarda una sesión persistente cuando el usuario elige recordarme", async () => {
  const hashContrasena = await bcrypt.hash("correct-contrasena", 4);
  const { servicio, sesiones } = construirServicio({
    modeloUsuario: {
      buscarParaAutenticacion: async () => ({
        id: 12,
        nombres: "Kelly",
        apellidos: "Lopera",
        correo: "seller@example.com",
        rol: "VENDEDOR",
        esta_activo: true,
        bloqueado_hasta: null,
        hash_contrasena: hashContrasena,
      }),
    },
  });

  const resultado = await servicio.iniciarSesion({
    correo: "seller@example.com",
    contrasena: "correct-contrasena",
    recordarme: true,
  });

  assert.equal(sesiones[0].esPersistente, true);
  assert.equal(resultado.esPersistente, true);
});

test("renueva el token de acceso y reemplaza el refresh token", async () => {
  const tokenAnterior = "refresh-token-anterior";
  let rotacion;
  const { servicio } = construirServicio({
    modeloSesion: {
      buscarActivaPorHash: async (hash) => {
        assert.equal(hash, createHash("sha256").update(tokenAnterior).digest("hex"));
        return {
          sesion_id: 20,
          usuario_id: 12,
          nombres: "Kelly",
          apellidos: "Lopera",
          correo: "seller@example.com",
          rol: "VENDEDOR",
          expira_en: new Date(Date.now() + 60_000),
          es_persistente: 1,
        };
      },
      rotarToken: async (datos) => {
        rotacion = datos;
        return true;
      },
    },
  });

  const resultado = await servicio.renovarSesion(tokenAnterior);
  const contenidoToken = jwt.verify(
    resultado.tokenAcceso,
    "a-secure-test-secret-with-more-than-32-characters",
  );

  assert.equal(contenidoToken.sub, "12");
  assert.equal(resultado.usuario.rol, "VENDEDOR");
  assert.equal(resultado.esPersistente, true);
  assert.notEqual(resultado.tokenRenovacion, tokenAnterior);
  assert.equal(rotacion.sesionId, 20);
  assert.equal(rotacion.hashTokenNuevo.length, 64);
});

test("rechaza una renovación sin una sesión válida", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.renovarSesion("refresh-invalido"),
    (error) => error.estadoHttp === 401 && error.codigo === "SESION_NO_VALIDA",
  );
});

test("rechaza la renovación si el token ya fue utilizado simultáneamente", async () => {
  const { servicio } = construirServicio({
    modeloSesion: {
      buscarActivaPorHash: async () => ({
        sesion_id: 20,
        usuario_id: 12,
        correo: "seller@example.com",
        rol: "VENDEDOR",
        expira_en: new Date(Date.now() + 60_000),
        es_persistente: false,
      }),
      rotarToken: async () => false,
    },
  });

  await assert.rejects(
    servicio.renovarSesion("refresh-ya-utilizado"),
    (error) => error.estadoHttp === 401 && error.codigo === "SESION_NO_VALIDA",
  );
});

test("revoca mediante hash la sesión que cierra el usuario", async () => {
  const hashesRevocados = [];
  const { servicio } = construirServicio({
    modeloSesion: {
      revocarPorHash: async (hash) => hashesRevocados.push(hash),
    },
  });

  await servicio.cerrarSesion("refresh-a-cerrar");
  assert.deepEqual(hashesRevocados, [
    createHash("sha256").update("refresh-a-cerrar").digest("hex"),
  ]);

  await servicio.cerrarSesion(undefined);
  assert.equal(hashesRevocados.length, 1);
});
