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
import {
  manejarError,
  manejarNoEncontrado,
} from "./middleware/error-handler.js";
import { crearMiddlewareAutenticacion } from "./middleware/auth.middleware.js";
import { crearRutasUsuarios } from "./routes/user.routes.js";
import { ModeloRol } from "./models/role.model.js";
import { ServicioRol } from "./services/role.service.js";
import { ControladorRol } from "./controllers/role.controller.js";
import { crearRutasRoles } from "./routes/role.routes.js";
import { ServicioUsuario } from "./services/user.service.js";
import { ControladorUsuario } from "./controllers/user.controller.js";
import { ModeloAuditoria } from "./models/audit.model.js";

// Construye la aplicación Express y conecta las piezas del patrón MVC.
// Recibir las conexiones y la configuración como parámetros facilita las pruebas.
export function crearAplicacion({ conexiones, configuracion }) {
  const aplicacion = express();

  aplicacion.disable("x-powered-by"); //desactiva la cabecera x-powered-by
  aplicacion.set("trust proxy", 1);

  // Protecciones y reglas comunes para todas las solicitudes.
  aplicacion.use(helmet());
  aplicacion.use(
    cors({
      //permite comunicación con el frontend
      origin: configuracion.origenFrontend,
      credentials: true,
    }),
  );
  aplicacion.use(express.json({ limit: "100kb" })); //limita el tamaño de las peticiones

  const modeloUsuario = new ModeloUsuario(conexiones);
  const modeloSesion = new ModeloSesion(conexiones);
  const modeloAuditoria = new ModeloAuditoria(conexiones);

  const modeloRol = new ModeloRol(conexiones);
  const servicioRol = new ServicioRol(modeloRol);
  const controladorRol = new ControladorRol(servicioRol);
  const servicioUsuario = new ServicioUsuario(
    modeloUsuario,
    modeloRol,
    modeloSesion,
    modeloAuditoria,
  );
  const controladorUsuario = new ControladorUsuario(servicioUsuario);

  // Se crean los modelos y se entregan al servicio responsable del login.
  const servicioAutenticacion = new ServicioAutenticacion({
    modeloUsuario,
    modeloIntentoAcceso: new ModeloIntentoAcceso(conexiones),
    modeloSesion,
    modeloConfiguracion: new ModeloConfiguracion(conexiones),
    configuracionAutenticacion: configuracion.autenticacion,
  });
  const controladorAutenticacion = new ControladorAutenticacion(
    servicioAutenticacion,
    configuracion,
  );

  const autenticar = crearMiddlewareAutenticacion({
    modeloUsuario,
    secretoAcceso: configuracion.autenticacion.secretoAcceso,
  });

  // Ruta para confirmar que la API se encuentra en ejecución.
  aplicacion.get("/api/health", (_solicitud, respuesta) => {
    respuesta.status(200).json({ exito: true, datos: { estado: "activo" } });
  });
  aplicacion.use(
    "/api/auth",
    crearRutasAutenticacion(controladorAutenticacion),
  );
  aplicacion.use(
    "/api/usuarios",
    crearRutasUsuarios({ autenticar, controladorUsuario }),
  );

  aplicacion.use(
    "/api/roles",
    crearRutasRoles({
      controladorRol,
      autenticar,
    }),
  );


  // Estos manejadores deben permanecer al final de todas las rutas.
  aplicacion.use(manejarNoEncontrado);
  aplicacion.use(manejarError);

  return aplicacion;
}
