// Traduce las solicitudes HTTP de ventas a llamadas del servicio; las reglas de
// inventario, permisos y caja permanecen fuera del controlador.
export class ControladorVenta {
  constructor(servicio) {
    this.servicio = servicio;
  }

  // Expone la configuración vigente para construir las opciones de cobro.
  metodosPago = async (_requerimiento, respuesta, siguiente) => {
    try {
      const metodos = await this.servicio.metodosPago();
      return respuesta.status(200).json({ exito: true, datos: { metodos } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Solo los responsables autorizados llegan aquí desde la ruta administrativa.
  actualizarMetodoPago = async (requerimiento, respuesta, siguiente) => {
    try {
      const metodo = await this.servicio.actualizarMetodoPago(
        requerimiento.params.id,
        requerimiento.body.estaActivo,
      );
      return respuesta.status(200).json({ exito: true, datos: { metodo } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Registra una venta usando el cuerpo validado y el usuario autenticado.
  crear = async (requerimiento, respuesta, siguiente) => {
    try {
      const venta = await this.servicio.crear(
        requerimiento.body,
        requerimiento.usuario.id,
      );
      return respuesta.status(201).json({ exito: true, datos: { venta } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Limita el listado al vendedor identificado por la sesión.
  propias = async (requerimiento, respuesta, siguiente) => {
    try {
      const ventas = await this.servicio.propias(requerimiento.usuario.id);
      return respuesta.status(200).json({ exito: true, datos: { ventas } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Entrega al servicio los filtros opcionales recibidos en la URL.
  historial = async (requerimiento, respuesta, siguiente) => {
    try {
      const ventas = await this.servicio.historial(requerimiento.query);
      return respuesta.status(200).json({ exito: true, datos: { ventas } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // El servicio comprueba si el usuario puede consultar la venta solicitada.
  comprobante = async (requerimiento, respuesta, siguiente) => {
    try {
      const comprobante = await this.servicio.comprobante(
        requerimiento.params.id,
        requerimiento.usuario,
      );
      return respuesta
        .status(200)
        .json({ exito: true, datos: { comprobante } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Solicita la anulación junto con el motivo y el responsable autenticado.
  anular = async (requerimiento, respuesta, siguiente) => {
    try {
      const venta = await this.servicio.anular(
        requerimiento.params.id,
        requerimiento.body,
        requerimiento.usuario,
      );
      return respuesta.status(200).json({ exito: true, datos: { venta } });
    } catch (error) {
      return siguiente(error);
    }
  };
}
