import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { ServicioContrasena } from "../src/services/password.service.js";

// Construye dependencias simuladas para probar las reglas sin MySQL ni Gmail.
function construirServicio(reemplazos = {}) {
  const correos = [];
  const solicitudes = [];
  const auditorias = [];
  const modeloUsuario = {
    buscarContrasenaPorId: async () => null,
    buscarActivoPorCorreo: async () => null,
    buscarPorId: async () => null,
    actualizarContrasenaYRevocarSesiones: async () => true,
    desbloquear: async () => true,
    ...reemplazos.modeloUsuario,
  };
  const modeloRestablecimiento = {
    crear: async (datos) => solicitudes.push(datos),
    consumirYActualizarContrasena: async () => null,
    ...reemplazos.modeloRestablecimiento,
  };
  const servicioCorreo = {
    enviarRestablecimiento: async (correo, token) => {
      correos.push({ correo, token });
    },
    ...reemplazos.servicioCorreo,
  };
  const modeloAuditoria = {
    registrar: async (datos) => auditorias.push(datos),
    ...reemplazos.modeloAuditoria,
  };

  const servicio = new ServicioContrasena({
    modeloUsuario,
    modeloRestablecimiento,
    servicioCorreo,
    modeloAuditoria,
    configuracion: { tiempoTokenMs: 30 * 60 * 1000 },
  });

  return { servicio, correos, solicitudes, auditorias };
}

// Cada prueba cubre una regla de seguridad observable desde el servicio.
test("cambia la contraseña y entrega al modelo un hash, no el texto original", async () => {
  const hashActual = await bcrypt.hash("Actual#123456", 4);
  let datosActualizacion;
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarContrasenaPorId: async () => ({ id: 2, hash_contrasena: hashActual }),
      actualizarContrasenaYRevocarSesiones: async (id, hash) => {
        datosActualizacion = { id, hash };
        return true;
      },
    },
  });

  await servicio.cambiarContrasena({
    usuarioId: 2,
    contrasenaActual: "Actual#123456",
    contrasenaNueva: "Nueva#1234567",
  });

  assert.equal(datosActualizacion.id, 2);
  assert.notEqual(datosActualizacion.hash, "Nueva#1234567");
  assert.equal(await bcrypt.compare("Nueva#1234567", datosActualizacion.hash), true);
});

test("rechaza una contraseña actual incorrecta", async () => {
  const hashActual = await bcrypt.hash("Actual#123456", 4);
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarContrasenaPorId: async () => ({ id: 2, hash_contrasena: hashActual }),
    },
  });

  await assert.rejects(
    servicio.cambiarContrasena({
      usuarioId: 2,
      contrasenaActual: "Incorrecta#123",
      contrasenaNueva: "Nueva#1234567",
    }),
    (error) => error.estadoHttp === 400 && error.codigo === "CONTRASENA_ACTUAL_INCORRECTA",
  );
});

test("impide reutilizar la contraseña actual", async () => {
  const hashActual = await bcrypt.hash("Actual#123456", 4);
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarContrasenaPorId: async () => ({ id: 2, hash_contrasena: hashActual }),
    },
  });

  await assert.rejects(
    servicio.cambiarContrasena({
      usuarioId: 2,
      contrasenaActual: "Actual#123456",
      contrasenaNueva: "Actual#123456",
    }),
    (error) => error.estadoHttp === 400 && error.codigo === "CONTRASENA_SIN_CAMBIOS",
  );
});

test("la recuperación pública no revela si el correo existe", async () => {
  const desconocido = construirServicio();
  const conocido = construirServicio({
    modeloUsuario: {
      buscarActivoPorCorreo: async () => ({
        id: 2,
        correo: "user@papercontrol.local",
      }),
    },
  });

  const respuestaDesconocido = await desconocido.servicio.solicitarRestablecimiento({
    correo: "UNKNOWN@example.com",
  });
  const respuestaConocido = await conocido.servicio.solicitarRestablecimiento({
    correo: "USER@papercontrol.local",
  });

  assert.deepEqual(respuestaDesconocido, respuestaConocido);
  assert.equal(desconocido.correos.length, 0);
  assert.equal(conocido.correos.length, 1);
  assert.equal(conocido.solicitudes[0].hashToken.length, 64);
  assert.notEqual(conocido.solicitudes[0].hashToken, conocido.correos[0].token);
});

test("restablece usando el hash del token y nunca el token original", async () => {
  const token = "token-original-muy-largo-para-restablecer";
  let datosConsumo;
  const { servicio } = construirServicio({
    modeloRestablecimiento: {
      consumirYActualizarContrasena: async (datos) => {
        datosConsumo = datos;
        return 2;
      },
    },
  });

  await servicio.restablecerContrasena({
    token,
    contrasenaNueva: "Nueva#1234567",
  });

  assert.equal(
    datosConsumo.hashToken,
    createHash("sha256").update(token).digest("hex"),
  );
  assert.equal(await bcrypt.compare("Nueva#1234567", datosConsumo.hashContrasena), true);
});

test("rechaza un token vencido, utilizado o inexistente", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.restablecerContrasena({
      token: "token-invalido-muy-largo-para-restablecer",
      contrasenaNueva: "Nueva#1234567",
    }),
    (error) => error.estadoHttp === 400 && error.codigo === "TOKEN_RESTABLECIMIENTO_INVALIDO",
  );
});

test("el restablecimiento administrativo envía correo y registra auditoría", async () => {
  const { servicio, correos, auditorias } = construirServicio({
    modeloUsuario: {
      buscarPorId: async () => ({ id: 3, correo: "user@papercontrol.local" }),
    },
  });

  await servicio.solicitarRestablecimientoAdministrativo({
    usuarioId: "3",
    responsableId: 1,
    direccionIp: "127.0.0.1",
  });

  assert.equal(correos.length, 1);
  assert.equal(auditorias[0].usuarioId, 1);
  assert.equal(auditorias[0].entidadId, 3);
  assert.equal(auditorias[0].accion, "SOLICITAR_RESTABLECIMIENTO_USUARIO");
});

test("desbloquea al usuario y registra quién realizó la acción", async () => {
  let idDesbloqueado;
  const { servicio, auditorias } = construirServicio({
    modeloUsuario: {
      buscarPorId: async () => ({ id: 3, correo: "user@papercontrol.local" }),
      desbloquear: async (id) => {
        idDesbloqueado = id;
        return true;
      },
    },
  });

  await servicio.desbloquearUsuario({
    usuarioId: "3",
    responsableId: 1,
    direccionIp: "127.0.0.1",
  });

  assert.equal(idDesbloqueado, 3);
  assert.equal(auditorias[0].accion, "DESBLOQUEAR_USUARIO");
  assert.equal(auditorias[0].entidadId, 3);
});

test("rechaza un ID inválido en acciones administrativas", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.desbloquearUsuario({ usuarioId: "abc", responsableId: 1 }),
    (error) => error.estadoHttp === 400 && error.codigo === "ID_USUARIO_INVALIDO",
  );
});
