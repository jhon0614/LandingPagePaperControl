import test from "node:test";
import assert from "node:assert/strict";
import { crearCachePrueba } from "../test-support/cache.js";
import { ServicioProducto } from "../src/services/product.service.js";
import { ControladorProducto } from "../src/controllers/product.controller.js";
import { ServicioCategoria } from "../src/services/category.service.js";
import { ServicioProveedor } from "../src/services/supplier.service.js";
import { ServicioVenta } from "../src/services/sale.service.js";

const fila = { id: 1, nombre: "Cuaderno", sku: "C1", stock_actual: 10, esta_activo: 1, proveedores: [] };

test("productos: cache distingue paginas, categoria, busqueda e inactivos; REFRESH actualiza JSON", async () => {
  let consultas = 0;
  const servicio = new ServicioProducto({ listar: async () => [{ ...fila, stock_actual: ++consultas }] }, undefined, crearCachePrueba("productos", { ttl: 10 }).cache);
  const controlador = new ControladorProducto(servicio);
  const res = { set(k, v) { this[k] = v; }, json(body) { this.body = body; } };
  const req = { query: { pagina: "1", limite: "50" } };
  const next = (error) => { throw error; };
  await controlador.listar(req, res, next);
  assert.equal(res["X-Cache"], "MISS");
  await controlador.listar(req, res, next);
  assert.equal(res["X-Cache"], "HIT");
  assert.equal(consultas, 1);
  assert.equal(res.body.datos.productos[0].stock, 1);
  assert.deepEqual(res.body.datos.paginacion, { pagina: 1, limite: 50, hayMas: false });
  for (const variante of [{ pagina: "2" }, { categoriaId: "2" }, { buscar: "papel" }, { incluirInactivos: "true" }, { limite: "10" }])
    await controlador.listar({ query: { ...req.query, ...variante } }, res, next);
  assert.equal(consultas, 6);
  await controlador.listar({ query: { ...req.query, refrescar: "true" } }, res, next);
  assert.equal(res["X-Cache"], "REFRESH");
  assert.equal(res.body.datos.productos[0].stock, 7);
  await controlador.listar(req, res, next);
  assert.equal(res["X-Cache"], "HIT");
  assert.equal(consultas, 7);
  await assert.rejects(servicio.listar(undefined, undefined, { refrescar: "si" }), { codigo: "REFRESCAR_INVALIDO" });
  await assert.rejects(servicio.listar(undefined, undefined, { pagina: "0" }), { codigo: "PAGINACION_INVALIDA" });
  await assert.rejects(servicio.listar(undefined, "abc"), { codigo: "ID_CATEGORIA_INVALIDO" });
  await assert.rejects(servicio.listar(undefined, undefined, { buscar: "x".repeat(101) }), { codigo: "TERMINO_BUSQUEDA_INVALIDO" });
});

test("productos: cada escritura invalida una vez; detalle no usa cache", async () => {
  let invalidaciones = 0;
  let detalles = 0;
  const servicio = new ServicioProducto({
    crear: async () => 1, actualizar: async () => true, cambiarEstado: async () => true,
    eliminar: async () => ({ eliminado: true }), registrarMovimiento: async () => 3,
    listarMovimientos: async () => [{ id: 3 }],
    buscarPorId: async () => { detalles++; return fila; },
    asociarProveedor: async () => true, quitarProveedor: async () => true, listarProveedores: async () => [],
  }, undefined, { invalidar: async () => { invalidaciones++; } });
  await servicio.crear({}, 1);
  assert.equal(invalidaciones, 1, "await servicio.crear debe invalidar una sola vez");
  await servicio.actualizar(1, {}, 1);
  assert.equal(invalidaciones, 2, "await servicio.actualizar debe invalidar una sola vez");
  await servicio.cambiarEstado(1, false);
  assert.equal(invalidaciones, 3, "await servicio.cambiarEstado debe invalidar una sola vez");
  await servicio.eliminar(1, 1);
  assert.equal(invalidaciones, 4, "await servicio.eliminar debe invalidar una sola vez");
  await servicio.registrarMovimiento(1, { cantidad: 1 }, 1);
  assert.equal(invalidaciones, 5, "await servicio.registrarMovimiento debe invalidar una sola vez");
  await servicio.asociarProveedor(1, 2);
  assert.equal(invalidaciones, 6, "await servicio.asociarProveedor debe invalidar una sola vez");
  await servicio.quitarProveedor(1, 2);
  assert.equal(invalidaciones, 7);
  const anteriores = detalles;
  await servicio.obtener(1); await servicio.obtener(1);
  assert.equal(detalles, anteriores + 2);
});

