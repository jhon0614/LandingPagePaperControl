// Adaptador HTTP del módulo de productos. La lógica de negocio permanece en
// ServicioProducto para poder probarla sin depender de Express.
export class ControladorProducto {
  constructor(servicio) {
    this.servicio = servicio;
  }
  listar = async (requerimiento, respuesta, siguiente) => {
    try {
      const productos = await this.servicio.listar(
        requerimiento.query.incluirInactivos,
        requerimiento.query.categoriaId,
      );
      return respuesta.json({ exito: true, datos: { productos } });
    } catch (error) {
      return siguiente(error);
    }
  };
  categorias = async (_requerimiento, respuesta, siguiente) => {
    try {
      const categorias = await this.servicio.categorias();
      return respuesta.json({ exito: true, datos: { categorias } });
    } catch (error) {
      return siguiente(error);
    }
  };
  obtener = async (requerimiento, respuesta, siguiente) => {
    try {
      const producto = await this.servicio.obtener(requerimiento.params.id);
      return respuesta.json({ exito: true, datos: { producto } });
    } catch (error) {
      return siguiente(error);
    }
  };
  crear = async (requerimiento, respuesta, siguiente) => {
    try {
      const producto = await this.servicio.crear(
        requerimiento.body,
        requerimiento.usuario.id,
      );
      return respuesta.status(201).json({ exito: true, datos: { producto } });
    } catch (error) {
      return siguiente(error);
    }
  };
  actualizar = async (requerimiento, respuesta, siguiente) => {
    try {
      const producto = await this.servicio.actualizar(
        requerimiento.params.id,
        requerimiento.body,
        requerimiento.usuario.id,
      );
      return respuesta.json({ exito: true, datos: { producto } });
    } catch (error) {
      return siguiente(error);
    }
  };
  cambiarEstado = async (requerimiento, respuesta, siguiente) => {
    try {
      const producto = await this.servicio.cambiarEstado(
        requerimiento.params.id,
        requerimiento.body.estaActivo,
      );
      return respuesta.json({ exito: true, datos: { producto } });
    } catch (error) {
      return siguiente(error);
    }
  };
  eliminar = async (requerimiento, respuesta, siguiente) => {
    try {
      const resultado = await this.servicio.eliminar(
        requerimiento.params.id,
        requerimiento.usuario.id,
      );
      return respuesta.json({ exito: true, datos: resultado });
    } catch (error) {
      return siguiente(error);
    }
  };
  movimientos = async (requerimiento, respuesta, siguiente) => {
    try {
      const movimientos = await this.servicio.movimientos(
        requerimiento.params.id,
      );
      return respuesta.json({ exito: true, datos: { movimientos } });
    } catch (error) {
      return siguiente(error);
    }
  };
  registrarMovimiento = async (requerimiento, respuesta, siguiente) => {
    try {
      const movimiento = await this.servicio.registrarMovimiento(
        requerimiento.params.id,
        requerimiento.body,
        requerimiento.usuario.id,
      );
      return respuesta
        .status(201)
        .json({ exito: true, datos: { movimiento } });
    } catch (error) {
      return siguiente(error);
    }
  };
  alertas = async (_requerimiento, respuesta, siguiente) => {
    try {
      const alertas = await this.servicio.alertas();
      return respuesta.json({ exito: true, datos: { alertas } });
    } catch (error) {
      return siguiente(error);
    }
  };
  proveedores = async (requerimiento, respuesta, siguiente) => {
    try {
      const proveedores = await this.servicio.proveedores(
        requerimiento.params.id,
      );
      return respuesta.json({ exito: true, datos: { proveedores } });
    } catch (error) {
      return siguiente(error);
    }
  };
  asociarProveedor = async (requerimiento, respuesta, siguiente) => {
    try {
      const proveedores = await this.servicio.asociarProveedor(
        requerimiento.params.id,
        requerimiento.body.proveedorId,
      );
      return respuesta
        .status(201)
        .json({ exito: true, datos: { proveedores } });
    } catch (error) {
      return siguiente(error);
    }
  };
  quitarProveedor = async (requerimiento, respuesta, siguiente) => {
    try {
      await this.servicio.quitarProveedor(
        requerimiento.params.id,
        requerimiento.params.proveedorId,
      );
      return respuesta.json({ exito: true, datos: { eliminado: true } });
    } catch (error) {
      return siguiente(error);
    }
  };
}
