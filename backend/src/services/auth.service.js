import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { ErrorAplicacion } from "../errors/app-error.js";
import { OAuth2Client } from "google-auth-library";

// Comparación usada cuando el correo no existe para reducir diferencias de tiempo.
const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5P4E3x1J3Z8qY7xK7z4X5ZQm3B2FqfW";

// Contiene las reglas del inicio de sesión. No conoce detalles de Express y
// puede probarse de forma independiente mediante modelos simulados.
export class ServicioAutenticacion {
  constructor({
    modeloUsuario,
    modeloIntentoAcceso,
    modeloSesion,
    modeloConfiguracion,
    configuracionAutenticacion,
  }) {
    this.modeloUsuario = modeloUsuario;
    this.modeloIntentoAcceso = modeloIntentoAcceso;
    this.modeloSesion = modeloSesion;
    this.modeloConfiguracion = modeloConfiguracion;
    this.configuracionAutenticacion = configuracionAutenticacion;
    this.clienteGoogle = new OAuth2Client(
      configuracionAutenticacion.googleClientId, //Autenticación con google
    );
  }

  
  async verificarRecaptcha(captchaToken) {
    if (typeof captchaToken !== "string" || !captchaToken.trim()) {
      throw new ErrorAplicacion(
        "Completa la verificación CAPTCHA.",
        400,
        "CAPTCHA_REQUERIDO",
      );
    }

    const parametros = new URLSearchParams({
      secret: this.configuracionAutenticacion.recaptchaSecretKey,
      response: captchaToken,
    });

    let resultado;

    try {
      const respuesta = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: parametros,
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!respuesta.ok) {
        throw new Error("Servicio reCAPTCHA no disponible");
      }

      resultado = await respuesta.json();
    } catch {
      throw new ErrorAplicacion(
        "No fue posible verificar el CAPTCHA. Intenta nuevamente.",
        503,
        "CAPTCHA_SERVICIO_NO_DISPONIBLE",
      );
    }

    const hostnameValido =
      typeof resultado.hostname === "string" &&
      this.configuracionAutenticacion.recaptchaHostnames.includes(
        resultado.hostname,
      );

