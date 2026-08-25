// Recibe las solicitudes HTTP de clientes y delega validaciones de negocio,
// persistencia y auditoría al servicio correspondiente.
export class ControladorCliente {
  constructor(servicioCliente) {
    this.servicioCliente = servicioCliente;
  }

  crear = async (requerimiento, respuesta, siguiente) => {
    try {
      // El body ya fue depurado por el esquema Zod de la ruta.
      const cliente = await this.servicioCliente.crear(requerimiento.body);
      return respuesta.status(201).json({ exito: true, datos: { cliente } });
    } catch (error) {
      return siguiente(error);
    }
  };

  cambiarEstado = async (requerimiento, respuesta, siguiente) => {
    try {
      // Incluye responsable e IP para registrar el cambio en auditoría.
      const cliente = await this.servicioCliente.cambiarEstado(
        requerimiento.params.id,
        requerimiento.body.estaActivo,
        requerimiento.usuario.id,
        requerimiento.ip,
      );

      return respuesta.status(200).json({ exito: true, datos: { cliente } });
    } catch (error) {
      return siguiente(error);
    }
  };

  buscar = async (requerimiento, respuesta, siguiente) => {
    try {
      // La búsqueda llega como query string y el servicio se encarga de normalizarla.
      const termino = requerimiento.query.buscar;
      // Los vendedores consultan únicamente clientes utilizables en una venta.
      const puedeAdministrar = ["ADMINISTRADOR", "DUENO"].includes(
        requerimiento.usuario.rol,
      );
      const clientes = await this.servicioCliente.buscar(
        termino,
        puedeAdministrar
          ? requerimiento.query.incluirInactivos
          : undefined,
      );

      return respuesta.status(200).json({
        exito: true,
        datos: {
          clientes,
        },
      });
    } catch (error) {
      return siguiente(error);
    }
  };

  buscarPorId = async (requerimiento, respuesta, siguiente) => {
    try {
      const cliente = await this.servicioCliente.buscarPorId(
        requerimiento.params.id,
      );
      return respuesta.status(200).json({ exito: true, datos: { cliente } });
    } catch (error) {
      return siguiente(error);
    }
  };

  eliminar = async (requerimiento, respuesta, siguiente) => {
    try {
      await this.servicioCliente.eliminar(
        requerimiento.params.id,
        requerimiento.usuario.id,
        requerimiento.ip,
      );
      return respuesta.status(204).send();
    } catch (error) {
      return siguiente(error);
    }
  };

  actualizar = async (requerimiento, respuesta, siguiente) => {
    try {
      // El controlador reúne los datos HTTP y delega las reglas al servicio.
      const clienteId = requerimiento.params.id;
      const datos = requerimiento.body;
      const administradorId = requerimiento.usuario.id;

      const cliente = await this.servicioCliente.actualizar(
        clienteId,
        datos,
        administradorId,
        requerimiento.ip,
      );

      // Responde con la versión del cliente que quedó guardada.
      return respuesta.status(200).json({
        exito: true,
        datos: {
          cliente,
        },
      });
    } catch (error) {
      return siguiente(error);
    }
  };
}
