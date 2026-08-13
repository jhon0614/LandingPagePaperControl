import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { ErrorAplicacion } from "../errors/app-error.js";

export class ServicioContrasena {
  constructor({
    modeloUsuario,
    modeloRestablecimiento,
    modeloSesion,
    servicioCorreo,
    modeloAuditoria,
    configuracion,
  }) {
    this.modeloUsuario = modeloUsuario;
    this.modeloRestablecimiento = modeloRestablecimiento;
    this.modeloSesion = modeloSesion;
    this.servicioCorreo = servicioCorreo;
    this.modeloAuditoria = modeloAuditoria;
    this.configuracion = configuracion;
  }

  async cambiarContrasena({ usuarioId, contrasenaActual, contrasenaNueva }) {
    const usuario = await this.modeloUsuario.buscarPorId(usuarioId);
    if (!usuario) {
      throw new ErrorAplicacion(
        "Usuario no encontrado",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    const coincide = await bcrypt.compare(
      contrasenaActual,
      usuario.hash_contrasena,
    );
    if (!coincide) {
      throw new ErrorAplicacion(
        "Contraseña actual incorrecta",
        403,
        "CONTRASENA_INVALIDA",
      );
    }

    const hashNueva = await bcrypt.hash(contrasenaNueva, 12);
    await this.modeloUsuario.actualizarContrasena(usuarioId, hashNueva);

    // Revocar sesiones activas para obligar a nuevo login
    await this.modeloSesion.revocarPorUsuario(usuarioId);

    return { exito: true };
  }

  async solicitarRestablecimiento({ correo }) {
    const usuario = await this.modeloUsuario.buscarPorCorreo(correo);
    if (!usuario) {
      throw new ErrorAplicacion(
        "Usuario no encontrado",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    const token = this.#crearToken();
    const hashToken = this.#crearHashToken(token);
    const expiraEn = new Date(Date.now() + this.configuracion.tiempoTokenMs);

    await this.modeloRestablecimiento.crear({
      usuarioId: usuario.id,
      hashToken,
      expiraEn,
    });

    // Enviar correo con el token plano
    await this.servicioCorreo.enviarRestablecimiento(usuario.correo, token);

    return { exito: true };
  }

  async restablecerContrasena({ token, contrasenaNueva }) {
    const hashToken = this.#crearHashToken(token);
    const solicitud =
      await this.modeloRestablecimiento.buscarActivoPorHash(hashToken);

    if (!solicitud) {
      throw new ErrorAplicacion(
        "Token inválido o vencido",
        400,
        "TOKEN_INVALIDO",
      );
    }

    const hashNueva = await bcrypt.hash(contrasenaNueva, 12);
    await this.modeloUsuario.actualizarContrasena(
      solicitud.usuario_id,
      hashNueva,
    );

    // Marcar token como usado
    await this.modeloRestablecimiento.marcarComoUsado(solicitud.id);

    // Revocar sesiones activas
    await this.modeloSesion.revocarPorUsuario(solicitud.usuario_id);

    return { exito: true };
  }

  async solicitarRestablecimientoAdministrativo({
    usuarioId,
    responsableId,
    direccionIp,
  }) {
    const usuario = await this.modeloUsuario.buscarPorId(usuarioId);
    if (!usuario) {
      throw new ErrorAplicacion(
        "Usuario no encontrado",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    const token = this.#crearToken();
    const hashToken = this.#crearHashToken(token);
    const expiraEn = new Date(Date.now() + this.configuracion.tiempoTokenMs);

    await this.modeloRestablecimiento.crear({
      usuarioId,
      hashToken,
      expiraEn,
    });

    // Registrar auditoría
    await this.modeloAuditoria.registrar({
      accion: "SOLICITAR_RESTABLECIMIENTO_ADMIN",
      usuarioId,
      responsableId,
      direccionIp,
    });

    // Enviar correo con el token
    await this.servicioCorreo.enviarRestablecimiento(usuario.correo, token);

    return { exito: true };
  }

  async desbloquearUsuario({ usuarioId, responsableId, direccionIp }) {
    const usuario = await this.modeloUsuario.buscarPorId(usuarioId);
    if (!usuario) {
      throw new ErrorAplicacion(
        "Usuario no encontrado",
        404,
        "USUARIO_NO_ENCONTRADO",
      );
    }

    await this.modeloUsuario.desbloquear(usuarioId);

    // Registrar auditoría
    await this.modeloAuditoria.registrar({
      accion: "DESBLOQUEAR_USUARIO",
      usuarioId,
      responsableId,
      direccionIp,
    });

    return { exito: true };
  }

  #crearToken() {
    return randomBytes(48).toString("base64url");
  }

  #crearHashToken(token) {
    return createHash("sha256").update(token).digest("hex");
  }
}
