import test from "node:test";
import assert from "node:assert/strict";
import { ServicioReporte } from "../src/services/report.service.js";

test("presenta productos más vendidos con cantidades numéricas", async () => {
  let filtros;
  const servicio = new ServicioReporte({
    productosMasVendidos: async (recibidos) => {
      filtros = recibidos;
      return [{ id: 2, nombre: "Resma", cantidad_vendida: "12" }];
    },
  });
  const productos = await servicio.productosMasVendidos({ periodo: "semana" });
  assert.equal(filtros.periodo, "semana");
  assert.equal(productos[0].cantidadVendida, 12);
});

test("rango exige ambas fechas válidas y ordenadas", async () => {
  const servicio = new ServicioReporte({ productosMasVendidos: async () => [] });
  await assert.rejects(
    servicio.productosMasVendidos({ periodo: "rango", desde: "2026-08-20" }),
    (error) => error.codigo === "RANGO_FECHAS_INVALIDO",
  );
  await assert.rejects(
    servicio.productosMasVendidos({ periodo: "rango", desde: "2026-08-21", hasta: "2026-08-20" }),
    (error) => error.codigo === "RANGO_FECHAS_INVALIDO",
  );
});
