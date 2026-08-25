import { cargarConfiguracion } from "./config/env.js";
import { BaseDatos } from "./config/database.js";
import { crearAplicacion } from "./app.js";

// Carga la configuración y obtiene las conexiones Singleton antes de abrir el puerto.
const configuracion = cargarConfiguracion();
const baseDatos = BaseDatos.obtenerInstancia(configuracion.baseDatos);

try {
  // La API solo inicia cuando se confirma que MySQL responde.
  await baseDatos.comprobarConexion();
  const aplicacion = crearAplicacion({
    conexiones: baseDatos.conexiones,
    configuracion,
  });
  const servidor = aplicacion.listen(configuracion.puerto, () => {
    console.log(
      `PaperControl API disponible en http://localhost:${configuracion.puerto}`,
    );
  });

  // Cierra el servidor y la base de datos sin interrumpir consultas en curso.
  async function cerrarServidor(senal) {
    console.log(`${senal} recibida. Cerrando servidor...`);
    servidor.close(async () => {
      await baseDatos.cerrar();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => cerrarServidor("SIGINT"));
  process.on("SIGTERM", () => cerrarServidor("SIGTERM"));
} catch (error) {
  // Evita dejar el servidor abierto parcialmente cuando falla la conexión.
  console.error("No fue posible iniciar PaperControl API:", error.message);
  await baseDatos.cerrar();
  process.exit(1);
}
