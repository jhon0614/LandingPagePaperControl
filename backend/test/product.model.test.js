import test from "node:test";
import assert from "node:assert/strict";
import { ModeloProducto } from "../src/models/product.model.js";

test("elimina lógicamente un producto que tiene historial", async () => {
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

  assert.deepEqual(resultado, { eliminadoLogicamente: true });
  assert.match(actualizacion.sql, /eliminado_en = CURRENT_TIMESTAMP/);
  assert.match(actualizacion.sql, /esta_activo = FALSE/);
  assert.deepEqual(actualizacion.parametros, [6]);
  assert.match(resolucionAlerta.sql, /estado = 'RESUELTA'/);
  assert.deepEqual(resolucionAlerta.parametros, [3, 6]);
});
