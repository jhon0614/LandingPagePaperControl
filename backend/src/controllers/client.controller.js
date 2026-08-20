export class ControladorCliente {
  constructor(servicioCliente) {
    this.servicioCliente = servicioCliente;
  }

  crear = async (solicitud, respuesta, siguiente) => {
    try {
      const cliente = await this.servicioCliente.crear(solicitud.body);
      return respuesta.status(201).json({ exito: true, datos: { cliente } });
    } catch (error) {
      return siguiente(error);
    }
  };

  cambiarEstado = async (solicitud, respuesta, siguiente) => {
    try {
      const cliente = await this.servicioCliente.cambiarEstado(
        solicitud.params.id,
        solicitud.body.estaActivo,
        solicitud.usuario.id,
        solicitud.ip,
      );

      return respuesta.status(200).json({ exito: true, datos: { cliente } });
    } catch (error) {
      return siguiente(error);
    }
  };

  buscar = async (solicitud, respuesta, siguiente) => {
    try {
      const termino = solicitud.query.buscar; //obtiene de la query el valor a buscar
      const clientes = await this.servicioCliente.buscar(termino); //envia al client.service el termino para normalizar y ejecutar la búsquedad

      return respuesta.status(200).json({
        //responde un json con resultado 200 y la informacio´n del cliente
        exito: true,
        datos: {
          clientes,
        },
      });
    } catch (error) {
      return siguiente(error);
    }
  };
}
