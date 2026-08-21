import test from "node:test";
import assert from "node:assert/strict";
import { ServicioCliente } from "../src/services/client.service.js";

function filaCliente(cambios = {}) {
  return {
    id: 7,
    tipo_documento: "CC",
    numero_documento: "1001234567",
    nombres: "Laura",
    apellidos: "Gómez",
    correo: "laura@example.com",
    telefono: "3001234567",
    direccion: null,
    esta_activo: 1,
    cantidad_compras: 0,
    total_comprado: 0,
    ultima_compra: null,
    creado_en: new Date("2026-08-19T00:00:00Z"),
    ...cambios,
  };
}

function construirServicio(reemplazos = {}) {
  const auditorias = [];
  const modeloCliente = {
    buscarPorId: async () => filaCliente(),
    buscar: async () => [filaCliente()],
    buscarOtroPorDocumento: async () => null,
    actualizar: async (_id, datos) =>
      filaCliente({
        tipo_documento: datos.tipoDocumento,
        numero_documento: datos.numeroDocumento,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        correo: datos.correo,
        telefono: datos.telefono,
        direccion: datos.direccion,
      }),
    actualizarEstado: async (_id, estaActivo) =>
      filaCliente({ esta_activo: estaActivo ? 1 : 0 }),
    eliminarLogicamente: async () => true,
    ...reemplazos,
  };
  const modeloAuditoria = {
    registrar: async (registro) => auditorias.push(registro),
  };

  return {
    servicio: new ServicioCliente(modeloCliente, modeloAuditoria),
    auditorias,
  };
}

test("un administrador puede desactivar un cliente", async () => {
  const { servicio, auditorias } = construirServicio();

  const cliente = await servicio.cambiarEstado(7, false, 1, "127.0.0.1");

  assert.equal(cliente.estaActivo, false);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, "DESACTIVAR_CLIENTE");
  assert.equal(auditorias[0].usuarioId, 1);
});

test("rechaza un ID de cliente inválido", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.cambiarEstado("abc", false, 1, "127.0.0.1"),
    (error) => error.codigo === "ID_CLIENTE_INVALIDO" && error.estadoHttp === 400,
  );
});

test("responde como no encontrado si el cliente no existe", async () => {
  const { servicio } = construirServicio({ buscarPorId: async () => null });

  await assert.rejects(
    servicio.cambiarEstado(99, false, 1, "127.0.0.1"),
    (error) => error.codigo === "CLIENTE_NO_ENCONTRADO" && error.estadoHttp === 404,
  );
});

test("no duplica la auditoría cuando el estado no cambia", async () => {
  const { servicio, auditorias } = construirServicio();

  const cliente = await servicio.cambiarEstado(7, true, 1, "127.0.0.1");

  assert.equal(cliente.estaActivo, true);
  assert.equal(auditorias.length, 0);
});

test("busca clientes y presenta los campos para la API", async () => {
  let busquedaRecibida;
  let limiteRecibido;
  let incluirInactivosRecibido;
  const { servicio } = construirServicio({
    buscar: async (termino, limite, incluirInactivos) => {
      busquedaRecibida = termino;
      limiteRecibido = limite;
      incluirInactivosRecibido = incluirInactivos;
      return [filaCliente()];
    },
  });

  const clientes = await servicio.buscar("  Laura  ");

  assert.equal(busquedaRecibida, "Laura");
  assert.equal(limiteRecibido, 100);
  assert.equal(incluirInactivosRecibido, false);
  assert.equal(clientes.length, 1);
  assert.equal(clientes[0].documento, "1001234567");
  assert.equal(clientes[0].estaActivo, true);
  assert.equal("numero_documento" in clientes[0], false);
});

