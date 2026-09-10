import test from "node:test";
import assert from "node:assert/strict";
import { ServicioVenta } from "../src/services/sale.service.js";
import { validarDescuento, calcularDescuento } from "../src/utils/discount.js";
import { generarComprobanteHtml } from "../src/services/receipt.service.js";
import { ControladorVenta } from "../src/controllers/sale.controller.js";

test("SCRUM-26: porcentaje, fijo, redondeo y descuento ausente", () => {
  assert.equal(calcularDescuento(10000n, "PORCENTAJE", 12.5), 1250n);
  assert.equal(calcularDescuento(999n, "PORCENTAJE", 10), 100n);
  assert.equal(calcularDescuento(10000n, "VALOR_FIJO", 25), 2500n);
  assert.equal(calcularDescuento(10000n, null), 0n);
});

test("SCRUM-26: entradas internas no pueden eludir las reglas del descuento", async () => {
  const servicio = new ServicioVenta({ crear: assert.fail });
  for (const [tipoDescuento, valorDescuento] of [["OTRO", 1], [null, 1], ["PORCENTAJE", 101],
    ["PORCENTAJE", -1], ["VALOR_FIJO", 1.001], ["VALOR_FIJO", "10"], ["VALOR_FIJO", Infinity]]) {
    assert.throws(() => validarDescuento(tipoDescuento, valorDescuento), { codigo: "DESCUENTO_INVALIDO" });
    await assert.rejects(servicio.crear({ tipoDescuento, valorDescuento }, 1), { codigo: "DESCUENTO_INVALIDO" });
  }
  assert.throws(() => calcularDescuento(100n, "VALOR_FIJO", 2), { codigo: "DESCUENTO_INVALIDO" });
});

test("SCRUM-15: vendedor queda limitado a sus ventas aunque manipule filtros", async () => {
  let parametros;
  const servicio = new ServicioVenta({ existeCliente: async () => true,
    comprasCliente: async (datos) => { parametros = datos; return []; } });
  assert.deepEqual(await servicio.comprasCliente("8", { vendedorId: "999", clienteId: "99", estado: "ANULADA" },
    { id: 2, rol: "VENDEDOR" }), []);
  assert.equal(parametros.vendedorId, 2);
  assert.equal(parametros.clienteId, 8);
  assert.equal(parametros.estado, "ANULADA");
  await servicio.comprasCliente("8", {}, { id: 1, rol: "ADMINISTRADOR" });
  assert.equal(parametros.vendedorId, undefined);
});

test("SCRUM-15: IDs, fechas, estado y páginas inválidas se rechazan", async () => {
  const servicio = new ServicioVenta({ existeCliente: assert.fail });
  const usuario = { id: 1, rol: "DUENO" };
  await assert.rejects(servicio.comprasCliente("abc", {}, usuario), { codigo: "ID_CLIENTE_INVALIDO" });
  await assert.rejects(servicio.comprasCliente("1", { fechaInicio: "2026-02-30" }, usuario), { codigo: "RANGO_FECHAS_INVALIDO" });
  await assert.rejects(servicio.comprasCliente("1", { estado: "OTRO" }, usuario), { codigo: "ESTADO_VENTA_INVALIDO" });
  await assert.rejects(servicio.comprasCliente("1", { limite: "99999" }, usuario), { codigo: "PAGINACION_INVALIDA" });
  await assert.rejects(servicio.comprasCliente("1", {}, { rol: "VENDEDOR" }), { codigo: "ACCESO_DENEGADO" });
  await assert.rejects(new ServicioVenta({ existeCliente: async () => false }).comprasCliente("8", {}, usuario), { codigo: "CLIENTE_NO_ENCONTRADO" });
});

const comprobante = {
  id: 1, numeroVenta: "V-00000001", fecha: "2026-09-09T17:00:00Z", vendedor: { nombre: "Ana" },
  cliente: { nombre: '<img src=x onerror="alert(1)">', tipoDocumento: "CC", documento: "123456" },
  productos: [{ nombre: "Papel <script>alert(1)</script>", sku: "P1", cantidad: 2, precioUnitario: 100, total: 200 }],
  subtotal: 200, descuento: { tipo: "PORCENTAJE", valor: 10, monto: 20 }, impuesto: 0, total: 180,
  pagos: [{ metodo: "EFECTIVO", monto: 180, montoRecibido: 200, cambio: 20 }], estado: "CONFIRMADA",
};

test("SCRUM-22: HTML escapa datos y contiene descuento, pago y cambio", () => {
  const html = generarComprobanteHtml(comprobante);
  assert.ok(html.includes("V-00000001"));
  assert.ok(html.includes("Descuento (10%)"));
  assert.ok(html.includes("Cambio:"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(generarComprobanteHtml({ ...comprobante, cliente: null }).includes("Consumidor final"));
  assert.ok(generarComprobanteHtml({ ...comprobante, estado: "ANULADA", motivoAnulacion: "Error" }).includes("VENTA ANULADA"));
});

test("SCRUM-22: descarga exige autorización y valida el formato", async () => {
  const controller = new ControladorVenta({ comprobante: async () => { throw Object.assign(new Error("Denegado"), { codigo: "ACCESO_DENEGADO" }); } });
  let recibido;
  await controller.comprobante({ params: { id: "1" }, query: { formato: "html" }, usuario: { id: 2 } },
    { send: assert.fail, attachment: assert.fail }, (error) => { recibido = error; });
  assert.equal(recibido.codigo, "ACCESO_DENEGADO");
  await controller.comprobante({ query: { formato: "pdf" } }, {}, (error) => { recibido = error; });
  assert.equal(recibido.codigo, "FORMATO_COMPROBANTE_INVALIDO");
});
