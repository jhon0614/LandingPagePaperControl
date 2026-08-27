import test from "node:test";
import assert from "node:assert/strict";
import { ControladorVenta } from "../src/controllers/sale.controller.js";

function crearRespuestaSimulada() {
  return {
    estado: null,
    cuerpo: null,
    status(estado) {
      this.estado = estado;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

test("métodos de pago usa el contrato esperado por el frontend", async () => {
  const metodosPago = [
    { id: 1, codigo: "EFECTIVO", nombre: "Efectivo", activo: true },
  ];
  const controlador = new ControladorVenta({
    metodosPago: async () => metodosPago,
  });
  const respuesta = crearRespuestaSimulada();

  await controlador.metodosPago({}, respuesta, assert.fail);

  assert.equal(respuesta.estado, 200);
  assert.deepEqual(respuesta.cuerpo, {
    exito: true,
    datos: { metodosPago },
  });
});

test("actualizar método de pago usa el contrato esperado por el frontend", async () => {
  const metodoPago = {
    id: 2,
    codigo: "TARJETA",
    nombre: "Tarjeta",
    activo: false,
  };
  let datosRecibidos;
  const controlador = new ControladorVenta({
    actualizarMetodoPago: async (id, estaActivo) => {
      datosRecibidos = { id, estaActivo };
      return metodoPago;
    },
  });
  const respuesta = crearRespuestaSimulada();

  await controlador.actualizarMetodoPago(
    { params: { id: "2" }, body: { estaActivo: false } },
    respuesta,
    assert.fail,
  );

  assert.deepEqual(datosRecibidos, { id: "2", estaActivo: false });
  assert.equal(respuesta.estado, 200);
  assert.deepEqual(respuesta.cuerpo, {
    exito: true,
    datos: { metodoPago },
  });
});
