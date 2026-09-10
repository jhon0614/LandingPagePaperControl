import "dotenv/config";
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { BaseDatos } from "../src/config/database.js";
import { crearAplicacion } from "../src/app.js";
import { ModeloUsuario } from "../src/models/user.model.js";
import { ModeloSesion } from "../src/models/session.model.js";
import { ModeloRestablecimientoContrasena } from "../src/models/password-reset.model.js";
import { ModeloTurnoCaja } from "../src/models/cash-register.model.js";
import { ModeloProducto } from "../src/models/product.model.js";
import { ModeloVenta } from "../src/models/sale.model.js";
import { ModeloRol } from "../src/models/role.model.js";
import { ModeloAuditoria } from "../src/models/audit.model.js";
import { ModeloColaCorreo } from "../src/models/mail-queue.model.js";
import { AlmacenLimitesMySQL } from "../src/models/rate-limit.store.js";
import { ServicioUsuario } from "../src/services/user.service.js";
import { ServicioVenta } from "../src/services/sale.service.js";
import { ServicioAutenticacion } from "../src/services/auth.service.js";
import { ModeloIntentoAcceso } from "../src/models/login-attempt.model.js";
import { ModeloConfiguracion } from "../src/models/setting.model.js";
import { crearMiddlewareAutenticacion } from "../src/middleware/auth.middleware.js";
import { centavos, importeSql } from "../src/utils/money.js";
import { listaPaginada } from "../src/utils/query.js";

// Nunca usa DB_NAME. Crea y elimina únicamente una base nueva con este prefijo.
const nombre = `papercontrol_test_${randomBytes(8).toString("hex")}`;
const opciones = {
  host: process.env.TEST_DB_HOST ?? process.env.DB_HOST,
  port: Number(process.env.TEST_DB_PORT ?? process.env.DB_PORT ?? 3306),
  user: process.env.TEST_DB_USER ?? process.env.DB_USER,
  password: process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD,
  connectTimeout: 5000,
};
let control, pool, creada = false;
let hash;
const secreto = "integration-secret-at-least-thirty-two-characters";

before(async () => {
  if (!["localhost", "127.0.0.1", "::1"].includes(opciones.host))
    throw new Error("Las pruebas requieren MySQL local y permisos para crear una base temporal.");
  control = await mysql.createConnection({ ...opciones, multipleStatements: true });
  const esquema = await readFile(new URL("../../database/schema.sql", import.meta.url), "utf8");
  assert.match(esquema, /CREATE DATABASE paper_control/);
  // Marcar después del CREATE evita borrar una base ajena si fallase por colisión.
  await control.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
  creada = true;
  const tablas = esquema.slice(esquema.indexOf("USE paper_control;"));
  await control.query(tablas.replaceAll("paper_control", nombre));
  const seed = await readFile(new URL("../../database/seed.sql", import.meta.url), "utf8");
  await control.query(seed.replaceAll("paper_control", nombre));
  pool = mysql.createPool({ ...opciones, database: nombre, connectionLimit: 8,
    timezone: "-05:00", decimalNumbers: false });
  pool.on("connection", (conexion) => conexion.query("SET time_zone = '-05:00'"));
  hash = await bcrypt.hash("ActualSegura123", 4);
});

after(async () => {
  if (pool) await pool.end();
  if (control) {
    try {
      assert.match(nombre, /^papercontrol_test_[a-f0-9]{16}$/);
      if (creada) await control.query(`DROP DATABASE \`${nombre}\``);
    } finally { await control.end(); }
  }
});

beforeEach(async () => {
  const conexion = await pool.getConnection();
  try {
    await conexion.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const tabla of ["solicitudes_venta", "limites_solicitudes", "cola_recuperacion", "registros_auditoria",
      "intentos_acceso", "sesiones_usuario", "tokens_recuperacion_contrasena", "alertas_inventario",
      "movimientos_inventario", "pagos_venta", "detalles_venta", "ventas", "gastos_caja", "turnos_caja",
      "productos_proveedores", "productos", "categorias", "usuarios", "clientes"])
      await conexion.query(`TRUNCATE TABLE ${tabla}`);
  } finally {
    await conexion.query("SET FOREIGN_KEY_CHECKS = 1");
    conexion.release();
  }
  await pool.execute(`INSERT INTO usuarios (id, rol_id, nombres, apellidos, correo, hash_contrasena)
    VALUES (1, 1, 'Admin', 'Uno', 'uno@example.test', ?),
           (2, 1, 'Admin', 'Dos', 'dos@example.test', ?),
           (3, 3, 'Dueno', 'Tres', 'tres@example.test', ?)`, [hash, hash, hash]);
});

