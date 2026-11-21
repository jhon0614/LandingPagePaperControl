import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import { createClient } from "redis";
import { CacheProveedores } from "../src/services/supplier-cache.service.js";

test("Redis local: MISS, HIT, invalidacion, TTL y fallback sin tocar datos del negocio", async (t) => {
  const cliente = createClient({ url: "redis://127.0.0.1:6379", socket: { connectTimeout: 1000, reconnectStrategy: false } });
  cliente.on("error", () => {});
  await cliente.connect();
  const prefijo = `papercontrol:prueba-cache:${randomUUID()}`;
  const claves = new Set();
  const adaptador = {
    get isReady() { return cliente.isReady; },
    get isOpen() { return cliente.isOpen; },
    get: (...args) => cliente.get(...args),
    set: (...args) => { claves.add(args[0]); return cliente.set(...args); },
    destroy: () => cliente.destroy(),
  };
  t.after(async () => {
    if (cliente.isReady && claves.size) await cliente.del([...claves]);
    if (cliente.isOpen) cliente.destroy();
  });
  const cache = new CacheProveedores(adaptador, { prefijo, ttl: 1 });
  await adaptador.set(`${prefijo}:version`, randomUUID());
  cache.disponible = true;
  let consultas = 0;
  const cargar = async () => [{ id: ++consultas }];
  const estados = [];
  const leer = () => cache.obtenerOCargar({ pagina: 1 }, cargar, (s) => estados.push(s));
  await leer(); await leer();
  assert.deepEqual(estados, ["MISS", "HIT"]);
  assert.equal(consultas, 1);
  await cache.invalidar(); await leer();
  assert.equal(consultas, 2);
  await esperar(1100); await leer();
  assert.equal(consultas, 3);
  await cliente.del([...claves]);
  cliente.destroy();
  await leer();
  assert.equal(estados.at(-1), "BYPASS");
  assert.equal(consultas, 4);
});