    if (resultado.success !== true || !hostnameValido) {
      throw new ErrorAplicacion(
        "La verificación CAPTCHA no fue válida. Intenta nuevamente.",
        403,
        "CAPTCHA_INVALIDO",
      );
    }
  }
  
  async iniciarSesion({
    correo,
    contrasena,
    captchaToken,
    recordarme = false,
    direccionIp,
    agenteUsuario,
  }) {
    // Los correos se guardan y comparan en minúsculas para evitar duplicados.
    const correoNormalizado = correo.trim().toLowerCase();
    
  try {
    await this.verificarRecaptcha(captchaToken);
  } catch (error) {
    await this.#registrarIntento(
      null,
      correoNormalizado,
      false,
      error.codigo ?? "CAPTCHA_VERIFICACION_FALLIDA",
      direccionIp,
      agenteUsuario,
    );
  
    throw error;
  }

    const usuario =
      await this.modeloUsuario.buscarParaAutenticacion(correoNormalizado);

    if (!usuario) {
      // Se hace una comparación adicional para que un correo inexistente no sea
      // considerablemente más rápido de comprobar que uno existente.
      await bcrypt.compare(contrasena, DUMMY_PASSWORD_HASH);
      await this.#registrarIntento(
        null,
        correoNormalizado,
        false,
        "CREDENCIALES_INCORRECTAS",
        direccionIp,
        agenteUsuario,
      );
      throw new ErrorAplicacion(
        "Correo o contraseña incorrectos.",
        401,
        "CREDENCIALES_INCORRECTAS",
      );
    }

    const contrasenaCorrecta = await bcrypt.compare(
      contrasena,
      usuario.hash_contrasena,
    );
    const ahora = new Date();
    const estaBloqueado =
      usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora;

    if (!contrasenaCorrecta) {
      // Si la cuenta ya está bloqueada, no se extiende el bloqueo con cada intento.
      if (!estaBloqueado) {
        // Los límites se leen de la base para poder configurarlos posteriormente.
        const [maximoIntentos, minutosBloqueo] = await Promise.all([
          this.modeloConfiguracion.obtenerEnteroPositivo(
            "autenticacion.maximo_intentos_fallidos",
            5,
          ),
          this.modeloConfiguracion.obtenerEnteroPositivo(
            "autenticacion.minutos_bloqueo",
            15,
          ),
        ]);
        await this.modeloUsuario.registrarAccesoFallido(
          usuario.id,
          maximoIntentos,
          minutosBloqueo,
        );
      }

      await this.#registrarIntento(
        usuario.id,
        correoNormalizado,
        false,
        "CREDENCIALES_INCORRECTAS",
        direccionIp,
        agenteUsuario,
      );
      throw new ErrorAplicacion(
        "Correo o contraseña incorrectos.",
        401,
        "CREDENCIALES_INCORRECTAS",
      );
    }

    // El estado se informa solamente después de comprobar que la contraseña es correcta.
    if (!usuario.esta_activo) {
      await this.#registrarIntento(
        usuario.id,
        correoNormalizado,
        false,
        "CUENTA_INACTIVA",
        direccionIp,
        agenteUsuario,
      );
      throw new ErrorAplicacion(
        "La cuenta no está habilitada.",
        403,
        "CUENTA_INACTIVA",
      );
    }

    if (estaBloqueado) {
      // El bloqueo se libera automáticamente cuando pasa la fecha almacenada.
      await this.#registrarIntento(
        usuario.id,
        correoNormalizado,
        false,
        "CUENTA_BLOQUEADA",
        direccionIp,
        agenteUsuario,
      );
      throw new ErrorAplicacion(
        "La cuenta está bloqueada temporalmente.",
        423,
        "CUENTA_BLOQUEADA",
        {
          bloqueadoHasta: new Date(usuario.bloqueado_hasta).toISOString(),
        },
      );
    }

    return this.#abrirSesion({
      usuario,
      recordarme,
      direccionIp,
      agenteUsuario,
    });
  }

  async #abrirSesion({ usuario, recordarme, direccionIp, agenteUsuario }) {
    const correoNormalizado = usuario.correo.trim().toLowerCase();

    await this.modeloUsuario.registrarAccesoExitoso(usuario.id);

    const tokenRenovacion = this.#crearTokenRenovacion();
    const hashTokenRenovacion = this.#crearHashToken(tokenRenovacion);
    const expiraEn = new Date(
      Date.now() +
        this.configuracionAutenticacion.diasRenovacion * 24 * 60 * 60 * 1000,
    );

    const sesionId = await this.modeloSesion.crear({
      usuarioId: usuario.id,
      hashTokenRenovacion,
      direccionIp,
      agenteUsuario,
      expiraEn,
      esPersistente: Boolean(recordarme),
      hashContrasena: usuario.hash_contrasena,
    });

    if (!sesionId)
      throw new ErrorAplicacion(
        "Las credenciales cambiaron. Inicia sesión nuevamente.",
        401,
        "SESION_NO_VALIDA",
      );

    const tokenAcceso = this.#crearTokenAcceso(usuario, sesionId);

    await this.#registrarIntento(
      usuario.id,
      correoNormalizado,
      true,
      null,
      direccionIp,
      agenteUsuario,
    );

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
      throw new ErrorAplicacion(
        "La sesión no es válida.",
        401,
        "SESION_NO_VALIDA",
      );
    }

    const hashTokenActual = this.#crearHashToken(tokenRenovacion);
    const sesion = await this.modeloSesion.buscarActivaPorHash(hashTokenActual);

    if (!sesion) {
      throw new ErrorAplicacion(
        "La sesión no es válida o ha expirado.",
        401,
        "SESION_NO_VALIDA",
      );
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
      throw new ErrorAplicacion(
        "La sesión no es válida o ha expirado.",
        401,
        "SESION_NO_VALIDA",
      );
    }

    return {
      tokenAcceso: this.#crearTokenAcceso(
        {
          id: sesion.usuario_id,
          correo: sesion.correo,
          rol: sesion.rol,
        },
        sesion.sesion_id,
      ),
      tokenRenovacion: tokenRenovacionNuevo,
      expiracionTokenRenovacion: expiraEn,
      esPersistente: Boolean(sesion.es_persistente),
      usuario: this.#crearUsuarioRespuesta({
        id: sesion.usuario_id,
        nombres: sesion.nombres,
        apellidos: sesion.apellidos,
        debe_cambiar_contrasena: sesion.debe_cambiar_contrasena,
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

    await this.modeloSesion.revocarPorHash(
      this.#crearHashToken(tokenRenovacion),
    );
  }

  #crearTokenAcceso(usuario, sesionId) {
    // El token de acceso identifica al usuario en las futuras solicitudes.
    return jwt.sign(
      { rol: usuario.rol, correo: usuario.correo, sid: String(sesionId) },
      this.configuracionAutenticacion.secretoAcceso,
      {
        subject: String(usuario.id),
        expiresIn: `${this.configuracionAutenticacion.minutosAcceso}m`,
      },
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

  async #registrarIntento(
    usuarioId,
    correo,
    fueExitoso,
    motivoFallo,
    direccionIp,
    agenteUsuario,
  ) {
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

  async vincularGoogle({ usuarioId, credential }) {
    const datosGoogle = await this.#verificarGoogle(credential);
    const vinculado = await this.modeloUsuario.vincularGoogle(
      usuarioId,
      datosGoogle.sub,
    );

    if (!vinculado) {
      throw new ErrorAplicacion(
        "No se pudo vincular Google. Revisa si alguna cuenta ya está vinculada.",
        409,
        "GOOGLE_VINCULACION_NO_DISPONIBLE",
      );
    }
  }

  
  async consultarEstadoGoogle(usuarioId) {
    const vinculado = await this.modeloUsuario.consultarEstadoGoogle(usuarioId);
  
    if (vinculado === null) {
      throw new ErrorAplicacion(
        "El usuario no existe o no está activo.",
        403,
        "USUARIO_NO_DISPONIBLE",
      );
    }
  
    return { vinculado };
  }
  

  async iniciarSesionGoogle({
    credential,
    recordarme = false,
    direccionIp,
    agenteUsuario,
  }) {
    const datosGoogle = await this.#verificarGoogle(credential);
    const usuario = await this.modeloUsuario.buscarPorGoogleSub(datosGoogle.sub);

    if (!usuario) {
      throw new ErrorAplicacion(
        "Primero inicia sesión con tu contraseña y vincula Google.",
        401,
        "GOOGLE_NO_VINCULADO",
      );
    }

    const estaBloqueado =
      usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date();
    if (!usuario.esta_activo || estaBloqueado) {
      const motivo = usuario.esta_activo ? "CUENTA_BLOQUEADA" : "CUENTA_INACTIVA";
      await this.#registrarIntento(
        usuario.id,
        usuario.correo.trim().toLowerCase(),
        false,
        motivo,
        direccionIp,
        agenteUsuario,
      );
      throw new ErrorAplicacion(
        usuario.esta_activo
          ? "La cuenta está bloqueada temporalmente."
          : "La cuenta no está habilitada.",
        usuario.esta_activo ? 423 : 403,
        motivo,
      );
    }

    return this.#abrirSesion({
      usuario,
      recordarme,
      direccionIp,
      agenteUsuario,
    });
  }

  async #verificarGoogle(credential) {
    let datos;

    try {
      const ticket = await this.clienteGoogle.verifyIdToken({
        idToken: credential,
        audience: this.configuracionAutenticacion.googleClientId,
      });

      datos = ticket.getPayload();
    } catch {
      throw new ErrorAplicacion(
        "La credencial de Google no es válida.",
        401,
        "GOOGLE_CREDENCIAL_INVALIDA",
      );
    }

    if (!datos?.sub || datos.email_verified !== true) {
      throw new ErrorAplicacion(
        "La cuenta de Google no está verificada.",
        401,
        "GOOGLE_CUENTA_NO_VERIFICADA",
      );
    }

    return datos;
  }
}