const servicioAuth = () => new ServicioAutenticacion({ modeloUsuario: new ModeloUsuario(pool),
  modeloSesion: new ModeloSesion(pool), modeloIntentoAcceso: new ModeloIntentoAcceso(pool),
  modeloConfiguracion: new ModeloConfiguracion(pool),
  configuracionAutenticacion: { secretoAcceso: secreto, minutosAcceso: 15, diasRenovacion: 7 } });

async function autenticar(token) {
  let error;
  await crearMiddlewareAutenticacion({ modeloUsuario: new ModeloUsuario(pool), modeloSesion: new ModeloSesion(pool),
    secretoAcceso: secreto })({ get: () => `Bearer ${token}`, originalUrl: "/api/productos" }, {}, (e) => { error = e; });
  return error;
}

async function prepararVenta(precio = "0.10", stock = 10) {
  const caja = await new ModeloTurnoCaja(pool).abrir({ usuarioId: 1, montoInicial: 0 });
  await pool.execute("INSERT INTO categorias (id, nombre) VALUES (1, 'Papel')");
  await pool.execute(`INSERT INTO productos (id, categoria_id, sku, nombre, precio_venta, stock_actual, stock_minimo)
    VALUES (1, 1, 'P1', 'Papel', ?, ?, 0)`, [precio, stock]);
  return caja.creado.id;
}
const datosVenta = (turnoCajaId, cantidad = 3) => ({ turnoCajaId, productos: [{ productoId: 1, cantidad }],
  metodoPago: "EFECTIVO", valorDescuento: 0, montoRecibido: 1 });

test("UTC: el enlace de 30 minutos no nace vencido con DB_TIMEZONE -05:00", async () => {
  const modelo = new ModeloRestablecimientoContrasena(pool);
  await modelo.crear({ usuarioId: 1, hashToken: "a".repeat(64), expiraEn: new Date(Date.now() + 1800000) });
  const token = await modelo.buscarActivoPorHash("a".repeat(64));
  assert.ok(token);
  assert.ok(Math.abs(Date.parse(token.expira_en) - Date.now() - 1800000) < 2000);
  await new ModeloUsuario(pool).registrarAccesoFallido(1, 1, 15);
  const usuario = await new ModeloUsuario(pool).buscarParaAutenticacion("uno@example.test");
  assert.ok(Math.abs(Date.parse(usuario.bloqueado_hasta) - Date.now() - 900000) < 2000);
});

test("logout y cambio de contraseña invalidan JWT ya emitidos", async () => {
  const auth = servicioAuth();
  const sesion = await auth.iniciarSesion({ correo: "uno@example.test", contrasena: "ActualSegura123" });
  assert.equal(await autenticar(sesion.tokenAcceso), undefined);
  await auth.cerrarSesion(sesion.tokenRenovacion);
  assert.equal((await autenticar(sesion.tokenAcceso)).codigo, "SESION_NO_VALIDA");
  const otra = await auth.iniciarSesion({ correo: "uno@example.test", contrasena: "ActualSegura123" });
  await new ModeloUsuario(pool).actualizarContrasenaYRevocarSesiones(1, "nuevo-hash", hash);
  assert.equal((await autenticar(otra.tokenAcceso)).codigo, "SESION_NO_VALIDA");
});

test("refresh conserva contraseña temporal y la expiración UTC", async () => {
  await pool.execute("UPDATE usuarios SET debe_cambiar_contrasena = TRUE WHERE id = 1");
  const auth = servicioAuth();
  const sesion = await auth.iniciarSesion({ correo: "uno@example.test", contrasena: "ActualSegura123" });
  const nueva = await auth.renovarSesion(sesion.tokenRenovacion);
  assert.equal(nueva.usuario.debeCambiarContrasena, true);
  assert.ok(Math.abs(nueva.expiracionTokenRenovacion - sesion.expiracionTokenRenovacion) < 1000);
});

