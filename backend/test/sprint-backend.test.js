import test from "node:test";
import assert from "node:assert/strict";
import { ServicioReporte } from "../src/services/report.service.js";
import { ServicioProducto } from "../src/services/product.service.js";
import { ModeloVenta } from "../src/models/sale.model.js";
import { ModeloProducto } from "../src/models/product.model.js";
import { ControladorReporte } from "../src/controllers/report.controller.js";
import { crearRutasReportes } from "../src/routes/report.routes.js";

test("ruta de caja permite responsables y bloquea vendedores y solicitudes sin usuario", async () => {
  const router = crearRutasReportes({ autenticar: (_req, _res, next) => next(),
    controlador: new ControladorReporte({ caja: async () => ({ turnos: [] }) }) });
  for (const [rol, estado] of [["ADMINISTRADOR", 200], ["DUENO", 200], ["VENDEDOR", 403], [null, 401]]) {
    const resultado = await new Promise((resolve) => {
      router.handle({ method: "GET", url: "/caja", query: {},
        usuario: rol ? { id: 1, rol } : undefined },
      { json: (cuerpo) => resolve({ estado: 200, cuerpo }) },
      (error) => resolve({ estado: error?.estadoHttp }));
    });
    assert.equal(resultado.estado, estado);
    if (estado === 200) assert.deepEqual(resultado.cuerpo.datos.reporte, { turnos: [] });
  }
});

test("filtro de categoría usa parámetros y conserva exclusión de productos eliminados", async () => {
  const modelo = new ModeloProducto({ execute: async (sql, parametros) => {
    assert.match(sql, /p.categoria_id = \?/);
    assert.match(sql, /p.eliminado_en IS NULL/);
    assert.match(sql, /p.esta_activo = TRUE/);
    assert.deepEqual(parametros, [3]);
    return [[]];
  } });
  assert.deepEqual(await modelo.listar(false, 3), []);
});

test("reporte diario suma ingresos y gastos del vendedor sin mezclar aperturas", async () => {
  const servicio = new ServicioReporte({ caja: async (filtros) => {
    assert.deepEqual(filtros, { desde: "2026-09-01", hasta: "2026-09-02", vendedorId: 7 });
    return [
      { fecha: "2026-09-01", total_ventas: "120", efectivo: "70", tarjeta: "30", transferencia: "20", total_gastos: "15" },
      { fecha: "2026-09-02", total_ventas: "0", efectivo: "0", tarjeta: "0", transferencia: "0", total_gastos: "5" },
    ];
  } });
  const reporte = await servicio.caja({ desde: "2026-09-01", hasta: "2026-09-02", vendedorId: "7" });
  assert.equal(reporte.dias[0].flujoNeto, 105);
  assert.equal(reporte.dias[1].flujoNeto, -5);
  assert.deepEqual(reporte.resumen, { totalVentas: 120, totalGastos: 20, flujoNeto: 100,
    ventasPorMetodo: { efectivo: 70, tarjeta: 30, transferencia: 20 } });
});

test("reporte rechaza fechas imposibles, parámetros repetidos y rangos invertidos", async () => {
  const servicio = new ServicioReporte({ caja: assert.fail });
  for (const filtros of [ {}, { desde: "2026-02-30", hasta: "2026-03-01" },
    { desde: ["2026-09-01"], hasta: "2026-09-02" },
    { desde: "2026-09-03", hasta: "2026-09-02" } ]) {
    await assert.rejects(servicio.caja(filtros), { codigo: "RANGO_FECHAS_INVALIDO" });
  }
});

test("reporte sin actividad devuelve totales en cero", async () => {
  const reporte = await new ServicioReporte({ caja: async () => [] })
    .caja({ desde: "2024-02-29", hasta: "2024-02-29" });
  assert.equal(reporte.resumen.totalVentas, 0);
  assert.equal(reporte.resumen.flujoNeto, 0);
  assert.deepEqual(reporte.dias, []);
});

test("categoría filtra productos y rechaza identificadores inválidos", async () => {
  const servicio = new ServicioProducto({ listar: async (...args) => {
    assert.deepEqual(args, [false, 3]); return [];
  } });
  await servicio.listar(undefined, "3");
  await assert.rejects(servicio.listar(undefined, "abc"), { codigo: "ID_CATEGORIA_INVALIDO" });
});

