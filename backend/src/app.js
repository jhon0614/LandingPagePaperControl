import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ModeloUsuario } from "./models/user.model.js";
import { ModeloIntentoAcceso } from "./models/login-attempt.model.js";
import { ModeloSesion } from "./models/session.model.js";
import { ModeloConfiguracion } from "./models/setting.model.js";
import { ServicioAutenticacion } from "./services/auth.service.js";
import { ControladorAutenticacion } from "./controllers/auth.controller.js";
import { crearRutasAutenticacion } from "./routes/auth.routes.js";
import { manejarError, manejarNoEncontrado } from "./middleware/error-handler.js";

// Construye la aplicación Express y conecta las piezas del patrón MVC.
// Recibir las conexiones y la configuración como parámetros facilita las pruebas.
export function crearAplicacion({ conexiones, configuracion }) {
  const aplicacion = express();
  aplicacion.disable("x-powered-by");//desactiva la cabecera x-powered-by
  aplicacion.set("trust proxy", 1);

  // Protecciones y reglas comunes para todas las solicitudes.
  aplicacion.use(helmet());
  aplicacion.use(
    cors({ //permite comunicación con el frontend 
    origin: configuracion.origenFrontend,
      credentials: true,
    }),
  );
  aplicacion.use(express.json({ limit: "100kb" })); //limita el tamaño de las peticiones

  // Se crean los modelos y se entregan al servicio responsable del login.
  const servicioAutenticacion = new ServicioAutenticacion({
    modeloUsuario: new ModeloUsuario(conexiones),
    modeloIntentoAcceso: new ModeloIntentoAcceso(conexiones),
    modeloSesion: new ModeloSesion(conexiones),
    modeloConfiguracion: new ModeloConfiguracion(conexiones),
    configuracionAutenticacion: configuracion.autenticacion,
  });
  const controladorAutenticacion = new ControladorAutenticacion(servicioAutenticacion, configuracion);

  // Ruta para confirmar que la API se encuentra en ejecución.
  aplicacion.get("/api/health", (_solicitud, respuesta) => {
    respuesta.status(200).json({ exito: true, datos: { estado: "activo" } });
  });
  aplicacion.use("/api/auth", crearRutasAutenticacion(controladorAutenticacion));
  // Estos manejadores deben permanecer al final de todas las rutas.
  aplicacion.use(manejarNoEncontrado);
  aplicacion.use(manejarError);

  return aplicacion;
}
