import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { ServicioUsuario } from "../src/services/user.service.js";

function filaUsuario(cambios = {}) {
  return {
    id: 2,
    nombres: "Laura",
    apellidos: "Gómez",
    correo: "laura@papercontrol.local",
    esta_activo: 1,
    debe_cambiar_contrasena: 1,
    creado_en: new Date("2026-08-07T00:00:00Z"),
    rol_id: 2,
    rol: "VENDEDOR",
    ...cambios,
  };
}

function construirServicio(reemplazos = {}) {
  const auditorias = [];
  const sesionesRevocadas = [];
  const usuarioBase = filaUsuario();

  const modeloUsuario = {
    listar: async () => [usuarioBase],
    buscarPorId: async () => usuarioBase,
    buscarPorCorreoIncluyendoEliminados: async () => null,
    crear: async () => usuarioBase,
    actualizar: async () => usuarioBase,
    actualizarEstado: async () => usuarioBase,
    eliminarLogicamente: async () => true,
    contarAdministradoresActivosExcepto: async () => 1,
    ...reemplazos.modeloUsuario,
  };

  const modeloRol = {
    buscarPorId: async (id) => ({ id, nombre: "VENDEDOR" }),
    ...reemplazos.modeloRol,
  };

  const modeloSesion = {
    revocarPorUsuario: async (id) => sesionesRevocadas.push(id),
    ...reemplazos.modeloSesion,
  };

  const modeloAuditoria = {
    registrar: async (registro) => auditorias.push(registro),
    ...reemplazos.modeloAuditoria,
  };

  const servicio = new ServicioUsuario(
    modeloUsuario,
    modeloRol,
    modeloSesion,
    modeloAuditoria,
  );

  return { servicio, auditorias, sesionesRevocadas };
}

test("registra la creación sin guardar la contraseña ni su hash", async () => {
  let datosCreacion;
  const { servicio, auditorias } = construirServicio({
    modeloUsuario: {
      crear: async (datos) => {
        datosCreacion = datos;
        return filaUsuario();
      },
    },
  });

  await servicio.crear({
    nombres: "Laura",
    apellidos: "Gómez",
    correo: "LAURA@papercontrol.local",
    contrasenaTemporal: "Temporal#1234",
    rolId: 2,
    administradorId: 1,
    direccionIp: "127.0.0.1",
  });

  assert.equal(
    await bcrypt.compare("Temporal#1234", datosCreacion.hashContrasena),
    true,
  );
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, "CREAR_USUARIO");
  assert.equal("contrasenaTemporal" in auditorias[0].detalles, false);
  assert.equal("hashContrasena" in auditorias[0].detalles, false);
});

test("registra por separado la actualización de datos y el cambio de rol", async () => {
  const actual = filaUsuario();
  const actualizado = filaUsuario({ nombres: "Laura María", rol_id: 3, rol: "DUENO" });
  const { servicio, auditorias } = construirServicio({
    modeloUsuario: {
      buscarPorId: async () => actual,
      actualizar: async () => actualizado,
    },
    modeloRol: {
      buscarPorId: async () => ({ id: 3, nombre: "DUENO" }),
    },
  });

  await servicio.actualizar(
    2,
    { nombres: "Laura María", rolId: 3 },
    1,
    "127.0.0.1",
  );

  assert.deepEqual(
    auditorias.map((registro) => registro.accion),
    ["ACTUALIZAR_USUARIO", "CAMBIAR_ROL_USUARIO"],
  );
});

test("registra la desactivación y revoca las sesiones", async () => {
  const actual = filaUsuario();
  const inactivo = filaUsuario({ esta_activo: 0 });
  const { servicio, auditorias, sesionesRevocadas } = construirServicio({
    modeloUsuario: {
      buscarPorId: async () => actual,
      actualizarEstado: async () => inactivo,
    },
  });

  await servicio.cambiarEstado(2, false, 1, "127.0.0.1");

  assert.deepEqual(sesionesRevocadas, [2]);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, "DESACTIVAR_USUARIO");
  assert.deepEqual(auditorias[0].detalles, {
    estadoAnterior: true,
    estadoNuevo: false,
  });
});

test("rechaza la creación cuando el correo ya está registrado", async () => {
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarPorCorreoIncluyendoEliminados: async () => ({
        id: 8,
        correo: "existente@papercontrol.local",
        eliminado_en: null,
      }),
    },
  });

  await assert.rejects(
    servicio.crear({
      nombres: "Usuario",
      apellidos: "Existente",
      correo: "existente@papercontrol.local",
      contrasenaTemporal: "Temporal#1234",
      rolId: 2,
      administradorId: 1,
    }),
    (error) => error.estadoHttp === 409 && error.codigo === "CORREO_EXISTENTE",
  );
});

