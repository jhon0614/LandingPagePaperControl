import test from "node:test";
import assert from "node:assert/strict";
import { interpretarProxyConfiable } from "../src/config/env.js";

test("proxy confiable queda desactivado si no se configura", () => {
  assert.equal(interpretarProxyConfiable(undefined), false);
  assert.equal(interpretarProxyConfiable(""), false);
  assert.equal(interpretarProxyConfiable("false"), false);
});

test("proxy confiable acepta una cantidad fija de saltos", () => {
  assert.equal(interpretarProxyConfiable("1"), 1);
  assert.equal(interpretarProxyConfiable(" 2 "), 2);
});

test("proxy confiable conserva listas de IP y CIDR", () => {
  assert.deepEqual(
    interpretarProxyConfiable("127.0.0.1, 10.0.0.0/8"),
    ["127.0.0.1", "10.0.0.0/8"],
  );
});

test("proxy confiable rechaza configuraciones inseguras o inválidas", () => {
  assert.throws(() => interpretarProxyConfiable("true"), /no es seguro/);
  assert.throws(() => interpretarProxyConfiable("0"), /mayor que cero/);
});