test("recuperaciones concurrentes dejan un enlace activo y cambiar contraseña lo invalida", async () => {
  const modelo = new ModeloRestablecimientoContrasena(pool);
  await Promise.all(["a", "b"].map((letra) => modelo.crear({ usuarioId: 1,
    hashToken: letra.repeat(64), expiraEn: new Date(Date.now() + 1800000) })));
  const [[fila]] = await pool.execute("SELECT COUNT(*) AS total FROM tokens_recuperacion_contrasena WHERE usado_en IS NULL");
  assert.equal(fila.total, 1);
  await new ModeloUsuario(pool).actualizarContrasenaYRevocarSesiones(1, "nuevo", hash);
  assert.equal(await modelo.buscarActivoPorHash("a".repeat(64)), null);
  assert.equal(await modelo.buscarActivoPorHash("b".repeat(64)), null);
});

test("un token de recuperación se consume solo una vez bajo concurrencia", async () => {
  const modelo = new ModeloRestablecimientoContrasena(pool);
  await modelo.crear({ usuarioId: 1, hashToken: "c".repeat(64), expiraEn: new Date(Date.now() + 1800000) });
  const resultados = await Promise.all(["uno", "dos"].map((hashContrasena) =>
    modelo.consumirYActualizarContrasena({ hashToken: "c".repeat(64), hashContrasena })));
  assert.equal(resultados.filter(Boolean).length, 1);
});

test("dos ventas simultáneas con la misma clave descuentan stock una sola vez", async () => {
  const turno = await prepararVenta();
  const servicio = new ServicioVenta(new ModeloVenta(pool));
  const ventas = await Promise.all([1, 2].map(() => servicio.crear(datosVenta(turno), 1, "misma-venta-000001")));
  assert.equal(ventas[0].id, ventas[1].id);
  assert.equal(ventas[0].total, 0.3);
  assert.equal(ventas[0].pagos[0].cambio, 0.7);
  const [[producto]] = await pool.execute("SELECT stock_actual FROM productos WHERE id = 1");
  assert.equal(producto.stock_actual, 7);
  await assert.rejects(servicio.crear(datosVenta(turno, 2), 1, "misma-venta-000001"), { codigo: "IDEMPOTENCIA_CONFLICTO" });
});

test("no se vende más stock del disponible bajo concurrencia", async () => {
  const turno = await prepararVenta("0.10", 3);
  const servicio = new ServicioVenta(new ModeloVenta(pool));
  const resultados = await Promise.allSettled([1, 2].map(() => servicio.crear(datosVenta(turno), 1)));
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(resultados.find((r) => r.status === "rejected").reason.codigo, "STOCK_INSUFICIENTE");
});

test("desbordamiento monetario revierte toda la venta", async () => {
  const turno = await prepararVenta("9999999999.99", 3);
  await assert.rejects(new ServicioVenta(new ModeloVenta(pool)).crear(datosVenta(turno), 1), { codigo: "IMPORTE_FUERA_DE_RANGO" });
  const [[venta]] = await pool.execute("SELECT COUNT(*) AS total FROM ventas");
  assert.equal(venta.total, 0);
  assert.equal(importeSql(centavos("0.10") + centavos("0.20")), "0.30");
});

test("editar un formulario viejo no restaura stock vendido", async () => {
  const turno = await prepararVenta();
  await new ServicioVenta(new ModeloVenta(pool)).crear(datosVenta(turno), 1);
  await assert.rejects(new ModeloProducto(pool).actualizar(1, { categoria: "Papel", codigo: "P1",
    nombre: "Nombre nuevo", marca: "Marca", precioMayor: 0, precioDetal: 0.1, stock: 10, stockMinimo: 0 }, 1),
  { codigo: "STOCK_EDICION_CONFLICTO" });
  const [[fila]] = await pool.execute("SELECT stock_actual, nombre FROM productos WHERE id = 1");
  assert.deepEqual(fila, { stock_actual: 7, nombre: "Papel" });
});

