import mysql from "mysql2/promise";

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
      queueLimit: 0,
      charset: "utf8mb4",
      timezone: "Z",
      decimalNumbers: true,
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

  async cerrar() {
    // Libera correctamente las conexiones cuando se apaga el servidor.
    await this.conexiones.end();
  }
}
