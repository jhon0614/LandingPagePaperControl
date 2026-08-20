import "dotenv/config";

// Lee una variable obligatoria y detiene el inicio si no fue configurada.
function obligatoria(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }
  return valor;
}

// Convierte valores como el puerto o los tiempos de sesión en números válidos.
function enteroPositivo(nombre, valorDefecto) {
  const valorOriginal = process.env[nombre] ?? String(valorDefecto); //permite omitir process.env y usar valorDefecto
  const valor = Number(valorOriginal);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${nombre} debe ser un entero mayor que cero.`);
  }
  return valor;
}

// Reúne la configuración del proyecto en un solo objeto para compartirla
// entre el servidor, la base de datos y el módulo de autenticación.
export function cargarConfiguracion() {
  const entorno = process.env.NODE_ENV ?? "development";

  return Object.freeze({ //freeze para que no se pueda modificar
    entorno,
    puerto: enteroPositivo("PORT", 3000),
    origenFrontend: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    baseDatos: Object.freeze({
      servidor: obligatoria("DB_HOST"),
      puerto: enteroPositivo("DB_PORT", 3306),
      nombre: obligatoria("DB_NAME"),
      usuario: obligatoria("DB_USER"),
      contrasena: obligatoria("DB_PASSWORD"),
      limiteConexiones: enteroPositivo("DB_CONNECTION_LIMIT", 10),
    }),
    autenticacion: Object.freeze({
      secretoAcceso: obligatoria("JWT_ACCESS_SECRET"),
      minutosAcceso: enteroPositivo("JWT_ACCESS_MINUTES", 15),
      diasRenovacion: enteroPositivo("REFRESH_TOKEN_DAYS", 7),
    }),
    restablecimientoContrasena: Object.freeze({
      // El servicio trabaja en milisegundos; .env conserva un valor fácil de leer.
      tiempoTokenMs: enteroPositivo("PASSWORD_RESET_MINUTES", 30) * 60 * 1000,
      urlFrontend: obligatoria("FRONTEND_RESET_PASSWORD_URL"),
    }),
    correo: Object.freeze({
      servidor: obligatoria("MAIL_HOST"),
      puerto: enteroPositivo("MAIL_PORT", 587),
      // Convierte el texto del archivo .env en un booleano real.
      seguro: process.env.MAIL_SECURE === "true",
      usuario: obligatoria("MAIL_USER"),
      contrasena: obligatoria("MAIL_PASSWORD"),
      remitente: obligatoria("MAIL_FROM"),
    }),
  });
}
