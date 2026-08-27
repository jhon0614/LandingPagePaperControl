import test from "node:test";
import assert from "node:assert/strict";
import { ServicioProducto } from "../src/services/product.service.js";

const fila = {
  id: 5, nombre: "Cuaderno", descripcion: "Norma", sku: "C-1",
  categoria: "Cuadernos", precio_compra: 3000, precio_venta: 4500,
  stock_actual: 8, stock_minimo: 3, esta_activo: 1,
  creado_en: new Date(), actualizado_en: new Date(),
  proveedores: [{ id: 2, nombre: "Distribuciones", telefono: "3001234567" }],
};

test("presenta productos con los nombres que consume el frontend", async () => {
  const servicio = new ServicioProducto({ listar: async () => [fila] });
  const [producto] = await servicio.listar();
  assert.equal(producto.marca, "Norma");
  assert.equal(producto.codigo, "C-1");
  assert.equal(producto.precioDetal, 4500);
  assert.equal(producto.precio, 4500);
  assert.equal(producto.proveedores[0].nombre, "Distribuciones");
});

test("GET de productos excluye inactivos por defecto", async () => {
  let incluir;
  const servicio = new ServicioProducto({ listar: async (valor) => { incluir = valor; return []; } });
  await servicio.listar(undefined);
  assert.equal(incluir, false);
});

test("presenta alertas con stock y proveedores", async () => {
  const servicio = new ServicioProducto({ alertasStock: async () => [fila] });
  const [alerta] = await servicio.alertas();
  assert.equal(alerta.stock, 8);
  assert.equal(alerta.stockMinimo, 3);
  assert.equal(alerta.proveedores.length, 1);
});

test("rechaza movimientos sin cambio de stock", async () => {
  const servicio = new ServicioProducto({ registrarMovimiento: async () => ({ sinCambio: true }) });
  await assert.rejects(
    servicio.registrarMovimiento(5, { tipo: "AJUSTE", cantidad: 8, nota: "Conteo" }, 1),
    (error) => error.codigo === "MOVIMIENTO_SIN_CAMBIO" && error.estadoHttp === 409,
  );
});

test("entrega el usuario responsable al eliminar un producto", async () => {
  let datosRecibidos;
  const servicio = new ServicioProducto({
    eliminar: async (productoId, usuarioId) => {
      datosRecibidos = { productoId, usuarioId };
      return { eliminadoLogicamente: true };
    },
  });

  await servicio.eliminar("5", "2");

  assert.deepEqual(datosRecibidos, { productoId: 5, usuarioId: 2 });
});

test("responde conflicto al eliminar un producto con ventas", async () => {
  const servicio = new ServicioProducto({
    eliminar: async () => ({ tieneVentas: true }),
  });

  await assert.rejects(
    servicio.eliminar("5", "2"),
    (error) =>
      error.estadoHttp === 409 && error.codigo === "PRODUCTO_CON_VENTAS",
  );
});