test("identifica como frecuente al cliente con tres ventas confirmadas", async () => {
  const { servicio } = construirServicio({
    buscar: async () => [
      filaCliente({
        cantidad_compras: 3,
        total_comprado: "125000.00",
        ultima_compra: new Date("2026-08-20T15:00:00Z"),
      }),
    ],
  });

  const [cliente] = await servicio.buscar(undefined, "true");

  assert.equal(cliente.esFrecuente, true);
  assert.equal(cliente.cantidadCompras, 3);
  assert.equal(cliente.totalComprado, 125000);
  assert.equal(cliente.ultimaCompra.toISOString(), "2026-08-20T15:00:00.000Z");
});

test("permite incluir clientes inactivos cuando la pantalla lo solicita", async () => {
  let incluirInactivosRecibido;
  const { servicio } = construirServicio({
    buscar: async (_termino, _limite, incluirInactivos) => {
      incluirInactivosRecibido = incluirInactivos;
      return [];
    },
  });

  await servicio.buscar(undefined, "true");

  assert.equal(incluirInactivosRecibido, true);
});

test("permite buscar sin enviar un término", async () => {
  let busquedaRecibida;
  const { servicio } = construirServicio({
    buscar: async (termino) => {
      busquedaRecibida = termino;
      return [];
    },
  });

  const clientes = await servicio.buscar(undefined);

  assert.equal(busquedaRecibida, "");
  assert.deepEqual(clientes, []);
});

test("rechaza términos de búsqueda mayores de 100 caracteres", async () => {
  const { servicio } = construirServicio();

  await assert.rejects(
    servicio.buscar("a".repeat(101)),
    (error) =>
      error.codigo === "TERMINO_BUSQUEDA_INVALIDO" &&
      error.estadoHttp === 400,
  );
});

test("un administrador puede actualizar los datos de un cliente", async () => {
  let datosActualizacion;
  const { servicio, auditorias } = construirServicio({
    actualizar: async (_id, datos) => {
      datosActualizacion = datos;
      return filaCliente({ telefono: datos.telefono });
    },
  });

  const cliente = await servicio.actualizar(
    7,
    { telefono: "3101234567" },
    1,
    "127.0.0.1",
  );

  assert.equal(cliente.telefono, "3101234567");
  assert.equal(datosActualizacion.numeroDocumento, "1001234567");
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].usuarioId, 1);
  assert.equal(auditorias[0].accion, "ACTUALIZAR_CLIENTE");
});

test("rechaza un documento perteneciente a otro cliente", async () => {
  const { servicio } = construirServicio({
    buscarOtroPorDocumento: async () => ({ id: 8, eliminado_en: null }),
  });

  await assert.rejects(
    servicio.actualizar(7, { documento: "1009999999" }, 1, "127.0.0.1"),
    (error) =>
      error.codigo === "CLIENTE_DOCUMENTO_EXISTENTE" &&
      error.estadoHttp === 409,
  );
});

test("no actualiza ni audita cuando los datos no cambian", async () => {
  let actualizaciones = 0;
  const { servicio, auditorias } = construirServicio({
    actualizar: async () => {
      actualizaciones += 1;
      return filaCliente();
    },
  });

  const cliente = await servicio.actualizar(
    7,
    { correo: "laura@example.com" },
    1,
    "127.0.0.1",
  );

  assert.equal(cliente.correo, "laura@example.com");
  assert.equal(actualizaciones, 0);
  assert.equal(auditorias.length, 0);
});

test("consulta un cliente por ID y presenta el contrato público", async () => {
  const { servicio } = construirServicio();

  const cliente = await servicio.buscarPorId(7);

  assert.equal(cliente.id, 7);
  assert.equal(cliente.documento, "1001234567");
  assert.equal("numero_documento" in cliente, false);
});

test("elimina lógicamente un cliente y registra auditoría", async () => {
  let clienteEliminado;
  const { servicio, auditorias } = construirServicio({
    eliminarLogicamente: async (id) => {
      clienteEliminado = id;
      return true;
    },
  });

  await servicio.eliminar(7, 1, "127.0.0.1");

  assert.equal(clienteEliminado, 7);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, "ELIMINAR_CLIENTE");
  assert.equal(auditorias[0].usuarioId, 1);
});
