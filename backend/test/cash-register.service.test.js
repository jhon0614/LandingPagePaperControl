import test from "node:test";
import assert from "node:assert/strict";
import { ServicioTurnoCaja } from "../src/services/cash-register.service.js";

const turno = {
  id: 4, abierto_por: 2, cerrado_por: null, monto_apertura: 100000,
  abierto_en: new Date("2026-08-20T13:00:00Z"), efectivo_esperado: null,
  efectivo_contado: null, diferencia: null, cerrado_en: null,
  estado: "ABIERTO", notas_cierre: null,
  abierto_por_nombre: "Laura Gómez",
};
const resumen = {
  monto_apertura: 100000, total_ventas: 90000, efectivo: 50000,
  tarjeta: 30000, transferencia: 10000, total_gastos: 15000,
};

test("rechaza abrir una segunda caja", async () => {
  const servicio = new ServicioTurnoCaja({ abrir: async () => ({ existente: turno }) });
  await assert.rejects(servicio.abrir(300000, 2),
    (error) => error.estadoHttp === 409 && error.codigo === "TURNO_CAJA_YA_ABIERTO");
});

test("rechaza montos de apertura inválidos sin llamar al modelo", async () => {
  let llamadas = 0;
  const servicio = new ServicioTurnoCaja({ abrir: async () => { llamadas++; } });
  for (const monto of [299999.99, 0, -1, null, undefined, "", "abc", NaN, Infinity]) {
    await assert.rejects(servicio.abrir(monto, 2),
      (error) => error.estadoHttp === 400 && error.codigo === "MONTO_APERTURA_MINIMO");
  }
  assert.equal(llamadas, 0);
});

test("permite abrir con el mínimo o más y normaliza el monto", async () => {
  for (const monto of [300000, "300000", 350000]) {
    const servicio = new ServicioTurnoCaja({
      abrir: async (datos) => {
        assert.deepEqual(datos, { montoInicial: Number(monto), usuarioId: 2 });
        return { creado: { ...turno, monto_apertura: datos.montoInicial } };
      },
    });
    const resultado = await servicio.abrir(monto, 2);
    assert.equal(resultado.montoInicial, Number(monto));
  }
});

test("calcula el efectivo esperado con ventas en efectivo menos gastos", async () => {
  const servicio = new ServicioTurnoCaja({
    buscarAbierto: async () => turno,
    obtenerResumen: async () => resumen,
  });
  const resultado = await servicio.resumen();
  assert.equal(resultado.totalVentas, 90000);
  assert.deepEqual(resultado.ventasPorMetodo, { EFECTIVO: 50000, TARJETA: 30000, TRANSFERENCIA: 10000 });
  assert.equal(resultado.montoEsperadoEfectivo, 135000);
});

test("devuelve null cuando no existe caja abierta", async () => {
  const servicio = new ServicioTurnoCaja({ buscarAbierto: async () => null });
  assert.equal(await servicio.actual(), null);
});

test("presenta el nombre del usuario que abrió el turno", async () => {
  const servicio = new ServicioTurnoCaja({ buscarAbierto: async () => turno });
  const actual = await servicio.actual();
  assert.equal(actual.usuarioNombre, "Laura Gómez");
  assert.equal(actual.abiertoPorNombre, "Laura Gómez");
});

test("solo autor o administrador puede eliminar un gasto", async () => {
  const servicio = new ServicioTurnoCaja({
    buscarGasto: async () => ({ id: 9, turno_caja_id: 4, registrado_por: 8 }),
    buscarAbierto: async () => turno,
  });
  await assert.rejects(servicio.eliminarGasto(9, { id: 2, rol: "VENDEDOR" }),
    (error) => error.estadoHttp === 403);
});

test("valida el rango de fechas del historial", async () => {
  const servicio = new ServicioTurnoCaja({ listar: async () => [] });
  await assert.rejects(servicio.historial({ desde: "20-08-2026" }),
    (error) => error.estadoHttp === 400 && error.codigo === "RANGO_FECHAS_INVALIDO");
  await assert.rejects(servicio.historial({ desde: "2026-08-21", hasta: "2026-08-20" }),
    (error) => error.estadoHttp === 400 && error.codigo === "RANGO_FECHAS_INVALIDO");
});

test("presenta usuarioNombre en los gastos para Caja.jsx", async () => {
  const servicio = new ServicioTurnoCaja({
    buscarAbierto: async () => turno,
    listarGastos: async () => [{
      id: 12,
      turno_caja_id: 4,
      registrado_por: 2,
      descripcion: "Transporte",
      monto: 5000,
      ocurrido_en: new Date("2026-08-20T16:00:00Z"),
      creado_en: new Date("2026-08-20T16:00:00Z"),
      usuario_nombres: "Laura",
      usuario_apellidos: "Gómez",
    }],
  });

  const [gasto] = await servicio.gastos();

  assert.equal(gasto.usuarioNombre, "Laura Gómez");
  assert.equal(gasto.usuario, "Laura Gómez");
});
