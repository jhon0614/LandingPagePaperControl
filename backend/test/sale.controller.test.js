import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { ControladorVenta } from "../src/controllers/sale.controller.js";
import { ServicioVenta } from "../src/services/sale.service.js";
import { crearRutasVentas } from "../src/routes/sale.routes.js";
import { manejarError } from "../src/middleware/error-handler.js";

test("HTTP metodos de pago: contrato, validacion y permisos para consultar y cambiar estado", async (t) => {
  const fila = { id: 2, codigo: "TARJETA", nombre: "Tarjeta", esta_activo: 1 };
  const cambios = [];
  const servicio = new ServicioVenta({
    listarMetodosPago: async () => [fila],
    actualizarMetodoPago: async (id, estaActivo) => {
      cambios.push({ id, estaActivo });
      return id === 2 ? { ...fila, esta_activo: estaActivo } : null;
    },
  });
  const app = express();
  app.use(express.json());
  app.use("/api/ventas", crearRutasVentas({
    autenticar: (req, res, next) => {
      const rol = req.get("x-rol-prueba");
      if (!rol) return res.status(401).end();
      req.usuario = { id: 1, rol }; next();
    }, controlador: new ControladorVenta(servicio),
  }));
  app.use(manejarError);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/ventas/metodos-pago`;
  const pedir = (ruta = "", rol = "ADMINISTRADOR", body) => fetch(base + ruta, {
    method: body === undefined ? "GET" : "PATCH",
    headers: { ...(rol ? { "x-rol-prueba": rol } : {}), "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const rol of ["VENDEDOR", "ADMINISTRADOR", "DUENO"]) {
    const res = await pedir("", rol);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { exito: true, datos: { metodosPago: [
      { id: 2, codigo: "TARJETA", nombre: "Tarjeta", activo: true },
    ] } });
  }
  for (const rol of ["ADMINISTRADOR", "DUENO"]) {
    const res = await pedir("/2", rol, { estaActivo: false });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { exito: true, datos: { metodoPago:
      { id: 2, codigo: "TARJETA", nombre: "Tarjeta", activo: false },
    } });
  }
  assert.deepEqual(cambios, [{ id: 2, estaActivo: false }, { id: 2, estaActivo: false }]);
  for (const body of [{}, { estaActivo: "false" }, { estaActivo: 0 }, { estaActivo: false, nombre: "Otro" }])
    assert.equal((await pedir("/2", "ADMINISTRADOR", body)).status, 400);
  assert.equal((await pedir("/2", "VENDEDOR", { estaActivo: false })).status, 403);
  assert.equal((await pedir("/2", null, { estaActivo: false })).status, 401);
  assert.equal((await pedir("", null)).status, 401);
  assert.equal(cambios.length, 2); // Ninguna entrada rechazada alcanza el modelo.
  assert.equal((await pedir("/99", "ADMINISTRADOR", { estaActivo: true })).status, 404);
});
