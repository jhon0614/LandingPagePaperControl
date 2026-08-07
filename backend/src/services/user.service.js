import { ErrorAplicacion } from "../errors/app-error.js";
import bcrypt from "bcryptjs";

function presentarUsuario(fila) {
  return {
    id: fila.id,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    correo: fila.correo,
    estaActivo: Boolean(fila.esta_activo),
    debeCambiarContrasena: Boolean(fila.debe_cambiar_contrasena),
    creadoEn: fila.creado_en,
    rol: {
      id: fila.rol_id,
      nombre: fila.rol,
    },
  };
}

// Coordina las operaciones relacionadas con la administración de usuarios.
export class ServicioUsuario {
  constructor(modeloUsuario, modeloRol, modeloSesion, modeloAuditoria) {
    this.modeloUsuario = modeloUsuario;
    this.modeloRol = modeloRol;
    this.modeloSesion = modeloSesion;
    this.modeloAuditoria = modeloAuditoria;
  }

  async listar() {
    // solicitar la lista completa al modelo.
    const filas = await this.modeloUsuario.listar();
    // transformar los campos de MySQL al formato de la API.
    const usuarios = filas.map(presentarUsuario);
    // devolver los usuarios.
    return usuarios;
  }

  async buscarPorId(id) {
    // convertir el ID recibido a número.
    const numeroId = Number(id);
    // validar que sea un entero mayor que cero.
    // Si no es válido, lanzar ErrorAplicacion con estado 400.
    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID de usuario es inválido.",
        400,
        "ID_USUARIO_INVALIDO",
      );
    }
    // solicitar el usuario al modelo.
    const fila = await this.modeloUsuario.buscarPorId(numeroId);
    // comprobar que el usuario exista.
    // Si no existe, lanzar ErrorAplicacion con estado 404.
    if (!fila) {
      throw new ErrorAplicacion(
        "El usuario no fue encontrado.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }
    // transformar los campos de MySQL al formato de la API.
    const usuario = presentarUsuario(fila);
    // devolver el usuario.
    return usuario;
  }

  async crear({
    nombres,
    apellidos,
    correo,
    contrasenaTemporal,
    rolId,
    administradorId,
    direccionIp,
  }) {
    // Normalizar el correo.
    const correoNormalizado = correo.trim().toLowerCase();

    // Buscar el correo incluyendo usuarios eliminados.
    const usuarioExistente =
      await this.modeloUsuario.buscarPorCorreoIncluyendoEliminados(
        correoNormalizado,
      );

    if (usuarioExistente) {
      // si existe y no está eliminado → CORREO_EXISTENTE
      if (!usuarioExistente.eliminado_en) {
        throw new ErrorAplicacion(
          "El correo ya está registrado en un usuario activo.",
          409,
          "CORREO_EXISTENTE",
        );
      }
      // si existe y está eliminado → USUARIO_ELIMINADO_EXISTENTE
      throw new ErrorAplicacion(
        "El correo pertenece a un usuario eliminado.",
        409,
        "USUARIO_ELIMINADO_EXISTENTE",
      );
    }

    // Buscar el rol por ID.
    const rol = await this.modeloRol.buscarPorId(rolId);
    if (!rol) {
      throw new ErrorAplicacion(
        "El rol no fue encontrado.",
        404,
        "ROL_NO_ENCONTRADO",
      );
    }

    // Generar el hash de contrasenaTemporal con bcrypt y costo 12.
    const hashContrasena = await bcrypt.hash(contrasenaTemporal, 12);

    // Solicitar al modelo la creación del usuario.
    const fila = await this.modeloUsuario.crear({
      nombres,
      apellidos,
      correo: correoNormalizado,
      hashContrasena,
      rolId,
    });

    await this.modeloAuditoria.registrar({
      usuarioId: Number(administradorId),
      accion: "CREAR_USUARIO",
      tipoEntidad: "USUARIO",
      entidadId: fila.id,
      detalles: {
        nombres: fila.nombres,
        apellidos: fila.apellidos,
        correo: fila.correo,
        rol: {
          id: fila.rol_id,
          nombre: fila.rol,
        },
      },
      direccionIp,
    });

    // Transformar y devolver el usuario creado.
    return presentarUsuario(fila);
  }

  async actualizar(id, datos, administradorId, direccionIp) {
    // convertir y validar id como entero positivo.
    const numeroId = Number(id);
    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID de usuario es inválido.",
        400,
        "ID_USUARIO_INVALIDO",
      );
    }
    // buscar el usuario actual.
    const usuarioActual = await this.modeloUsuario.buscarPorId(numeroId);
    if (!usuarioActual) {
      // Si no existe: 404 USUARIO_NO_ENCONTRADO.
      throw new ErrorAplicacion(
        "El usuario no fue encontrado.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }
    // establecer los valores finales:
    // usar el valor nuevo cuando exista;
    // usar el valor actual cuando no venga.
    const nombresFinales = datos.nombres ?? usuarioActual.nombres;
    const apellidosFinales = datos.apellidos ?? usuarioActual.apellidos;
    const correoFinal = datos.correo
      ? datos.correo.trim().toLowerCase() //correo normalizado sin espacios y en minúsculas
      : usuarioActual.correo;
    const rolIdFinal = datos.rolId ?? usuarioActual.rol_id;

    //comprobar si el correo pertenece a otro usuario.
    if (datos.correo) {
      const usuarioConCorreo =
        await this.modeloUsuario.buscarPorCorreoIncluyendoEliminados(
          correoFinal,
        );
      if (usuarioConCorreo && usuarioConCorreo.id !== numeroId) {
        // Comparar el ID encontrado con el usuario que se está actualizando.
        if (!usuarioConCorreo.eliminado_en) {
          throw new ErrorAplicacion(
            "El correo ya está registrado en otro usuario activo.",
            409,
            "CORREO_EXISTENTE",
          );
        }
        throw new ErrorAplicacion(
          "El correo pertenece a un usuario eliminado.",
          409,
          "USUARIO_ELIMINADO_EXISTENTE",
        );
      }
    }

    // si viene rolId, comprobar que el rol exista.
    if (datos.rolId !== undefined) {
      const rol = await this.modeloRol.buscarPorId(rolIdFinal);
      if (!rol) {
        throw new ErrorAplicacion(
          "El rol no fue encontrado.",
          404,
          "ROL_NO_ENCONTRADO",
        );
      }
    }

    // impedir que el administrador cambie su propio rol.
    if (
      numeroId === Number(administradorId) &&
      rolIdFinal !== usuarioActual.rol_id
    ) {
      throw new ErrorAplicacion(
        "No puedes cambiar tu propio rol.",
        403,
        "CAMBIO_ROL_PROPIO_PROHIBIDO",
      );
    }

    // si se cambia un ADMINISTRADOR a otro rol,
    // comprobar que exista al menos otro administrador activo.
    if (
      usuarioActual.rol === "ADMINISTRADOR" &&
      Boolean(usuarioActual.esta_activo) &&
      rolIdFinal !== usuarioActual.rol_id
    ) {
      const totalAdmins =
        await this.modeloUsuario.contarAdministradoresActivosExcepto(numeroId);
      if (totalAdmins === 0) {
        throw new ErrorAplicacion(
          "No se puede cambiar el rol del último administrador activo.",
          409,
          "ULTIMO_ADMINISTRADOR",
        );
      }
    }

    // solicitar la actualización al modelo.
    const fila = await this.modeloUsuario.actualizar(numeroId, {
      nombres: nombresFinales,
      apellidos: apellidosFinales,
      correo: correoFinal,
      rolId: rolIdFinal,
    });

    const cambiosDatos = {};
    if (nombresFinales !== usuarioActual.nombres) {
      cambiosDatos.nombres = {
        anterior: usuarioActual.nombres,
        nuevo: nombresFinales,
      };
    }
    if (apellidosFinales !== usuarioActual.apellidos) {
      cambiosDatos.apellidos = {
        anterior: usuarioActual.apellidos,
        nuevo: apellidosFinales,
      };
    }
    if (correoFinal !== usuarioActual.correo) {
      cambiosDatos.correo = {
        anterior: usuarioActual.correo,
        nuevo: correoFinal,
      };
    }

    if (Object.keys(cambiosDatos).length > 0) {
      await this.modeloAuditoria.registrar({
        usuarioId: Number(administradorId),
        accion: "ACTUALIZAR_USUARIO",
        tipoEntidad: "USUARIO",
        entidadId: numeroId,
        detalles: { cambios: cambiosDatos },
        direccionIp,
      });
    }

    if (rolIdFinal !== usuarioActual.rol_id) {
      await this.modeloAuditoria.registrar({
        usuarioId: Number(administradorId),
        accion: "CAMBIAR_ROL_USUARIO",
        tipoEntidad: "USUARIO",
        entidadId: numeroId,
        detalles: {
          rolAnterior: {
            id: usuarioActual.rol_id,
            nombre: usuarioActual.rol,
          },
          rolNuevo: {
            id: fila.rol_id,
            nombre: fila.rol,
          },
        },
        direccionIp,
      });
    }

    // presentar y devolver el usuario actualizado.
    return presentarUsuario(fila);
  }

  async cambiarEstado(id, estaActivo, administradorId, direccionIp) {
    // 1. Convertir y validar el ID.
    const numeroId = Number(id);
    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID de usuario es inválido.",
        400,
        "ID_USUARIO_INVALIDO",
      );
    }

    // 2. Buscar el usuario actual.
    const usuarioActual = await this.modeloUsuario.buscarPorId(numeroId);
    if (!usuarioActual) {
      throw new ErrorAplicacion(
        "El usuario no fue encontrado.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    // 3. Comprobar que el estado recibido sea un booleano real.
    if (typeof estaActivo !== "boolean") {
      throw new ErrorAplicacion(
        "El estado del usuario no es válido.",
        400,
        "ESTADO_USUARIO_INVALIDO",
      );
    }

    const nuevoEstado = estaActivo;

    // 4. Impedir que el administrador se desactive a sí mismo.
    if (!nuevoEstado && numeroId === Number(administradorId)) {
      throw new ErrorAplicacion(
        "No puedes desactivar tu propio usuario.",
        403,
        "AUTO_DESACTIVACION_PROHIBIDA",
      );
    }

    // 5. Proteger al último administrador activo.
    if (
      !nuevoEstado &&
      usuarioActual.rol === "ADMINISTRADOR" &&
      Boolean(usuarioActual.esta_activo)
    ) {
      const totalAdmins =
        await this.modeloUsuario.contarAdministradoresActivosExcepto(numeroId);
      if (totalAdmins === 0) {
        throw new ErrorAplicacion(
          "No se puede desactivar al último administrador activo.",
          409,
          "ULTIMO_ADMINISTRADOR",
        );
      }
    }

    // 6. Actualizar el estado en ModeloUsuario.
    const fila = await this.modeloUsuario.actualizarEstado(
      numeroId,
      nuevoEstado,
    );

    // 7. Si el nuevo estado es false, revocar las sesiones.
    if (!nuevoEstado) {
      await this.modeloSesion.revocarPorUsuario(numeroId);
    }

    if (nuevoEstado !== Boolean(usuarioActual.esta_activo)) {
      await this.modeloAuditoria.registrar({
        usuarioId: Number(administradorId),
        accion: nuevoEstado ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO",
        tipoEntidad: "USUARIO",
        entidadId: numeroId,
        detalles: {
          estadoAnterior: Boolean(usuarioActual.esta_activo),
          estadoNuevo: nuevoEstado,
        },
        direccionIp,
      });
    }

    // 8. Presentar y devolver el usuario actualizado.
    return presentarUsuario(fila);
  }

  async eliminar(id, administradorId, direccionIp) {
    const numeroId = Number(id);
    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID de usuario es inválido.",
        400,
        "ID_USUARIO_INVALIDO",
      );
    }

    const usuarioActual = await this.modeloUsuario.buscarPorId(numeroId);
    if (!usuarioActual) {
      throw new ErrorAplicacion(
        "El usuario no fue encontrado.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    if (numeroId === Number(administradorId)) {
      throw new ErrorAplicacion(
        "No puedes eliminar tu propio usuario.",
        403,
        "AUTO_ELIMINACION_PROHIBIDA",
      );
    }

    if (
      usuarioActual.rol === "ADMINISTRADOR" &&
      Boolean(usuarioActual.esta_activo)
    ) {
      const totalAdministradores =
        await this.modeloUsuario.contarAdministradoresActivosExcepto(numeroId);

      if (totalAdministradores === 0) {
        throw new ErrorAplicacion(
          "No se puede eliminar al último administrador activo.",
          409,
          "ULTIMO_ADMINISTRADOR",
        );
      }
    }

    const fueEliminado =
      await this.modeloUsuario.eliminarLogicamente(numeroId);

    if (!fueEliminado) {
      throw new ErrorAplicacion(
        "El usuario no fue encontrado.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    await this.modeloSesion.revocarPorUsuario(numeroId);

    await this.modeloAuditoria.registrar({
      usuarioId: Number(administradorId),
      accion: "ELIMINAR_USUARIO",
      tipoEntidad: "USUARIO",
      entidadId: numeroId,
      detalles: {
        nombres: usuarioActual.nombres,
        apellidos: usuarioActual.apellidos,
        correo: usuarioActual.correo,
        rol: {
          id: usuarioActual.rol_id,
          nombre: usuarioActual.rol,
        },
      },
      direccionIp,
    });
  }
}