function escenarioVenta({ stock = 5, fallarPago = false, anulada = false } = {}) {
  const consultas = [];
  const eventos = [];
  const conexion = {
    beginTransaction: async () => eventos.push("begin"),
    commit: async () => eventos.push("commit"),
    rollback: async () => eventos.push("rollback"),
    release: () => eventos.push("release"),
    execute: async (sql, parametros) => {
      consultas.push({ sql, parametros });
      if (sql.includes("SELECT id FROM turnos_caja")) return [[{ id: 1 }]];
      if (sql.includes("SELECT v.id, v.numero_venta")) return [[{
        id: 10, numero_venta: "V-00000010", vendido_por: 2,
        estado: anulada ? "ANULADA" : "CONFIRMADA", estado_turno: "ABIERTO",
      }]];
      if (sql.includes("SELECT producto_id, cantidad")) return [[{ producto_id: 3, cantidad: 2 }]];
      if (sql.includes("FROM productos WHERE")) return [[{ id: 3, nombre: "Resma",
        sku: "R1", precio_venta: "10", stock_actual: stock, stock_minimo: 3,
        alerta_stock_habilitada: 1, esta_activo: 1 }]];
      if (sql.includes("SELECT id, codigo FROM metodos_pago")) return [[{ id: 1, codigo: "EFECTIVO" }]];
      if (fallarPago && sql.includes("INSERT INTO pagos_venta")) throw new Error("falló el pago");
      return [{ insertId: 10, affectedRows: 1 }];
    },
  };
  return { modelo: new ModeloVenta({ getConnection: async () => conexion }), consultas, eventos };
}
const venta = { usuarioId: 2, clienteId: null, productos: [{ productoId: 3, cantidad: 2 }],
  metodoPago: "EFECTIVO", tipoDescuento: null, valorDescuento: 0,
  referencia: null, montoRecibido: 20 };

test("venta descuenta stock, registra movimiento y crea alerta en una transacción", async () => {
  const { modelo, consultas, eventos } = escenarioVenta();
  assert.deepEqual(await modelo.crear(venta), { id: 10 });
  assert.deepEqual(consultas.find((q) => q.sql.includes("UPDATE productos")).parametros, [3, 3]);
  assert.deepEqual(consultas.find((q) => q.sql.includes("INSERT INTO movimientos_inventario")).parametros,
    [3, 2, 10, -2, 5, 3, "V-00000010"]);
  assert.ok(consultas.some((q) => q.sql.includes("INSERT INTO alertas_inventario")));
  assert.deepEqual(eventos, ["begin", "commit", "release"]);
});

test("stock insuficiente no escribe y revierte; un pago fallido revierte toda la venta", async () => {
  const insuficiente = escenarioVenta({ stock: 1 });
  assert.equal((await insuficiente.modelo.crear(venta)).error, "STOCK_INSUFICIENTE");
  assert.ok(!insuficiente.consultas.some((q) => /INSERT|UPDATE productos/.test(q.sql)));
  assert.deepEqual(insuficiente.eventos, ["begin", "rollback", "release"]);
  const fallido = escenarioVenta({ fallarPago: true });
  await assert.rejects(fallido.modelo.crear(venta), /falló el pago/);
  assert.deepEqual(fallido.eventos, ["begin", "rollback", "release"]);
});

test("llamadas internas no pueden descontar cantidades negativas ni productos duplicados", async () => {
  const modelo = new ModeloVenta({ getConnection: assert.fail });
  for (const productos of [[{ productoId: 3, cantidad: -2 }], [...venta.productos, ...venta.productos], []]) {
    assert.equal((await modelo.crear({ ...venta, productos })).error, "PRODUCTO_INVALIDO");
  }
});

test("anular restaura existencias y resuelve alerta; repetir no devuelve stock otra vez", async () => {
  const datos = { id: 10, usuarioId: 2, puedeAnularCualquiera: false, motivo: "Error" };
  const normal = escenarioVenta({ stock: 3 });
  await normal.modelo.anular(datos);
  assert.deepEqual(normal.consultas.find((q) => q.sql.includes("UPDATE productos")).parametros, [5, 3]);
  assert.ok(normal.consultas.some((q) => q.sql.includes("UPDATE alertas_inventario")));
  assert.deepEqual(normal.eventos, ["begin", "commit", "release"]);
  const repetida = escenarioVenta({ anulada: true });
  assert.equal((await repetida.modelo.anular(datos)).error, "YA_ANULADA");
  assert.ok(!repetida.consultas.some((q) => q.sql.includes("UPDATE productos")));
});
