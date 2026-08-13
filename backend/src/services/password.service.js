import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { ErrorAplicacion } from "../errors/app-error.js";

// Reúne las reglas para cambiar, recuperar y restablecer contraseñas. No recibe
// objetos propios de Express, por lo que puede probarse sin iniciar el servidor.
export class ServicioContrasena {
  constructor({
    modeloUsuario,
    modeloRestablecimiento,
    servicioCorreo,
    modeloAuditoria,
    configuracion,
  }) {
    this.modeloUsuario = modeloUsuario;
    this.modeloRestablecimiento = modeloRestablecimiento;
    this.servicioCorreo = servicioCorreo;
    this.modeloAuditoria = modeloAuditoria;
    this.configuracion = configuracion;
  }

  async cambiarContrasena({ usuarioId, contrasenaActual, contrasenaNueva }) {
    // La consulta devuelve el hash únicamente para realizar estas comparaciones.
    const usuario = await this.modeloUsuario.buscarContrasenaPorId(usuarioId);

    if (!usuario) {
      throw new ErrorAplicacion(
        "El usuario no se encuentra disponible.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    const contrasenaActualCorrecta = await bcrypt.compare(
      contrasenaActual,
      usuario.hash_contrasena,
    );

    if (!contrasenaActualCorrecta) {
      throw new ErrorAplicacion(
        "La contraseña actual es incorrecta.",
        400,
        "CONTRASENA_ACTUAL_INCORRECTA",
      );
    }

    const nuevaCoincideConActual = await bcrypt.compare(
      contrasenaNueva,
      usuario.hash_contrasena,
    );

    if (nuevaCoincideConActual) {
      throw new ErrorAplicacion(
        "La nueva contraseña debe ser diferente de la actual.",
        400,
        "CONTRASENA_SIN_CAMBIOS",
      );
    }

    // Nunca se entrega la contraseña original al modelo ni se guarda en MySQL.
    const hashContrasenaNueva = await bcrypt.hash(contrasenaNueva, 12);
    const fueActualizada =
      await this.modeloUsuario.actualizarContrasenaYRevocarSesiones(
        usuarioId,
        hashContrasenaNueva,
      );

    if (!fueActualizada) {
      throw new ErrorAplicacion(
        "No fue posible cambiar la contraseña.",
        409,
        "CONTRASENA_NO_ACTUALIZADA",
      );
    }

    return {
      mensaje: "La contraseña fue cambiada correctamente.",
    };
  }

  async solicitarRestablecimiento({ correo }) {
    // El mismo mensaje se usa para correos existentes e inexistentes.
    const mensaje =
      "Si el correo pertenece a una cuenta disponible, recibirás las instrucciones.";
    const correoNormalizado = correo.trim().toLowerCase();
    const usuario =
      await this.modeloUsuario.buscarActivoPorCorreo(correoNormalizado);

    if (!usuario) {
      // La respuesta no revela si el correo se encuentra registrado.
      return { mensaje };
    }

    await this.#crearSolicitudYEnviarCorreo(usuario);
    return { mensaje };
  }

  async restablecerContrasena({ token, contrasenaNueva }) {
    // El token recibido se transforma en hash antes de buscarlo en MySQL.
    const hashToken = this.#crearHashToken(token);
    const hashContrasenaNueva = await bcrypt.hash(contrasenaNueva, 12);
    const usuarioId =
      await this.modeloRestablecimiento.consumirYActualizarContrasena({
        hashToken,
        hashContrasena: hashContrasenaNueva,
      });

    if (!usuarioId) {
      throw new ErrorAplicacion(
        "El enlace no es válido o ya expiró.",
        400,
        "TOKEN_RESTABLECIMIENTO_INVALIDO",
      );
    }

    return {
      mensaje: "La contraseña fue restablecida correctamente.",
    };
  }

  async solicitarRestablecimientoAdministrativo({
    usuarioId,
    responsableId,
    direccionIp,
  }) {
    // El responsable solicita el correo, pero nunca conoce la nueva contraseña.
    const numeroUsuarioId = this.#validarId(usuarioId);
    const usuario = await this.modeloUsuario.buscarPorId(numeroUsuarioId);

    if (!usuario) {
      throw new ErrorAplicacion(
        "El usuario no se encuentra disponible.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    await this.#crearSolicitudYEnviarCorreo(usuario);

    await this.modeloAuditoria.registrar({
      usuarioId: Number(responsableId),
      accion: "SOLICITAR_RESTABLECIMIENTO_USUARIO",
      tipoEntidad: "USUARIO",
      entidadId: numeroUsuarioId,
      detalles: {
        correoDestino: usuario.correo,
      },
      direccionIp,
    });

    return {
      mensaje: "Las instrucciones fueron enviadas al correo del usuario.",
    };
  }

  async desbloquearUsuario({ usuarioId, responsableId, direccionIp }) {
    // Desbloquear solo limpia los intentos y la fecha; no activa cuentas inactivas.
    const numeroUsuarioId = this.#validarId(usuarioId);
    const usuario = await this.modeloUsuario.buscarPorId(numeroUsuarioId);

    if (!usuario) {
      throw new ErrorAplicacion(
        "El usuario no se encuentra disponible.",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    const fueDesbloqueado =
      await this.modeloUsuario.desbloquear(numeroUsuarioId);

    if (!fueDesbloqueado) {
      throw new ErrorAplicacion(
        "No fue posible desbloquear el usuario.",
        409,
        "USUARIO_NO_DESBLOQUEADO",
      );
    }

    await this.modeloAuditoria.registrar({
      usuarioId: Number(responsableId),
      accion: "DESBLOQUEAR_USUARIO",
      tipoEntidad: "USUARIO",
      entidadId: numeroUsuarioId,
      detalles: null,
      direccionIp,
    });

    return {
      mensaje: "El usuario fue desbloqueado correctamente.",
    };
  }

  async #crearSolicitudYEnviarCorreo(usuario) {
    // Cada solicitud genera un valor impredecible con una fecha de expiración.
    const token = this.#crearToken();
    const hashToken = this.#crearHashToken(token);
    const expiraEn = new Date(Date.now() + this.configuracion.tiempoTokenMs);

    await this.modeloRestablecimiento.crear({
      usuarioId: usuario.id,
      hashToken,
      expiraEn,
    });

    // El token original se envía por correo y nunca se guarda en MySQL.
    await this.servicioCorreo.enviarRestablecimiento(usuario.correo, token);
  }

  #crearToken() {
    // base64url puede viajar en una dirección web sin caracteres problemáticos.
    return randomBytes(48).toString("base64url");
  }

  #crearHashToken(token) {
    // El hash permite comprobar el token sin guardar su valor original.
    return createHash("sha256").update(token).digest("hex");
  }

  #validarId(id) {
    // Los parámetros de una URL llegan como texto y deben convertirse con cuidado.
    const numeroId = Number(id);
    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID del usuario no es válido.",
        400,
        "ID_USUARIO_INVALIDO",
      );
    }
    return numeroId;
  }
}