test("distingue un correo perteneciente a un usuario eliminado", async () => {
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarPorCorreoIncluyendoEliminados: async () => ({
        id: 8,
        correo: "eliminado@papercontrol.local",
        eliminado_en: new Date(),
      }),
    },
  });

  await assert.rejects(
    servicio.crear({
      nombres: "Usuario",
      apellidos: "Eliminado",
      correo: "eliminado@papercontrol.local",
      contrasenaTemporal: "Temporal#1234",
      rolId: 2,
      administradorId: 1,
    }),
    (error) =>
      error.estadoHttp === 409 &&
      error.codigo === "USUARIO_ELIMINADO_EXISTENTE",
  );
});

test("rechaza la creación con un rol inexistente", async () => {
  const { servicio } = construirServicio({
    modeloRol: { buscarPorId: async () => null },
  });

  await assert.rejects(
    servicio.crear({
      nombres: "Usuario",
      apellidos: "Sin rol",
      correo: "sinrol@papercontrol.local",
      contrasenaTemporal: "Temporal#1234",
      rolId: 999,
      administradorId: 1,
    }),
    (error) => error.estadoHttp === 404 && error.codigo === "ROL_NO_ENCONTRADO",
  );
});

test("impide que un administrador cambie su propio rol", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.actualizar(2, { rolId: 3 }, 2),
    (error) =>
      error.estadoHttp === 403 &&
      error.codigo === "CAMBIO_ROL_PROPIO_PROHIBIDO",
  );
});

test("impide cambiar el rol del último administrador activo", async () => {
  const administrador = filaUsuario({ rol_id: 1, rol: "ADMINISTRADOR" });
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarPorId: async () => administrador,
      contarAdministradoresActivosExcepto: async () => 0,
    },
  });

  await assert.rejects(
    servicio.actualizar(2, { rolId: 3 }, 99),
    (error) => error.estadoHttp === 409 && error.codigo === "ULTIMO_ADMINISTRADOR",
  );
});

test("impide que un administrador se desactive a sí mismo", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.cambiarEstado(2, false, 2),
    (error) =>
      error.estadoHttp === 403 &&
      error.codigo === "AUTO_DESACTIVACION_PROHIBIDA",
  );
});

test("impide desactivar al último administrador activo", async () => {
  const administrador = filaUsuario({ rol_id: 1, rol: "ADMINISTRADOR" });
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarPorId: async () => administrador,
      contarAdministradoresActivosExcepto: async () => 0,
    },
  });

  await assert.rejects(
    servicio.cambiarEstado(2, false, 99),
    (error) => error.estadoHttp === 409 && error.codigo === "ULTIMO_ADMINISTRADOR",
  );
});

test("rechaza un estado que no sea booleano", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.cambiarEstado(2, "false", 1),
    (error) =>
      error.estadoHttp === 400 && error.codigo === "ESTADO_USUARIO_INVALIDO",
  );
});

test("elimina lógicamente un usuario, revoca sesiones y registra auditoría", async () => {
  const eliminados = [];
  const { servicio, auditorias, sesionesRevocadas } = construirServicio({
    modeloUsuario: {
      eliminarLogicamente: async (id) => {
        eliminados.push(id);
        return true;
      },
    },
  });

  await servicio.eliminar(2, 1, "127.0.0.1");

  assert.deepEqual(eliminados, [2]);
  assert.deepEqual(sesionesRevocadas, [2]);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, "ELIMINAR_USUARIO");
  assert.equal(auditorias[0].entidadId, 2);
});

test("impide que un administrador se elimine a sí mismo", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.eliminar(2, 2),
    (error) =>
      error.estadoHttp === 403 &&
      error.codigo === "AUTO_ELIMINACION_PROHIBIDA",
  );
});

test("impide eliminar al último administrador activo", async () => {
  const administrador = filaUsuario({ rol_id: 1, rol: "ADMINISTRADOR" });
  const { servicio } = construirServicio({
    modeloUsuario: {
      buscarPorId: async () => administrador,
      contarAdministradoresActivosExcepto: async () => 0,
    },
  });

  await assert.rejects(
    servicio.eliminar(2, 99),
    (error) => error.estadoHttp === 409 && error.codigo === "ULTIMO_ADMINISTRADOR",
  );
});

test("responde como no encontrado si el usuario ya fue eliminado", async () => {
  const { servicio } = construirServicio({
    modeloUsuario: { buscarPorId: async () => null },
  });

  await assert.rejects(
    servicio.eliminar(999, 1),
    (error) =>
      error.estadoHttp === 404 && error.codigo === "USUARIO_NO_ENCONTRADO",
  );
});
