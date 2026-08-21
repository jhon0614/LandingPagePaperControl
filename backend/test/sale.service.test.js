import test from "node:test";
import assert from "node:assert/strict";
import { ServicioVenta } from "../src/services/sale.service.js";

const filaListado = {
  id: 3, numero_venta: "V-00000003", vendido_por: 7,
  subtotal: 10000, tipo_descuento: "PORCENTAJE", valor_descuento: 10,
  monto_descuento: 1000, monto_total: 9000, estado: "CONFIRMADA",
  confirmado_en: new Date("2026-08-20T15:00:00Z"), vendedor: "Ana Pérez",
  metodos_pago: "EFECTIVO", productos: "Cuaderno x2 | Lápiz x1",
};

test("GET de ventas entrega únicamente las del usuario al modelo", async () => {
  let usuarioRecibido;
  const servicio = new ServicioVenta({
    buscarPorVendedor: async (id) => { usuarioRecibido = id; return [filaListado]; },
  });
  const ventas = await servicio.propias(7);
  assert.equal(usuarioRecibido, 7);
  assert.equal(ventas[0].total, 9000);
  assert.equal(ventas[0].monto_total, 9000);
  assert.equal(ventas[0].numero_venta, "V-00000003");
  assert.equal(ventas[0].confirmado_en, filaListado.confirmado_en);
  assert.equal(ventas[0].metodos_pago, "EFECTIVO");
  assert.equal(ventas[0].productos, "Cuaderno x2 | Lápiz x1");
  assert.deepEqual(ventas[0].productosDetalle, ["Cuaderno x2", "Lápiz x1"]);
});

test("lista métodos de pago con el contrato público", async () => {
  const servicio = new ServicioVenta({
    listarMetodosPago: async () => [
      { id: 1, codigo: "EFECTIVO", nombre: "Efectivo", esta_activo: 1 },
      { id: 2, codigo: "TARJETA", nombre: "Tarjeta", esta_activo: 0 },
    ],
  });
  assert.deepEqual(await servicio.metodosPago(), [
    { id: 1, codigo: "EFECTIVO", nombre: "Efectivo", activo: true },
    { id: 2, codigo: "TARJETA", nombre: "Tarjeta", activo: false },
  ]);
});

test("actualiza el estado de un método de pago", async () => {
  let datosRecibidos;
  const servicio = new ServicioVenta({
    actualizarMetodoPago: async (id, estaActivo) => {
      datosRecibidos = { id, estaActivo };
      return {
        id,
        codigo: "TRANSFERENCIA",
        nombre: "Transferencia",
        esta_activo: estaActivo,
      };
    },
  });
  const metodo = await servicio.actualizarMetodoPago("3", false);
  assert.deepEqual(datosRecibidos, { id: 3, estaActivo: false });
  assert.equal(metodo.activo, false);
});

test("informa cuando el método de pago no existe", async () => {
  const servicio = new ServicioVenta({
    actualizarMetodoPago: async () => null,
  });
  await assert.rejects(
    servicio.actualizarMetodoPago(99, true),
    (error) =>
      error.codigo === "METODO_PAGO_NO_ENCONTRADO" &&
      error.estadoHttp === 404,
  );
});

test("rechaza un descuento porcentual superior al 100", async () => {
  const servicio = new ServicioVenta({ crear: async () => { throw new Error("no debe ejecutarse"); } });
  await assert.rejects(
    servicio.crear({ tipoDescuento: "PORCENTAJE", valorDescuento: 101 }, 7),
    (error) => error.codigo === "DESCUENTO_INVALIDO" && error.estadoHttp === 400,
  );
});

test("valida filtros y orden del historial", async () => {
  const servicio = new ServicioVenta({ historial: async () => [] });
  await assert.rejects(servicio.historial({ fechaInicio: "20/08/2026" }),
    (error) => error.codigo === "RANGO_FECHAS_INVALIDO");
  await assert.rejects(servicio.historial({ orden: "subtotal" }),
    (error) => error.codigo === "ORDEN_INVALIDO");
});

test("un vendedor no puede consultar el comprobante de otro vendedor", async () => {
  const servicio = new ServicioVenta({
    comprobante: async () => ({ venta: { vendido_por: 9 }, productos: [], pagos: [] }),
  });
  await assert.rejects(servicio.comprobante(3, { id: 7, rol: "VENDEDOR" }),
    (error) => error.estadoHttp === 403);
});

test("anular exige que la venta pertenezca a un turno abierto", async () => {
  const servicio = new ServicioVenta({ anular: async () => ({ error: "TURNO_CERRADO" }) });
  await assert.rejects(
    servicio.anular(3, { confirmar: true }, { id: 7, rol: "VENDEDOR" }),
    (error) => error.codigo === "TURNO_CAJA_CERRADO" && error.estadoHttp === 409,
  );
});
