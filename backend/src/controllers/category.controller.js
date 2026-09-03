export class ControladorCategoria {
  constructor(servicio) { this.servicio = servicio; }
  listar = async (_req, res) => res.json({
    exito: true, datos: { categorias: await this.servicio.listar() },
  });
  crear = async (req, res) => res.status(201).json({
    exito: true, datos: { categoria: await this.servicio.crear(req.body) },
  });
  actualizar = async (req, res) => res.json({
    exito: true, datos: { categoria: await this.servicio.actualizar(req.params.id, req.body) },
  });
  eliminar = async (req, res) => {
    await this.servicio.eliminar(req.params.id);
    res.status(204).end();
  };
}
