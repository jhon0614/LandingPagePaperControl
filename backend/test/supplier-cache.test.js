import test from "node:test";
import assert from "node:assert/strict";
import { CacheProveedores } from "../src/services/supplier-cache.service.js";
import { ServicioProveedor } from "../src/services/supplier.service.js";

function entorno() {
  let ahora = 0;
  const entradas = new Map([["test:version", { valor: "inicial", vence: Infinity }]]);
  const cliente = {
    isReady: true, isOpen: true,
    async get(clave) { const e = entradas.get(clave); return e && e.vence > ahora ? e.valor : null; },
    async set(clave, valor, opciones) { entradas.set(clave, { valor, vence: opciones?.EX ? ahora + opciones.EX * 1000 : Infinity }); },
    destroy() { this.isReady = this.isOpen = false; },
  };
  const cache = new CacheProveedores(cliente, { ttl: 30, timeout: 10, prefijo: "test" });
  cache.disponible = true;
  let consultas = 0;
  const cargar = async () => [{ id: ++consultas }];
  return { cache, cliente, entradas, cargar, avanzar: (ms) => { ahora += ms; }, consultas: () => consultas };
}

test("cache devuelve MISS/HIT, distingue paginas y busquedas y vence", async () => {
  const e = entorno();
  const estados = [];
  const filtros = { pagina: 1, limite: 50, buscar: "papel" };
  const leer = (f = filtros) => e.cache.obtenerOCargar(f, e.cargar, (s) => estados.push(s));
  assert.deepEqual(await leer(), [{ id: 1 }]);
  assert.deepEqual(await leer(), [{ id: 1 }]);
  assert.deepEqual(estados, ["MISS", "HIT"]);
  await leer({ ...filtros, pagina: 2 });
  await leer({ ...filtros, buscar: "libro" });
  assert.equal(e.consultas(), 3);
  e.avanzar(30001);
  assert.deepEqual(await leer(), [{ id: 4 }]);
});

test("invalidar todas las variantes no borra otros datos ni reutiliza lecturas concurrentes", async () => {
  const e = entorno();
  let continuar;
  const pendiente = e.cache.obtenerOCargar({}, () => new Promise((resolve) => { continuar = resolve; }));
  while (!continuar) await new Promise((resolve) => setImmediate(resolve));
  await e.cache.invalidar();
  continuar([{ id: "anterior" }]);
  await pendiente;
  assert.deepEqual(await e.cache.obtenerOCargar({}, e.cargar), [{ id: 1 }]);
});

test("Redis caido o lento no impide consultar MySQL; errores SQL se propagan", async () => {
  const e = entorno();
  e.cliente.get = async () => { throw new Error("Redis caido"); };
  let estado;
  assert.deepEqual(await e.cache.obtenerOCargar({}, e.cargar, (s) => { estado = s; }), [{ id: 1 }]);
  assert.equal(estado, "BYPASS");
  await assert.rejects(e.cache.obtenerOCargar({}, async () => { throw new Error("SQL"); }), /SQL/);
  const lento = entorno();
  lento.cliente.get = () => new Promise(() => {});
  assert.deepEqual(await lento.cache.obtenerOCargar({}, lento.cargar), [{ id: 1 }]);
  assert.equal(lento.cache.disponible, false);
});

test("crear, actualizar y eliminar invalidan cache; filtros se validan incluso con cache", async () => {
  let invalidaciones = 0;
  const modelo = { crear: async () => 7, actualizar: async () => true, eliminar: async () => true,
    buscarPorId: async () => ({ id: 7, nombre: "Papel", esta_activo: 1 }) };
  const servicio = new ServicioProveedor(modelo, { invalidar: async () => { invalidaciones++; } });
  await servicio.crear({ nombre: "Papel" });
  await servicio.actualizar(7, { nombre: "Papel" });
  await servicio.eliminar(7);
  assert.equal(invalidaciones, 3);
  await assert.rejects(servicio.listar({ pagina: 0 }), { codigo: "PAGINACION_INVALIDA" });
  await assert.rejects(servicio.listar({ buscar: "x".repeat(101) }), { codigo: "TERMINO_BUSQUEDA_INVALIDO" });
});

test("refrescar consulta MySQL aunque exista HIT y renueva la cache normal", async () => {
  const e = entorno();
  const estados = [];
  const leer = (refrescar = false) => e.cache.obtenerOCargar({}, e.cargar, (s) => estados.push(s), { refrescar });
  await leer(); await leer();
  assert.deepEqual(await leer(true), [{ id: 2 }]);
  assert.deepEqual(await leer(), [{ id: 2 }]);
  assert.deepEqual(estados, ["MISS", "HIT", "REFRESH", "HIT"]);
  assert.equal(e.consultas(), 2);
});

test("servicio conecta refrescar sin incorporarlo a la clave ni a los filtros SQL", async () => {
  let opciones;
  const servicio = new ServicioProveedor({}, { obtenerOCargar: async (consulta, _cargar, _informar, config) => {
    assert.deepEqual(consulta, { pagina: 2, limite: 50, buscar: "papel", incluirInactivos: false });
    opciones = config;
    return [];
  } });
  await servicio.listar({ pagina: "2", limite: "50", buscar: "papel", refrescar: "true" });
  assert.equal(opciones.refrescar, true);
  await servicio.listar({ pagina: "2", limite: "50", buscar: "papel", refrescar: "false" });
  assert.equal(opciones.refrescar, false);
  await assert.rejects(servicio.listar({ refrescar: "si" }), { codigo: "REFRESCAR_INVALIDO" });
});

test("refrescar sigue respondiendo desde MySQL cuando Redis no esta disponible", async () => {
  const e = entorno();
  e.cache.disponible = false;
  let estado;
  assert.deepEqual(await e.cache.obtenerOCargar({}, e.cargar, (s) => { estado = s; }, { refrescar: true }), [{ id: 1 }]);
  assert.equal(estado, "BYPASS");
});
