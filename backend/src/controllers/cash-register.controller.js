export class ControladorTurnoCaja {
  constructor(servicio) { this.servicio = servicio; }

  abrir = async (req, res, next) => {
    try {
      const turno = await this.servicio.abrir(req.body.montoInicial, req.usuario.id);
      return res.status(201).json({ exito: true, datos: { turno } });
    } catch (error) { return next(error); }
  };

  actual = async (_req, res, next) => {
    try {
      const turno = await this.servicio.actual();
      return res.status(200).json({ exito: true, datos: { turno } });
    } catch (error) { return next(error); }
  };

  resumen = async (_req, res, next) => {
    try {
      const resumen = await this.servicio.resumen();
      return res.status(200).json({ exito: true, datos: { resumen } });
    } catch (error) { return next(error); }
  };

  gastos = async (_req, res, next) => {
    try {
      const gastos = await this.servicio.gastos();
      return res.status(200).json({ exito: true, datos: { gastos } });
    } catch (error) { return next(error); }
  };

  registrarGasto = async (req, res, next) => {
    try {
      const gasto = await this.servicio.registrarGasto(req.body, req.usuario.id);
      return res.status(201).json({ exito: true, datos: { gasto } });
    } catch (error) { return next(error); }
  };

  eliminarGasto = async (req, res, next) => {
    try {
      await this.servicio.eliminarGasto(req.params.id, req.usuario);
      return res.status(200).json({ exito: true, datos: { eliminado: true } });
    } catch (error) { return next(error); }
  };

  cerrar = async (req, res, next) => {
    try {
      const cuadre = await this.servicio.cerrar(req.body.montoContado, req.usuario.id);
      return res.status(200).json({ exito: true, datos: { cuadre } });
    } catch (error) { return next(error); }
  };

  historial = async (req, res, next) => {
    try {
      const turnos = await this.servicio.historial(req.query);
      return res.status(200).json({ exito: true, datos: { turnos } });
    } catch (error) { return next(error); }
  };
}