test("gastos y cierre concurrentes dejan el cuadre consistente", async () => {
  const modelo = new ModeloTurnoCaja(pool);
  const { creado } = await modelo.abrir({ usuarioId: 1, montoInicial: 10 });
  const resultados = await Promise.allSettled([
    modelo.crearGasto({ turnoId: creado.id, usuarioId: 1, descripcion: "Gasto", monto: 1 }),
    modelo.cerrar({ turnoId: creado.id, usuarioId: 1, montoContado: 9 }),
  ]);
  assert.equal(resultados[1].status, "fulfilled");
  const [[gastos]] = await pool.execute("SELECT COALESCE(SUM(monto), 0) AS total FROM gastos_caja");
  const [[turno]] = await pool.execute("SELECT efectivo_esperado FROM turnos_caja WHERE id = ?", [creado.id]);
  assert.equal(Number(turno.efectivo_esperado), 10 - Number(gastos.total));
  await assert.rejects(modelo.crearGasto({ turnoId: creado.id, usuarioId: 1, descripcion: "Tarde", monto: 1 }), { codigo: "GASTO_TURNO_CERRADO" });
});

test("un retiro no puede superar el efectivo disponible de la caja", async () => {
  const modelo = new ModeloTurnoCaja(pool);
  const { creado } = await modelo.abrir({ usuarioId: 1, montoInicial: 10 });

  await modelo.crearGasto({
    turnoId: creado.id, usuarioId: 1, descripcion: "Retiro válido", monto: 10,
  });
  await assert.rejects(
    modelo.crearGasto({
      turnoId: creado.id, usuarioId: 1, descripcion: "Excede caja", monto: 0.01,
    }),
    (error) =>
      error.codigo === "RETIRO_SUPERA_DISPONIBLE" &&
      error.estadoHttp === 422 &&
      error.detalles.disponible === "0.00",
  );
  const [[gastos]] = await pool.execute(
    "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos_caja WHERE turno_caja_id = ?",
    [creado.id],
  );
  assert.equal(Number(gastos.total), 10);
});

test("eliminar gastos y cerrar se serializan y conservan auditoría", async () => {
  const modelo = new ModeloTurnoCaja(pool);
  const { creado } = await modelo.abrir({ usuarioId: 1, montoInicial: 10 });
  const gasto = await modelo.crearGasto({ turnoId: creado.id, usuarioId: 1, descripcion: "Gasto", monto: 1 });
  const resultados = await Promise.allSettled([
    modelo.eliminarGasto(gasto.id, { id: 1, rol: "ADMINISTRADOR" }, creado.id),
    modelo.cerrar({ turnoId: creado.id, usuarioId: 1, montoContado: 10 }),
  ]);
  assert.equal(resultados[1].status, "fulfilled");
  const [[gastos]] = await pool.execute("SELECT COALESCE(SUM(monto), 0) AS total FROM gastos_caja");
  const [[turno]] = await pool.execute("SELECT efectivo_esperado FROM turnos_caja WHERE id = ?", [creado.id]);
  assert.equal(Number(turno.efectivo_esperado), 10 - Number(gastos.total));
  const [[auditoria]] = await pool.execute("SELECT COUNT(*) AS total FROM registros_auditoria WHERE accion = 'CREAR_GASTO'");
  assert.equal(auditoria.total, 1);
});

test("dos aperturas concurrentes crean un solo turno", async () => {
  const modelo = new ModeloTurnoCaja(pool);
  const resultados = await Promise.all([1, 2].map((usuarioId) => modelo.abrir({ usuarioId, montoInicial: 0 })));
  assert.equal(resultados.filter((r) => r.creado).length, 1);
});

test("cambios concurrentes nunca desactivan al último administrador", async () => {
  const servicio = new ServicioUsuario(new ModeloUsuario(pool), new ModeloRol(pool), new ModeloSesion(pool), new ModeloAuditoria(pool));
  const resultados = await Promise.allSettled([1, 2].map((id) => servicio.cambiarEstado(id, false, 3)));
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(resultados.find((r) => r.status === "rejected").reason.codigo, "ULTIMO_ADMINISTRADOR");
  const [[fila]] = await pool.execute("SELECT COUNT(*) AS total FROM usuarios WHERE rol_id = 1 AND esta_activo = TRUE");
  assert.equal(fila.total, 1);
});

