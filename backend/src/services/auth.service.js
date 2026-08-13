import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { ErrorAplicacion } from "../errors/app-error.js";

// Comparación usada cuando el correo no existe para reducir diferencias de tiempo.
const DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5P4E3x1J3Z8qY7xK7z4X5ZQm3B2FqfW";

// Contiene las reglas del inicio de sesión. No conoce detalles de Express y
// puede probarse de forma independiente mediante modelos simulados.
export class ServicioAutenticacion {
  constructor({ modeloUsuario, modeloIntentoAcceso, modeloSesion, modeloConfiguracion, configuracionAutenticacion }) {
    this.modeloUsuario = modeloUsuario;
    this.modeloIntentoAcceso = modeloIntentoAcceso;
    this.modeloSesion = modeloSesion;
    this.modeloConfiguracion = modeloConfiguracion;
    this.configuracionAutenticacion = configuracionAutenticacion;
  }

  async iniciarSesion({ correo, contrasena, recordarme = false, direccionIp, agenteUsuario }) {
    // Los correos se guardan y comparan en minúsculas para evitar duplicados.
    const correoNormalizado = correo.trim().toLowerCase();
    const usuario = await this.modeloUsuario.buscarParaAutenticacion(correoNormalizado);

    if (!usuario) {
      // Se hace una comparación adicional para que un correo inexistente no sea
      // considerablemente más rápido de comprobar que uno existente.
      await bcrypt.compare(contrasena, DUMMY_PASSWORD_HASH);
      await this.#registrarIntento(null, correoNormalizado, false, "CREDENCIALES_INCORRECTAS", direccionIp, agenteUsuario);
      throw new ErrorAplicacion("Correo o contraseña incorrectos.", 401, "CREDENCIALES_INCORRECTAS");
    }

    const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.hash_contrasena);
    const ahora = new Date();
    const estaBloqueado = usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora;

    if (!contrasenaCorrecta) {
      // Si la cuenta ya está bloqueada, no se extiende el bloqueo con cada intento.
      if (!estaBloqueado) {
        // Los límites se leen de la base para poder configurarlos posteriormente.
        const [maximoIntentos, minutosBloqueo] = await Promise.all([
          this.modeloConfiguracion.obtenerEnteroPositivo("autenticacion.maximo_intentos_fallidos", 5),
          this.modeloConfiguracion.obtenerEnteroPositivo("autenticacion.minutos_bloqueo", 15),
        ]);
        await this.modeloUsuario.registrarAccesoFallido(usuario.id, maximoIntentos, minutosBloqueo);
      }

      await this.#registrarIntento(usuario.id, correoNormalizado, false, "CREDENCIALES_INCORRECTAS", direccionIp, agenteUsuario);
      throw new ErrorAplicacion("Correo o contraseña incorrectos.", 401, "CREDENCIALES_INCORRECTAS");
    }

    // El estado se informa solamente después de comprobar que la contraseña es correcta.
    if (!usuario.esta_activo) {
      await this.#registrarIntento(usuario.id, correoNormalizado, false, "CUENTA_INACTIVA", direccionIp, agenteUsuario);
      throw new ErrorAplicacion("La cuenta no está habilitada.", 403, "CUENTA_INACTIVA");
    }

    if (estaBloqueado) {
      // El bloqueo se libera automáticamente cuando pasa la fecha almacenada.
      await this.#registrarIntento(usuario.id, correoNormalizado, false, "CUENTA_BLOQUEADA", direccionIp, agenteUsuario);
      throw new ErrorAplicacion("La cuenta está bloqueada temporalmente.", 423, "CUENTA_BLOQUEADA", {
        bloqueadoHasta: new Date(usuario.bloqueado_hasta).toISOString(),
      });
    }

    await this.modeloUsuario.registrarAccesoExitoso(usuario.id);

    const tokenAcceso = this.#crearTokenAcceso(usuario);

    // El refresh token permite renovar la sesión. En MySQL se guarda solamente
    // su huella digital para que el valor original no quede expuesto.
    const tokenRenovacion = this.#crearTokenRenovacion();
    const hashTokenRenovacion = this.#crearHashToken(tokenRenovacion);
    const expiraEn = new Date(Date.now() + this.configuracionAutenticacion.diasRenovacion * 24 * 60 * 60 * 1000);

