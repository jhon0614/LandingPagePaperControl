// Recibe las solicitudes HTTP relacionadas con usuarios.
export class ControladorUsuario {
  constructor(servicioUsuario) {
    this.servicioUsuario = servicioUsuario;
  }

  listar = async (_solicitud, respuesta, siguiente) => {
    try {
      // solicitar los usuarios al servicio.
      const usuarios = await this.servicioUsuario.listar();
      // responder con estado 200 y el arreglo de usuarios.
      return respuesta.status(200).json({
        exito: true,
        datos: {
          usuarios,
        },
      });
    } catch (error) {
      // enviar el error al manejador general.
      return siguiente(error);
    }
  };

  buscarPorId = async (solicitud, respuesta, siguiente) => {
    try {
      // obtener el ID del usuario desde solicitud.params.
      const id = solicitud.params.id;

      // solicitar el usuario al servicio.
      const usuario = await this.servicioUsuario.buscarPorId(id);

      // responder con estado 200.
      return respuesta.status(200).json({
        exito: true,
        datos: {
          usuario,
        },
      });
    } catch (error) {
      // enviar el error al manejador general.
      return siguiente(error);
    }
  };

  crear = async (solicitud, respuesta, siguiente) => {
    try {
      // Envía los datos validados y quién realizó la creación.
      const usuario = await this.servicioUsuario.crear({
        ...solicitud.body,
        administradorId: solicitud.usuario.id,
        direccionIp: solicitud.ip,
      });

      // responder con estado 201 y el usuario creado.
      return respuesta.status(201).json({
        exito: true,
        datos: {
          usuario,
        },
      });
    } catch (error) {
      // enviar el error al manejador general.
      return siguiente(error);
    }
  };

  actualizar = async (solicitud, respuesta, siguiente) => {
    try {
      // obtener el ID del usuario desde solicitud.params.id.
      const usuarioId = solicitud.params.id;
      //obtener el ID del administrador autenticado desde solicitud.usuario.id.
      const administradorId = solicitud.usuario.id;
      // enviar ID, body y administradorId al servicio.
      const usuario = await this.servicioUsuario.actualizar(
        usuarioId,
        solicitud.body,
        administradorId,
        solicitud.ip,
      );
      // responder con estado 200 y el usuario actualizado.
      return respuesta.status(200).json({
        exito: true,
        datos: {
          usuario,
        },
      });
    } catch (error) {
      // enviar el error al manejador general.
      return siguiente(error);
    }
  };

  cambiarEstado = async (solicitud, respuesta, siguiente) => {
    try {
      // obtener el id con solicitud.params.id.
      const usuarioId = solicitud.params.id;

      // obtener el estado con solicitud.body.estaActivo.
      const { estaActivo } = solicitud.body;

      // obtener el id del administrador con solicitud.usuario.id.
      const administradorId = solicitud.usuario.id;

      // llamar servicioUsuario.cambiarEstado().
      const usuario = await this.servicioUsuario.cambiarEstado(
        usuarioId,
        estaActivo,
        administradorId,
        solicitud.ip,
      );

      // responder 200 con el usuario modificado.
      return respuesta.status(200).json({
        exito: true,
        datos: {
          usuario,
        },
      });
    } catch (error) {
      // enviar el error al manejador general.
      return siguiente(error);
    }
  };

  eliminar = async (solicitud, respuesta, siguiente) => {
    try {
      await this.servicioUsuario.eliminar(
        solicitud.params.id,
        solicitud.usuario.id,
        solicitud.ip,
      );

      return respuesta.status(204).send();
    } catch (error) {
      return siguiente(error);
    }
  };
}
