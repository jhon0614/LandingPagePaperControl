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

  async iniciarSesion({ correo, contrasena, direccionIp, agenteUsuario }) {
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

    if (!usuario.esta_activo) {
      // Una cuenta desactivada se conserva en la base, pero no puede ingresar.
      await this.#registrarIntento(usuario.id, correoNormalizado, false, "CUENTA_INACTIVA", direccionIp, agenteUsuario);
      throw new ErrorAplicacion("La cuenta no está habilitada.", 403, "CUENTA_INACTIVA");
    }

    const ahora = new Date();
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora) {
      // El bloqueo se libera automáticamente cuando pasa la fecha almacenada.
      await this.#registrarIntento(usuario.id, correoNormalizado, false, "CUENTA_BLOQUEADA", direccionIp, agenteUsuario);
      throw new ErrorAplicacion("La cuenta está bloqueada temporalmente.", 423, "CUENTA_BLOQUEADA", {
        bloqueadoHasta: new Date(usuario.bloqueado_hasta).toISOString(),
      });
    }

    const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.hash_contrasena);
    if (!contrasenaCorrecta) {
      // Los límites se leen de la base para poder configurarlos posteriormente.
      const [maximoIntentos, minutosBloqueo] = await Promise.all([
        this.modeloConfiguracion.obtenerEnteroPositivo("autenticacion.maximo_intentos_fallidos", 5),
        this.modeloConfiguracion.obtenerEnteroPositivo("autenticacion.minutos_bloqueo", 15),
      ]);
      const estado = await this.modeloUsuario.registrarAccesoFallido(usuario.id, maximoIntentos, minutosBloqueo);
      await this.#registrarIntento(usuario.id, correoNormalizado, false, "CREDENCIALES_INCORRECTAS", direccionIp, agenteUsuario);

      if (estado.intentos_acceso_fallidos >= maximoIntentos && estado.bloqueado_hasta) {
        throw new ErrorAplicacion("La cuenta está bloqueada temporalmente.", 423, "CUENTA_BLOQUEADA", {
          bloqueadoHasta: new Date(estado.bloqueado_hasta).toISOString(),
        });
      }
      throw new ErrorAplicacion("Correo o contraseña incorrectos.", 401, "CREDENCIALES_INCORRECTAS");
    }

    await this.modeloUsuario.registrarAccesoExitoso(usuario.id);

    // El token de acceso identifica al usuario en las futuras solicitudes.
    const tokenAcceso = jwt.sign(
      { rol: usuario.rol, correo: usuario.correo },
      this.configuracionAutenticacion.secretoAcceso,
      { subject: String(usuario.id), expiresIn: `${this.configuracionAutenticacion.minutosAcceso}m` },
    );

    // El refresh token permite renovar la sesión. En MySQL se guarda solamente
    // su huella digital para que el valor original no quede expuesto.
    const tokenRenovacion = randomBytes(48).toString("base64url");
    const hashTokenRenovacion = createHash("sha256").update(tokenRenovacion).digest("hex");
    const expiraEn = new Date(Date.now() + this.configuracionAutenticacion.diasRenovacion * 24 * 60 * 60 * 1000);

    await this.modeloSesion.crear({
      usuarioId: usuario.id,
      hashTokenRenovacion,
      direccionIp,
      agenteUsuario,
      expiraEn,
    });
    await this.#registrarIntento(usuario.id, correoNormalizado, true, null, direccionIp, agenteUsuario);

    return {
      tokenAcceso,
      tokenRenovacion,
      expiracionTokenRenovacion: expiraEn,
      usuario: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
      },
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
