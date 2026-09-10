import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";

// Mantiene un único grupo de conexiones durante toda la ejecución de la API.
// Este grupo atiende varias consultas sin abrir una conexión nueva cada vez.
export class BaseDatos {
  static #instancia; //método privado para que no se esten generando nuevas instancias

  constructor(configuracion) {
    if (BaseDatos.#instancia) {// si ya existe una instancia, no se crea otra
      throw new Error("Use BaseDatos.obtenerInstancia() para obtener el grupo Singleton.");
    }

    // Crea el grupo de conexiones utilizando los datos definidos en .env.
    this.conexiones = mysql.createPool({
      host: configuracion.servidor,
      port: configuracion.puerto,
      database: configuracion.nombre,
      user: configuracion.usuario,
      password: configuracion.contrasena,
      waitForConnections: true,
      connectionLimit: configuracion.limiteConexiones,
      queueLimit: configuracion.limiteCola ?? 50,
      connectTimeout: configuracion.tiempoConexionMs ?? 10000,
      ...(configuracion.tls ? { ssl: { rejectUnauthorized: true,
        ...(configuracion.certificadoCa ? { ca: readFileSync(configuracion.certificadoCa, "utf8") } : {}),
      } } : {}),
      charset: "utf8mb4",
      // Indica a mysql2 la zona real de los DATETIME de MySQL. Así los Date
      // enviados al API representan el instante correcto y el frontend puede
      // formatearlos en America/Bogota sin aplicar dos veces el desfase.
      timezone: configuracion.zonaHoraria,
      decimalNumbers: false,
    });
    this.conexiones.on("connection", (conexion) => {
      // Se encola antes de las consultas de la aplicación en cada conexión nueva.
      conexion.query("SET SESSION time_zone = ?, max_execution_time = ?, innodb_lock_wait_timeout = ?",
        [configuracion.zonaHoraria === "Z" ? "+00:00" : configuracion.zonaHoraria ?? "-05:00",
          configuracion.tiempoConsultaMs ?? 10000, configuracion.esperaBloqueoSegundos ?? 5],
        (error) => { if (error) conexion.destroy(); });
    });
  }

  static obtenerInstancia(configuracion) {
    // La primera llamada crea la instancia y las siguientes reutilizan la misma.
    if (!BaseDatos.#instancia) {
      if (!configuracion) {
        throw new Error("La configuración es obligatoria al inicializar la conexión.");
      }
      BaseDatos.#instancia = new BaseDatos(configuracion); // crea la instancia para el singleton
    }
    return BaseDatos.#instancia;
  }

  async comprobarConexion() {
    // Consulta que permite comprobar si MySQL está disponible.
    await this.conexiones.query("SELECT 1");
  }

  async comprobarEsquema() {
    try {
      await this.conexiones.query("SELECT clave FROM limites_solicitudes LIMIT 0");
      await this.conexiones.query("SELECT id FROM cola_recuperacion LIMIT 0");
      await this.conexiones.query("SELECT clave FROM solicitudes_venta LIMIT 0");
    } catch (error) {
      if (error.code === "ER_NO_SUCH_TABLE")
        throw new Error("Falta aplicar database/migrations/2026-09-09-seguridad-backend.sql antes de iniciar la API.");
      throw error;
    }
  }

  async cerrar() {
    // Libera correctamente las conexiones cuando se apaga el servidor.
    await this.conexiones.end();
  }
}