test("fallo de auditoría revierte el cambio administrativo", async () => {
  await pool.query(`CREATE TRIGGER auditoria_falla BEFORE INSERT ON registros_auditoria
    FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de prueba'`);
  try {
    const servicio = new ServicioUsuario(new ModeloUsuario(pool), new ModeloRol(pool), new ModeloSesion(pool), new ModeloAuditoria(pool));
    await assert.rejects(servicio.actualizar(1, { nombres: "Cambiado" }, 3));
    const [[fila]] = await pool.execute("SELECT nombres FROM usuarios WHERE id = 1");
    assert.equal(fila.nombres, "Admin");
  } finally { await pool.query("DROP TRIGGER auditoria_falla"); }
});

test("dos instancias del limitador comparten contadores", async () => {
  const almacenes = [new AlmacenLimitesMySQL(pool, "compartido"), new AlmacenLimitesMySQL(pool, "compartido")];
  almacenes.forEach((a) => a.init({ windowMs: 60000 }));
  const resultados = await Promise.all(Array.from({ length: 12 }, (_, i) => almacenes[i % 2].increment("cuenta")));
  assert.deepEqual(resultados.map((r) => r.totalHits).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.ok(resultados[0].resetTime > new Date());
});

test("dos consumidores reservan trabajos distintos y no almacenan tokens", async () => {
  const cola = new ModeloColaCorreo(pool);
  await cola.encolar("uno@example.test");
  await cola.encolar("desconocido@example.test");
  const trabajos = await Promise.all([cola.tomar(), cola.tomar()]);
  assert.notEqual(trabajos[0].id, trabajos[1].id);
  await Promise.all(trabajos.map((tarea) => cola.completar(tarea)));
  assert.equal(await cola.tomar(), null);
});

test("paginación de SQL limita resultados y avisa cuando hay más", async () => {
  const filas = await new ModeloUsuario(pool).listar({ pagina: 1, limite: 1 });
  assert.equal(filas.length, 2);
  const respuesta = listaPaginada("usuarios", filas, { pagina: 1, limite: 1 });
  assert.equal(respuesta.datos.usuarios.length, 1);
  assert.equal(respuesta.datos.paginacion.hayMas, true);
});

test("HTTP devuelve 429 con CORS y expone Retry-After", async () => {
  const app = crearAplicacion({ conexiones: pool, configuracion: { origenFrontend: "http://localhost:5173",
    entorno: "development", limitesCompartidos: true, autenticacion: { secretoAcceso: secreto }, correo: {}, restablecimientoContrasena: {} } });
  const servidor = app.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  try {
    // Alcanzar el límite con el mismo almacén que usa la aplicación, sin 300 solicitudes HTTP.
    const store = new AlmacenLimitesMySQL(pool, "api-0");
    store.init({ windowMs: 60000 });
    await store.increment("127.0.0.1");
    await pool.execute("UPDATE limites_solicitudes SET total = 300 WHERE clave = ?", [store.clave("127.0.0.1")]);
    const respuesta = await fetch(`http://127.0.0.1:${servidor.address().port}/api/health`, { headers: { Origin: "http://localhost:5173" } });
    assert.equal(respuesta.status, 429);
    assert.equal(respuesta.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.match(respuesta.headers.get("access-control-expose-headers"), /Retry-After/);
    assert.ok(Number(respuesta.headers.get("retry-after")) > 0);
  } finally { servidor.closeAllConnections(); await new Promise((resolve) => servidor.close(resolve)); }
});

test("la recuperación HTTP responde igual sin SMTP y limita por cuenta", async () => {
  const app = crearAplicacion({ conexiones: pool, configuracion: { origenFrontend: "http://localhost:5173",
    entorno: "development", limitesCompartidos: true, autenticacion: { secretoAcceso: secreto }, correo: {}, restablecimientoContrasena: {} } });
  const servidor = app.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  try {
    const solicitar = (correo) => fetch(`http://127.0.0.1:${servidor.address().port}/api/auth/olvide-contrasena`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo }),
    });
    const conocida = await solicitar("uno@example.test");
    const desconocida = await solicitar("noexiste@example.test");
    assert.equal(conocida.status, 200);
    assert.equal(desconocida.status, 200);
    assert.deepEqual(await conocida.json(), await desconocida.json());
    await solicitar("uno@example.test");
    await solicitar("uno@example.test");
    assert.equal((await solicitar("uno@example.test")).status, 429);
    const [[fila]] = await pool.execute("SELECT COUNT(*) AS total FROM cola_recuperacion");
    assert.equal(fila.total, 4);
  } finally { servidor.closeAllConnections(); await new Promise((resolve) => servidor.close(resolve)); }
});

