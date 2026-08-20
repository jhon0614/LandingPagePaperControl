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
    creado_en: new Date("2026-08-19T00:00:00Z"),
    ...cambios,
  };
}

function construirServicio(reemplazos = {}) {
  const auditorias = [];
  const modeloCliente = {
    buscarPorId: async () => filaCliente(),
    buscar: async () => [filaCliente()],
    actualizarEstado: async (_id, estaActivo) =>
      filaCliente({ esta_activo: estaActivo ? 1 : 0 }),
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
  const { servicio } = construirServicio({
    buscar: async (termino, limite) => {
      busquedaRecibida = termino;
      limiteRecibido = limite;
      return [filaCliente()];
    },
  });

  const clientes = await servicio.buscar("  Laura  ");

  assert.equal(busquedaRecibida, "Laura");
  assert.equal(limiteRecibido, 20);
  assert.equal(clientes.length, 1);
  assert.equal(clientes[0].documento, "1001234567");
  assert.equal(clientes[0].estaActivo, true);
  assert.equal("numero_documento" in clientes[0], false);
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
