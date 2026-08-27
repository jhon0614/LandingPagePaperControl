import test from "node:test";
import assert from "node:assert/strict";
import { ModeloProducto } from "../src/models/product.model.js";

test("impide eliminar un producto que tiene ventas registradas", async () => {
  const consultas = [];
  const conexion = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, parametros) => {
      consultas.push({ sql, parametros });
      if (sql.includes("SELECT id FROM productos")) return [[{ id: 6 }]];
      if (sql.includes("AS tiene_ventas")) {
        return [[{ tiene_ventas: 1, tiene_movimientos: 1 }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const modelo = new ModeloProducto({
    getConnection: async () => conexion,
  });

  const resultado = await modelo.eliminar(6, 3);
  const actualizacion = consultas.find(({ sql }) =>
    sql.includes("UPDATE productos"),
  );
  const resolucionAlerta = consultas.find(({ sql }) =>
    sql.includes("UPDATE alertas_inventario"),
  );

  assert.deepEqual(resultado, { tieneVentas: true });
  assert.equal(actualizacion, undefined);
  assert.equal(resolucionAlerta, undefined);
});

test("elimina lógicamente y resuelve alertas si no existen ventas", async () => {
  const consultas = [];
  const conexion = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, parametros) => {
      consultas.push({ sql, parametros });
      if (sql.includes("SELECT id FROM productos")) return [[{ id: 6 }]];
      if (sql.includes("AS tiene_ventas")) {
        return [[{ tiene_ventas: 0, tiene_movimientos: 1, tiene_alertas: 1 }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const modelo = new ModeloProducto({ getConnection: async () => conexion });

  const resultado = await modelo.eliminar(6, 3);
  const resolucionAlerta = consultas.find(({ sql }) =>
    sql.includes("UPDATE alertas_inventario"),
  );

  assert.deepEqual(resultado, { eliminadoLogicamente: true });
  assert.match(resolucionAlerta.sql, /estado = 'RESUELTA'/);
  assert.deepEqual(resolucionAlerta.parametros, [3, 6]);
});