test("pool configura zona, espera de bloqueos y cola limitada", async () => {
  const base = BaseDatos.obtenerInstancia({ servidor: opciones.host, puerto: opciones.port,
    usuario: opciones.user, contrasena: opciones.password, nombre, zonaHoraria: "-05:00",
    limiteConexiones: 1, limiteCola: 1, tiempoConsultaMs: 5000, esperaBloqueoSegundos: 5 });
  try {
    await base.comprobarEsquema();
    const [[fila]] = await base.conexiones.query(
      "SELECT @@session.time_zone AS zona, @@session.innodb_lock_wait_timeout AS espera",
    );
    assert.equal(fila.zona, "-05:00");
    assert.equal(Number(fila.espera), 5);
    const ocupada = await base.conexiones.getConnection();
    try {
      const pendiente = base.conexiones.getConnection();
      await assert.rejects(base.conexiones.getConnection(), /Queue limit reached/);
      ocupada.release();
      (await pendiente).release();
    } catch (error) { ocupada.release(); throw error; }
  } finally { await base.cerrar(); }
});

test("migración sobre esquema anterior agrega tablas y revoca fechas antiguas", async () => {
  const sesion = await servicioAuth().iniciarSesion({ correo: "uno@example.test", contrasena: "ActualSegura123" });
  await new ModeloRestablecimientoContrasena(pool).crear({ usuarioId: 1, hashToken: "d".repeat(64), expiraEn: new Date(Date.now() + 1800000) });
  // Estas tablas están únicamente en la base temporal creada por este archivo.
  await pool.query("DROP TABLE solicitudes_venta, limites_solicitudes, cola_recuperacion");
  const migracion = await readFile(new URL("../../database/migrations/2026-09-09-seguridad-backend.sql", import.meta.url), "utf8");
  await control.query(migracion);
  assert.equal((await autenticar(sesion.tokenAcceso)).codigo, "SESION_NO_VALIDA");
  assert.equal(await new ModeloRestablecimientoContrasena(pool).buscarActivoPorHash("d".repeat(64)), null);
  await new ModeloColaCorreo(pool).encolar("uno@example.test");
});

test("SCRUM-26: descuentos se guardan y cuadran con el comprobante y el pago", async () => {
  const turno = await prepararVenta();
  const servicio = new ServicioVenta(new ModeloVenta(pool));
  for (const [tipoDescuento, valorDescuento, esperado] of [["PORCENTAJE", 10, 0.09],
    ["VALOR_FIJO", 0.02, 0.08], ["PORCENTAJE", 15, 0.08], [null, 0, 0.10]]) {
    const venta = await servicio.crear({ ...datosVenta(turno, 1), tipoDescuento, valorDescuento }, 1);
    assert.equal(venta.total, esperado);
    assert.equal(venta.pagos[0].monto, esperado);
    const [[fila]] = await pool.execute("SELECT monto_total, monto_descuento FROM ventas WHERE id = ?", [venta.id]);
    assert.equal(Number(fila.monto_total), esperado);
    assert.equal(Number(fila.monto_descuento), venta.descuento.monto);
  }
  await assert.rejects(servicio.crear({ ...datosVenta(turno, 1), tipoDescuento: "VALOR_FIJO", valorDescuento: 1 }, 1), { codigo: "DESCUENTO_INVALIDO" });
  await assert.rejects(servicio.crear({ ...datosVenta(turno, 1), tipoDescuento: "PORCENTAJE", valorDescuento: 100 }, 1), { codigo: "TOTAL_VENTA_INVALIDO" });
  const [[producto]] = await pool.execute("SELECT stock_actual FROM productos WHERE id = 1");
  assert.equal(producto.stock_actual, 6);
});

