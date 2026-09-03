import bcrypt from "bcryptjs";
import { cargarConfiguracion } from "../src/config/env.js";
import { BaseDatos } from "../src/config/database.js";

// Este script crea el primer usuario administrador usando los datos del .env.
// Se ejecuta manualmente con: npm run create-admin
const configuracion = cargarConfiguracion();
const nombres = process.env.ADMIN_FIRST_NAME?.trim();
const apellidos = process.env.ADMIN_LAST_NAME?.trim();
const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const contrasena = process.env.ADMIN_PASSWORD;

if (!nombres || !apellidos || !correo || !contrasena) {
  throw new Error("Faltan ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL o ADMIN_PASSWORD.");
}

// Se exige una contraseña razonable antes de generar el hash.
if (!/^\S+@\S+\.\S+$/.test(correo)) { //formato de correo indica que hay texto, luego @, luego texto, luego . y luego texto (com, es...) y valida que si sea un correo valido
  throw new Error("ADMIN_EMAIL no tiene un formato válido.");
}
if (contrasena.length < 12) {
  throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres.");
}
if (Buffer.byteLength(contrasena, "utf8") > 72) {
  throw new Error("ADMIN_PASSWORD no puede superar 72 bytes UTF-8.");
}

const baseDatos = BaseDatos.obtenerInstancia(configuracion.baseDatos);

try {
  // El rol debe existir previamente, por eso primero se ejecuta seed.sql.
  const [roles] = await baseDatos.conexiones.execute(
    "SELECT id FROM roles WHERE nombre = 'ADMINISTRADOR' LIMIT 1",
  );
  if (!roles[0]) {
    throw new Error("No existe el rol ADMINISTRADOR. Ejecute database/seed.sql primero.");
  }

  // La contraseña original nunca se inserta en la base de datos.
  const hashContrasena = await bcrypt.hash(contrasena, 12);
  await baseDatos.conexiones.execute(
    `INSERT INTO usuarios (rol_id, nombres, apellidos, correo, hash_contrasena)
     VALUES (?, ?, ?, ?, ?)`,
    [roles[0].id, nombres, apellidos, correo, hashContrasena],
  );
  console.log(`Administrador creado correctamente: ${correo}`);
} catch (error) {
  // Un correo no puede repetirse porque usuarios.correo tiene una restricción única.
  if (error.code === "ER_DUP_ENTRY") {
    console.error("Ya existe un usuario con ese correo.");
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
} finally {
  // El script termina después de liberar el grupo de conexiones.
  await baseDatos.cerrar();
}
