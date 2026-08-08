import test from "node:test";
import assert from "node:assert/strict";
import { permitirRoles } from "../src/middleware/roles.middleware.js";

function ejecutarMiddleware(usuario, ...rolesPermitidos) {
  let errorRecibido;
  let permitioContinuar = false;
  const middleware = permitirRoles(...rolesPermitidos);

  middleware({ usuario }, {}, (error) => {
    errorRecibido = error;
    permitioContinuar = !error;
  });

  return { errorRecibido, permitioContinuar };
}

test("permite el acceso a un administrador", () => {
  const resultado = ejecutarMiddleware(
    { id: 1, rol: "ADMINISTRADOR" },
    "ADMINISTRADOR",
  );

  assert.equal(resultado.permitioContinuar, true);
  assert.equal(resultado.errorRecibido, undefined);
});

test("rechaza una solicitud sin usuario autenticado", () => {
  const { errorRecibido } = ejecutarMiddleware(undefined, "ADMINISTRADOR");

  assert.equal(errorRecibido.estadoHttp, 401);
  assert.equal(errorRecibido.codigo, "USUARIO_NO_AUTENTICADO");
});

test("rechaza un usuario autenticado sin rol", () => {
  const { errorRecibido } = ejecutarMiddleware({ id: 2 }, "ADMINISTRADOR");

  assert.equal(errorRecibido.estadoHttp, 401);
  assert.equal(errorRecibido.codigo, "USUARIO_NO_AUTENTICADO");
});

test("rechaza a un vendedor en una ruta administrativa", () => {
  const { errorRecibido } = ejecutarMiddleware(
    { id: 2, rol: "VENDEDOR" },
    "ADMINISTRADOR",
  );

  assert.equal(errorRecibido.estadoHttp, 403);
  assert.equal(errorRecibido.codigo, "ACCESO_DENEGADO");
});

test("rechaza a un dueño en una ruta administrativa", () => {
  const { errorRecibido } = ejecutarMiddleware(
    { id: 3, rol: "DUENO" },
    "ADMINISTRADOR",
  );

  assert.equal(errorRecibido.estadoHttp, 403);
  assert.equal(errorRecibido.codigo, "ACCESO_DENEGADO");
});
