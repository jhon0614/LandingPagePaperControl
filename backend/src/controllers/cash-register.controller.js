export class ControladorTurnoCaja {
  constructor(servicio) {
    this.servicio = servicio;
  }

  // Recibe el monto inicial y el usuario que abre el turno de caja.
  abrir = async (requerimiento, respuesta, siguiente) => {
    try {
      const turno = await this.servicio.abrir(
        requerimiento.body.montoInicial,
        requerimiento.usuario.id,
      );
      // Responde 201 porque se creó un nuevo turno.
      return respuesta.status(201).json({ exito: true, datos: { turno } });
    } catch (error) {
      // Delega el error al manejador general de Express.
      return siguiente(error);
    }
  };

  // Consulta el turno que se encuentra abierto actualmente.
  actual = async (_requerimiento, respuesta, siguiente) => {
    try {
      const turno = await this.servicio.actual();
      return respuesta.status(200).json({ exito: true, datos: { turno } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Obtiene el resumen financiero del turno abierto.
  resumen = async (_requerimiento, respuesta, siguiente) => {
    try {
      const resumen = await this.servicio.resumen();
      return respuesta.status(200).json({ exito: true, datos: { resumen } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Lista los gastos registrados en el turno abierto.
  gastos = async (_requerimiento, respuesta, siguiente) => {
    try {
      const gastos = await this.servicio.gastos();
      return respuesta.status(200).json({ exito: true, datos: { gastos } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Envía al servicio los datos validados y quién registró el gasto.
  registrarGasto = async (requerimiento, respuesta, siguiente) => {
    try {
      const gasto = await this.servicio.registrarGasto(
        requerimiento.body,
        requerimiento.usuario.id,
      );
      return respuesta.status(201).json({ exito: true, datos: { gasto } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Solicita eliminar el gasto indicado y entrega el usuario autenticado.
  eliminarGasto = async (requerimiento, respuesta, siguiente) => {
    try {
      await this.servicio.eliminarGasto(
        requerimiento.params.id,
        requerimiento.usuario,
      );
      return respuesta
        .status(200)
        .json({ exito: true, datos: { eliminado: true } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Recibe el efectivo contado y el usuario responsable del cierre.
  cerrar = async (requerimiento, respuesta, siguiente) => {
    try {
      const cuadre = await this.servicio.cerrar(
        requerimiento.body.montoContado,
        requerimiento.usuario.id,
      );
      return respuesta.status(200).json({ exito: true, datos: { cuadre } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Envía los filtros de la URL al servicio para consultar turnos anteriores.
  historial = async (requerimiento, respuesta, siguiente) => {
    try {
      const turnos = await this.servicio.historial(requerimiento.query);
      return respuesta.status(200).json({ exito: true, datos: { turnos } });
    } catch (error) {
      return siguiente(error);
    }
  };
}
