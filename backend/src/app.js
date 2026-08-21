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
import { ModeloRestablecimientoContrasena } from "./models/password-reset.model.js";
import { ServicioContrasena } from "./services/password.service.js";
import { ServicioCorreo } from "./services/email.service.js";
import { ControladorContrasena } from "./controllers/password.controller.js";
import { ModeloCliente } from "./models/client.model.js";
import { ServicioCliente } from "./services/client.service.js";
import { ControladorCliente } from "./controllers/client.controller.js";
import { crearRutasClientes } from "./routes/client.routes.js";
import { ModeloTurnoCaja } from "./models/cash-register.model.js";
import { ServicioTurnoCaja } from "./services/cash-register.service.js";
import { ControladorTurnoCaja } from "./controllers/cash-register.controller.js";
import {
  crearRutasGastosCaja,
  crearRutasTurnosCaja,
} from "./routes/cash-register.routes.js";
import { ModeloVenta } from "./models/sale.model.js";
import { ServicioVenta } from "./services/sale.service.js";
import { ControladorVenta } from "./controllers/sale.controller.js";
import { crearRutasVentas } from "./routes/sale.routes.js";
import { ModeloProducto } from "./models/product.model.js";
import { ServicioProducto } from "./services/product.service.js";
import { ControladorProducto } from "./controllers/product.controller.js";
import { crearRutasProductos } from "./routes/product.routes.js";
import { ModeloProveedor } from "./models/supplier.model.js";
import { ServicioProveedor } from "./services/supplier.service.js";
import { ControladorProveedor } from "./controllers/supplier.controller.js";
import { crearRutasProveedores } from "./routes/supplier.routes.js";
import { ModeloReporte } from "./models/report.model.js";
import { ServicioReporte } from "./services/report.service.js";
import { ControladorReporte } from "./controllers/report.controller.js";
import { crearRutasReportes } from "./routes/report.routes.js";

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
  // Este modelo utiliza la tabla de tokens temporales ya incluida en el esquema.
  const modeloRestablecimiento = new ModeloRestablecimientoContrasena(
    conexiones,
  );

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
  const servicioCliente = new ServicioCliente(
    new ModeloCliente(conexiones),
    modeloAuditoria,
  );
  const controladorCliente = new ControladorCliente(servicioCliente);
  const controladorTurnoCaja = new ControladorTurnoCaja(
    new ServicioTurnoCaja(new ModeloTurnoCaja(conexiones)),
  );
  const controladorVenta = new ControladorVenta(
    new ServicioVenta(new ModeloVenta(conexiones)),
  );
  const controladorProducto = new ControladorProducto(
    new ServicioProducto(new ModeloProducto(conexiones)),
  );
  const controladorProveedor = new ControladorProveedor(
    new ServicioProveedor(new ModeloProveedor(conexiones)),
  );
  const controladorReporte = new ControladorReporte(
    new ServicioReporte(new ModeloReporte(conexiones)),
  );

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
  const servicioCorreo = new ServicioCorreo(
    configuracion.correo,
    configuracion.restablecimientoContrasena,
  );
  // El servicio coordina usuarios, tokens, correo y auditoría sin depender de Express.
  const servicioContrasena = new ServicioContrasena({
    modeloUsuario,
    modeloRestablecimiento,
    servicioCorreo,
    modeloAuditoria,
    configuracion: configuracion.restablecimientoContrasena,
  });
  const controladorContrasena = new ControladorContrasena(servicioContrasena);

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
    crearRutasAutenticacion({
      controladorAutenticacion,
      controladorContrasena,
      autenticar,
    }),
  );
  aplicacion.use(
    "/api/usuarios",
    crearRutasUsuarios({
      autenticar,
      controladorUsuario,
      controladorContrasena,
    }),
  );

  aplicacion.use(
    "/api/roles",
    crearRutasRoles({
      controladorRol,
      autenticar,
    }),
  );

  aplicacion.use(
    "/api/clientes",
    crearRutasClientes({
      autenticar,
      controladorCliente,
    }),
  );

  aplicacion.use(
    "/api/turnos-caja",
    crearRutasTurnosCaja({ autenticar, controlador: controladorTurnoCaja }),
  );
  aplicacion.use(
    "/api/gastos-caja",
    crearRutasGastosCaja({ autenticar, controlador: controladorTurnoCaja }),
  );
  aplicacion.use(
    "/api/ventas",
    crearRutasVentas({ autenticar, controlador: controladorVenta }),
  );
  aplicacion.use(
    "/api/productos",
    crearRutasProductos({ autenticar, controlador: controladorProducto }),
  );
  aplicacion.use(
    "/api/proveedores",
    crearRutasProveedores({ autenticar, controlador: controladorProveedor }),
  );
  aplicacion.use(
    "/api/reportes",
    crearRutasReportes({ autenticar, controlador: controladorReporte }),
  );

  // Estos manejadores deben permanecer al final de todas las rutas.
  aplicacion.use(manejarNoEncontrado);
  aplicacion.use(manejarError);

  return aplicacion;
}
