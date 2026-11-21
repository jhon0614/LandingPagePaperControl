import { cargarConfiguracion } from "./config/env.js";
import { BaseDatos } from "./config/database.js";
import { crearAplicacion } from "./app.js";
import { crearCacheProveedores } from "./services/supplier-cache.service.js";
import { crearCacheListado } from "./services/list-cache.service.js";

// Carga la configuración y obtiene las conexiones Singleton antes de abrir el puerto.
const configuracion = cargarConfiguracion();
const baseDatos = BaseDatos.obtenerInstancia(configuracion.baseDatos);
const cacheProveedores = crearCacheProveedores(configuracion.cacheRedis);
const cacheCategorias = crearCacheListado(configuracion.cacheRedis, {
  prefijo: "papercontrol:cache:categorias:v1", nombre: "Categorías",
});
const cacheProductos = crearCacheListado({ ...configuracion.cacheRedis, ttl: configuracion.cacheRedis.ttlProductos }, {
  prefijo: "papercontrol:cache:productos:v1", nombre: "Productos",
});

try {
  // La API solo inicia cuando se confirma que MySQL responde.
  await baseDatos.comprobarConexion();
  await cacheProveedores?.iniciar();
  await cacheCategorias?.iniciar();
  await cacheProductos?.iniciar();
  const aplicacion = crearAplicacion({
    conexiones: baseDatos.conexiones,
    configuracion,
    cacheProveedores,
    cacheCategorias,
    cacheProductos,
  });
  const detenerTrabajador = aplicacion.locals.iniciarTrabajadorCorreo();
  const servidor = aplicacion.listen(configuracion.puerto, () => {
    console.log(
      `PaperControl API disponible en http://localhost:${configuracion.puerto}`,
    );
  });

  // Cierra el servidor y la base de datos sin interrumpir consultas en curso.
  async function cerrarServidor(senal) {
    console.log(`${senal} recibida. Cerrando servidor...`);
    servidor.close(async () => {
      await detenerTrabajador();
      cacheProveedores?.cerrar();
      cacheCategorias?.cerrar();
      cacheProductos?.cerrar();
      await baseDatos.cerrar();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => cerrarServidor("SIGINT"));
  process.on("SIGTERM", () => cerrarServidor("SIGTERM"));
} catch (error) {
  // Evita dejar el servidor abierto parcialmente cuando falla la conexión.
  console.error("No fue posible iniciar PaperControl API:", error.message);
  cacheProveedores?.cerrar();
  cacheCategorias?.cerrar();
  cacheProductos?.cerrar();
  await baseDatos.cerrar();
  process.exit(1);
}
