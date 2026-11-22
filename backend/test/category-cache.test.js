import test from "node:test";
import assert from "node:assert/strict";
import { crearCachePrueba } from "../test-support/cache.js";
import { CacheProveedores } from "../src/services/supplier-cache.service.js";
import { ServicioCategoria } from "../src/services/category.service.js";
import { ServicioProducto } from "../src/services/product.service.js";
import { ControladorCategoria } from "../src/controllers/category.controller.js";


test("categorias: MISS, HIT, REFRESH y JSON existente con cabecera X-Cache", async () => {
  const { cache } = crearCachePrueba("categorias");
  let consultas = 0;
  const servicio = new ServicioCategoria({ listar: async () => [{ id: ++consultas, nombre: "Papel" }] }, cache);
  const controlador = new ControladorCategoria(servicio);
  const res = { set(k, v) { this[k] = v; }, json(body) { this.body = body; } };
  await controlador.listar({ query: {} }, res);
  assert.equal(res["X-Cache"], "MISS");
  await controlador.listar({ query: {} }, res);
  assert.equal(res["X-Cache"], "HIT");
  assert.equal(consultas, 1);
  await controlador.listar({ query: { refrescar: "true" } }, res);
  assert.equal(res["X-Cache"], "REFRESH");
  assert.deepEqual(res.body, { exito: true, datos: { categorias: [{ id: 2, nombre: "Papel" }] } });
  await controlador.listar({ query: {} }, res);
  assert.equal(res["X-Cache"], "HIT");
  assert.equal(consultas, 2);
  await assert.rejects(servicio.listar({ refrescar: "si" }), { codigo: "REFRESCAR_INVALIDO" });
});

test("categorias: modificaciones invalidan sin afectar cache de proveedores", async () => {
  const { cache, cliente } = crearCachePrueba("categorias");
  const proveedores = new CacheProveedores(cliente, { prefijo: "proveedores" });
  proveedores.disponible = true;
  await cliente.set("proveedores:version", "1");
  await proveedores.obtenerOCargar({}, async () => [{ id: 99 }]);
  let filas = [];
  const servicio = new ServicioCategoria({ listar: async () => filas,
    crear: async () => { filas = [{ id: 1, nombre: "Papel" }]; return filas[0]; },
    actualizar: async (_id, nombre) => { filas = [{ id: 1, nombre }]; return filas[0]; },
    eliminar: async () => { filas = []; return true; } }, cache);
  await servicio.listar();
  await servicio.crear({ nombre: "Papel" });
  assert.equal((await servicio.listar())[0].nombre, "Papel");
  await servicio.actualizar(1, { nombre: "Arte" });
  assert.equal((await servicio.listar())[0].nombre, "Arte");
  await servicio.eliminar(1);
  assert.deepEqual(await servicio.listar(), []);
  assert.deepEqual(await proveedores.obtenerOCargar({}, () => assert.fail("No debe invalidar Proveedores")), [{ id: 99 }]);
});

test("categorias sin Redis responden BYPASS y los fallos de escritura no invalidan", async () => {
  let estado;
  const servicio = new ServicioCategoria({ listar: async () => [] });
  assert.deepEqual(await servicio.listar({ refrescar: "true" }, (s) => { estado = s; }), []);
  assert.equal(estado, "BYPASS");
  const fallo = new ServicioCategoria({ crear: async () => { throw Object.assign(new Error(), { code: "ER_DUP_ENTRY" }); } },
    { invalidar: async () => assert.fail("No debe invalidar si MySQL falla") });
  await assert.rejects(fallo.crear({ nombre: "Papel" }), { codigo: "CATEGORIA_EXISTENTE" });
});

test("crear o editar productos invalida categorias creadas implicitamente", async () => {
  let invalidaciones = 0;
  const servicio = new ServicioProducto({ crear: async () => 1, actualizar: async () => true,
    buscarPorId: async () => ({ id: 1, nombre: "Cuaderno", proveedores: [] }) },
    { invalidar: async () => { invalidaciones++; } });
  await servicio.crear({}, 1);
  assert.equal(invalidaciones, 1, "await servicio.crear debe invalidar una sola vez");
  await servicio.actualizar(1, {}, 1);
  assert.equal(invalidaciones, 2);
});