    await this.modeloSesion.crear({
      usuarioId: usuario.id,
      hashTokenRenovacion,
      direccionIp,
      agenteUsuario,
      expiraEn,
      esPersistente: Boolean(recordarme),
    });
    await this.#registrarIntento(usuario.id, correoNormalizado, true, null, direccionIp, agenteUsuario);

    return {
      tokenAcceso,
      tokenRenovacion,
      expiracionTokenRenovacion: expiraEn,
      esPersistente: Boolean(recordarme),
      usuario: this.#crearUsuarioRespuesta(usuario),
    };
  }

  async renovarSesion(tokenRenovacion) {
    if (!tokenRenovacion || typeof tokenRenovacion !== "string") {
      throw new ErrorAplicacion("La sesión no es válida.", 401, "SESION_NO_VALIDA");
    }

    const hashTokenActual = this.#crearHashToken(tokenRenovacion);
    const sesion = await this.modeloSesion.buscarActivaPorHash(hashTokenActual);

    if (!sesion) {
      throw new ErrorAplicacion("La sesión no es válida o ha expirado.", 401, "SESION_NO_VALIDA");
    }

    // Cada renovación reemplaza la cookie anterior para que no pueda reutilizarse.
    const tokenRenovacionNuevo = this.#crearTokenRenovacion();
    const hashTokenNuevo = this.#crearHashToken(tokenRenovacionNuevo);
    const expiraEn = new Date(sesion.expira_en);
    const fueRotado = await this.modeloSesion.rotarToken({
      sesionId: sesion.sesion_id,
      hashTokenActual,
      hashTokenNuevo,
      expiraEn,
    });

    if (!fueRotado) {
      throw new ErrorAplicacion("La sesión no es válida o ha expirado.", 401, "SESION_NO_VALIDA");
    }

    return {
      tokenAcceso: this.#crearTokenAcceso({
        id: sesion.usuario_id,
        correo: sesion.correo,
        rol: sesion.rol,
      }),
      tokenRenovacion: tokenRenovacionNuevo,
      expiracionTokenRenovacion: expiraEn,
      esPersistente: Boolean(sesion.es_persistente),
      usuario: this.#crearUsuarioRespuesta({
        id: sesion.usuario_id,
        nombres: sesion.nombres,
        apellidos: sesion.apellidos,
        correo: sesion.correo,
        rol: sesion.rol,
      }),
    };
  }

  async cerrarSesion(tokenRenovacion) {
    // El cierre es idempotente: si no hay cookie, la sesión ya está cerrada
    // desde la perspectiva del navegador.
    if (!tokenRenovacion || typeof tokenRenovacion !== "string") {
      return;
    }

    await this.modeloSesion.revocarPorHash(this.#crearHashToken(tokenRenovacion));
  }

  #crearTokenAcceso(usuario) {
    // El token de acceso identifica al usuario en las futuras solicitudes.
    return jwt.sign(
      { rol: usuario.rol, correo: usuario.correo },
      this.configuracionAutenticacion.secretoAcceso,
      { subject: String(usuario.id), expiresIn: `${this.configuracionAutenticacion.minutosAcceso}m` },
    );
  }

  #crearTokenRenovacion() {
    return randomBytes(48).toString("base64url");
  }

  #crearHashToken(token) {
    return createHash("sha256").update(token).digest("hex");
  }

  #crearUsuarioRespuesta(usuario) {
    // Entrega únicamente los datos seguros que necesita el frontend.
    return {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      rol: usuario.rol,
      // Permite redirigir una cuenta nueva a la pantalla de cambio obligatorio.
      debeCambiarContrasena: Boolean(usuario.debe_cambiar_contrasena),
    };
  }

  async #registrarIntento(usuarioId, correo, fueExitoso, motivoFallo, direccionIp, agenteUsuario) {
    // Método interno para registrar los accesos siempre con el mismo formato.
    await this.modeloIntentoAcceso.crear({
      usuarioId,
      correo,
      fueExitoso,
      motivoFallo,
      direccionIp,
      agenteUsuario,
    });
  }
}
