import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ServicioAutenticacion } from "../src/services/auth.service.js";

// Crea el servicio con modelos simulados para probarlo sin depender de MySQL.
function construirServicio(reemplazos = {}) {
  const intentos = [];
  const sesiones = [];
  const modeloUsuario = {
    buscarParaAutenticacion: async () => null,
    registrarAccesoFallido: async () => ({ intentos_acceso_fallidos: 1, bloqueado_hasta: null }),
    registrarAccesoExitoso: async () => {},
    ...reemplazos.modeloUsuario,
  };

  const servicio = new ServicioAutenticacion({
    modeloUsuario,
    modeloIntentoAcceso: { crear: async (intento) => intentos.push(intento) },
    modeloSesion: { crear: async (sesion) => sesiones.push(sesion) },
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

test("rechaza una cuenta inactiva", async () => {
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarParaAutenticacion: async () => ({ id: 7, esta_activo: false }),
    },
  });
  await assert.rejects(
    servicio.iniciarSesion({ correo: "inactive@example.com", contrasena: "secret" }),
    (error) => error.estadoHttp === 403 && error.codigo === "CUENTA_INACTIVA",
  );
});

test("bloquea al alcanzar el máximo de intentos", async () => {
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
  assert.equal(intentos.at(-1).fueExitoso, true);
});