test("SCRUM-15 y 22: historial por cliente, permisos y descarga HTTP de comprobante", async () => {
  const turno = await prepararVenta();
  await pool.execute(`INSERT INTO clientes (id, tipo_documento, numero_documento, nombres)
    VALUES (1, 'CC', '123456', 'Cliente Uno'), (2, 'CC', '654321', 'Cliente Dos')`);
  await pool.execute(`INSERT INTO usuarios (id, rol_id, nombres, apellidos, correo, hash_contrasena)
    VALUES (4, 2, 'Vendedor', 'Cuatro', 'cuatro@example.test', ?), (5, 2, 'Vendedor', 'Cinco', 'cinco@example.test', ?)`, [hash, hash]);
  await pool.execute("UPDATE productos SET nombre = ? WHERE id = 1", ['Papel <script>alert(1)</script>']);
  const servicio = new ServicioVenta(new ModeloVenta(pool));
  const propia = await servicio.crear({ ...datosVenta(turno, 1), clienteId: 1 }, 4);
  const ajena = await servicio.crear({ ...datosVenta(turno, 1), clienteId: 1 }, 5);
  await servicio.crear({ ...datosVenta(turno, 1), clienteId: 2 }, 4);
  const usuario = { id: 4, rol: "VENDEDOR" };
  const propias = await servicio.comprasCliente("1", {}, usuario);
  assert.deepEqual(propias.map((v) => v.id), [propia.id]);
  assert.equal(propias[0].items[0].cantidad, 1);
  assert.equal((await servicio.comprasCliente("1", {}, { id: 1, rol: "ADMINISTRADOR" })).length, 2);
  await servicio.anular(ajena.id, { motivo: "Prueba" }, { id: 1, rol: "ADMINISTRADOR" });
  assert.equal((await servicio.comprasCliente("1", { estado: "ANULADA" }, { id: 1, rol: "ADMINISTRADOR" }))[0].id, ajena.id);
  const sesion = await servicioAuth().iniciarSesion({ correo: "cuatro@example.test", contrasena: "ActualSegura123" });
  const app = crearAplicacion({ conexiones: pool, configuracion: { origenFrontend: "http://localhost:5173",
    entorno: "development", autenticacion: { secretoAcceso: secreto }, correo: {}, restablecimientoContrasena: {} } });
  const servidor = app.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  try {
    const solicitar = (ruta, autenticado = true) => fetch(`http://127.0.0.1:${servidor.address().port}${ruta}`, {
      headers: autenticado ? { Authorization: `Bearer ${sesion.tokenAcceso}` } : {},
    });
    assert.equal((await solicitar("/api/clientes/1/compras", false)).status, 401);
    const historial = await solicitar("/api/clientes/1/compras?pagina=1&limite=1");
    assert.equal(historial.status, 200);
    const datos = (await historial.json()).datos;
    assert.equal(datos.compras.length, 1);
    assert.equal(datos.paginacion.hayMas, false);
    assert.equal((await solicitar(`/api/ventas/${ajena.id}/comprobante?formato=html`)).status, 403);
    const descarga = await solicitar(`/api/ventas/${propia.id}/comprobante?formato=html&descargar=true`);
    assert.equal(descarga.status, 200);
    assert.match(descarga.headers.get("content-type"), /text\/html/);
    assert.match(descarga.headers.get("content-disposition"), /attachment.*\.html/);
    assert.match(descarga.headers.get("content-security-policy"), /default-src 'none'/);
    const html = await descarga.text();
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<script>"));
    const json = await solicitar(`/api/ventas/${propia.id}/comprobante`);
    assert.equal((await json.json()).datos.comprobante.id, propia.id);
  } finally { servidor.closeAllConnections(); await new Promise((resolve) => servidor.close(resolve)); }
});
