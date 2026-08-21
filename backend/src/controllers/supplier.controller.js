// Convierte los resultados del servicio al formato uniforme { exito, datos }.
export class ControladorProveedor {
  constructor(servicio) {
    this.servicio = servicio;
  }
  listar = async (_requerimiento, respuesta, siguiente) => {
    try {
      const proveedores = await this.servicio.listar();
      return respuesta.json({ exito: true, datos: { proveedores } });
    } catch (error) {
      return siguiente(error);
    }
  };
  obtener = async (requerimiento, respuesta, siguiente) => {
    try {
      const proveedor = await this.servicio.obtener(requerimiento.params.id);
      return respuesta.json({ exito: true, datos: { proveedor } });
    } catch (error) {
      return siguiente(error);
    }
  };
  crear = async (requerimiento, respuesta, siguiente) => {
    try {
      const proveedor = await this.servicio.crear(requerimiento.body);
      return respuesta.status(201).json({ exito: true, datos: { proveedor } });
    } catch (error) {
      return siguiente(error);
    }
  };
  actualizar = async (requerimiento, respuesta, siguiente) => {
    try {
      const proveedor = await this.servicio.actualizar(
        requerimiento.params.id,
        requerimiento.body,
      );
      return respuesta.json({ exito: true, datos: { proveedor } });
    } catch (error) {
      return siguiente(error);
    }
  };
  eliminar = async (requerimiento, respuesta, siguiente) => {
    try {
      await this.servicio.eliminar(requerimiento.params.id);
      return respuesta.json({ exito: true, datos: { eliminado: true } });
    } catch (error) {
      return siguiente(error);
    }
  };
}
