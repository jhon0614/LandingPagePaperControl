export class ControladorVenta {
  constructor(servicio) { this.servicio = servicio; }

  crear = async (req, res, next) => {
    try {
      const venta = await this.servicio.crear(req.body, req.usuario.id);
      return res.status(201).json({ exito: true, datos: { venta } });
    } catch (error) { return next(error); }
  };

  propias = async (req, res, next) => {
    try {
      const ventas = await this.servicio.propias(req.usuario.id);
      return res.status(200).json({ exito: true, datos: { ventas } });
    } catch (error) { return next(error); }
  };

  historial = async (req, res, next) => {
    try {
      const ventas = await this.servicio.historial(req.query);
      return res.status(200).json({ exito: true, datos: { ventas } });
    } catch (error) { return next(error); }
  };

  comprobante = async (req, res, next) => {
    try {
      const comprobante = await this.servicio.comprobante(req.params.id, req.usuario);
      return res.status(200).json({ exito: true, datos: { comprobante } });
    } catch (error) { return next(error); }
  };

  anular = async (req, res, next) => {
    try {
      const venta = await this.servicio.anular(req.params.id, req.body, req.usuario);
      return res.status(200).json({ exito: true, datos: { venta } });
    } catch (error) { return next(error); }
  };
}