test("productos: cambiar categoria o proveedor invalida el nombre/contacto del listado", async () => {
  let invalidaciones = 0;
  const cache = { invalidar: async () => { invalidaciones++; } };
  const categorias = new ServicioCategoria({ actualizar: async () => ({ id: 2 }), eliminar: async () => true }, undefined, cache);
  const proveedores = new ServicioProveedor({ actualizar: async () => true, eliminar: async () => true,
    buscarPorId: async () => ({ id: 2 }) }, undefined, cache);
  await categorias.actualizar(2, { nombre: "Arte" });
  assert.equal(invalidaciones, 1, "await categorias.actualizar debe invalidar una sola vez");
  await categorias.eliminar(2);
  assert.equal(invalidaciones, 2, "await categorias.eliminar debe invalidar una sola vez");
  await proveedores.actualizar(2, { nombre: "Papel" });
  assert.equal(invalidaciones, 3, "await proveedores.actualizar debe invalidar una sola vez");
  await proveedores.eliminar(2);
  assert.equal(invalidaciones, 4);
});

test("ventas: crear y anular invalidan una vez al tener exito; rechazos no invalidan", async () => {
  let invalidaciones = 0;
  const cache = { invalidar: async () => { invalidaciones++; } };
  const comprobante = { venta: { id: 1, vendido_por: 1 }, productos: [], pagos: [] };
  const modelo = { crear: async () => ({ id: 1 }), anular: async () => ({}), comprobante: async () => comprobante };
  const servicio = new ServicioVenta(modelo, cache);
  await servicio.crear({ productos: [{ productoId: 1, cantidad: 1 }], metodoPago: "EFECTIVO" }, 1);
  assert.equal(invalidaciones, 1, "await servicio.crear debe invalidar una sola vez");
  await servicio.anular(1, {}, { id: 1, rol: "ADMINISTRADOR" });
  assert.equal(invalidaciones, 2);
  modelo.crear = async () => ({ error: "STOCK_INSUFICIENTE" });
  await assert.rejects(servicio.crear({ productos: [], metodoPago: "EFECTIVO" }, 1), { codigo: "STOCK_INSUFICIENTE" });
  modelo.anular = async () => ({ error: "TURNO_CERRADO" });
  await assert.rejects(servicio.anular(1, {}, { id: 1, rol: "ADMINISTRADOR" }), { codigo: "TURNO_CAJA_CERRADO" });
  assert.equal(invalidaciones, 2);
});

test("productos: rechazo de movimiento o eliminacion no invalida; sin Redis conserva BYPASS", async () => {
  const cache = { invalidar: async () => assert.fail("No debe invalidar una escritura rechazada") };
  const servicio = new ServicioProducto({ registrarMovimiento: async () => ({ sinCambio: true }),
    eliminar: async () => ({ tieneVentas: true }) }, undefined, cache);
  await assert.rejects(servicio.registrarMovimiento(1, {}, 1), { codigo: "MOVIMIENTO_SIN_CAMBIO" });
  await assert.rejects(servicio.eliminar(1, 1), { codigo: "PRODUCTO_CON_VENTAS" });
  let estado;
  const directo = new ServicioProducto({ listar: async () => [fila] });
  assert.equal((await directo.listar(undefined, undefined, { refrescar: "true" }, (s) => { estado = s; }))[0].stock, 10);
  assert.equal(estado, "BYPASS");
});
