import test from "node:test";
import assert from "node:assert/strict";
import { busquedaSql } from "../src/utils/query.js";
import { ModeloUsuario } from "../src/models/user.model.js";
import { ModeloProveedor } from "../src/models/supplier.model.js";
import { ModeloProducto } from "../src/models/product.model.js";
import { ModeloCliente } from "../src/models/client.model.js";
import { ServicioCliente } from "../src/services/client.service.js";
import { ControladorCliente } from "../src/controllers/client.controller.js";

test("busqueda parametrizada trata comodines como texto y valida el termino", () => {
  const filtro = busquedaSql("  50%_!  ", ["nombre"]);
  assert.deepEqual(filtro.parametros, ["%50!%!_!!%"]);
  assert.equal(filtro.sql, "AND (nombre LIKE ? ESCAPE '!')");
  assert.deepEqual(busquedaSql("   ", ["nombre"]), { sql: "", parametros: [] });
  for (const valor of [[], {}, "a".repeat(101)])
    assert.throws(() => busquedaSql(valor, ["nombre"]), { codigo: "TERMINO_BUSQUEDA_INVALIDO" });
});

for (const [nombre, Modelo, listar] of [
  ["usuarios", ModeloUsuario, (m, f) => m.listar(f)],
  ["proveedores", ModeloProveedor, (m, f) => m.listar(f)],
  ["productos", ModeloProducto, (m, f) => m.listar(false, 7, f)],
  ["clientes", ModeloCliente, (m, f) => m.buscar(f.buscar, f.limite, false, f)],
]) {
  test(`${nombre}: busca antes de paginar sin interpolar el texto`, async () => {
    const consultas = [];
    const modelo = new Modelo({ execute: async (sql, parametros) => {
      consultas.push({ sql, parametros });
      return [[]];
    } });
    await listar(modelo, { buscar: "O'Hara", pagina: 3, limite: 50 });
    const { sql, parametros } = consultas[0];
    assert.match(sql, /LIMIT 51 OFFSET 100/);
    assert.ok(sql.indexOf("LIKE ?") < sql.indexOf("LIMIT"));
    assert.ok(!sql.includes("O'Hara"));
    assert.ok(parametros.includes("%O'Hara%"));
    assert.match(sql, /eliminado_en IS NULL/);
    if (nombre === "productos") assert.equal(parametros[0], 7);
    if (["productos", "clientes", "proveedores"].includes(nombre)) assert.match(sql, /esta_activo = TRUE/);
  });
}

test("clientes: pagina 3 llega al modelo y se presenta hayMas sin la fila extra", async () => {
  let recibidos;
  const servicio = new ServicioCliente({ buscar: async (...args) => {
    recibidos = args;
    return Array.from({ length: 51 }, (_, i) => ({ id: i + 101, nombres: "Cliente", esta_activo: 1 }));
  } });
  const controlador = new ControladorCliente(servicio);
  let cuerpo;
  const respuesta = { status: () => respuesta, json: (datos) => { cuerpo = datos; } };
  const query = { buscar: "Cliente", pagina: "3", limite: "50", incluirInactivos: "true" };
  await controlador.buscar({ query, usuario: { rol: "VENDEDOR" } }, respuesta, (error) => { throw error; });
  assert.equal(recibidos[1], 50);
  assert.equal(recibidos[2], false);
  assert.deepEqual(recibidos[3], query);
  assert.equal(cuerpo.datos.clientes.length, 50);
  assert.deepEqual(cuerpo.datos.paginacion, { pagina: 3, limite: 50, hayMas: true });
});
