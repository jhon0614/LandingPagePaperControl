// Agrupa las consultas relacionadas con usuarios. De esta manera, el resto de
// la aplicación no necesita conocer cómo están escritas las consultas SQL.
export class ModeloUsuario {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async buscarParaAutenticacion(correo) {
    // Busca el usuario y su rol usando el correo recibido en el login.
    const [filas] = await this.conexiones.execute(
      `SELECT u.id, u.correo, u.nombres, u.apellidos, u.hash_contrasena,
              u.esta_activo, u.intentos_acceso_fallidos, u.bloqueado_hasta,
              r.nombre AS rol
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE u.correo = ? AND u.eliminado_en IS NULL
        LIMIT 1`,
      [correo],
    );
    return filas[0] ?? null;
  }

  async registrarAccesoFallido(usuarioId, maximoIntentos, minutosBloqueo) {
    // Suma un intento fallido y establece un bloqueo cuando se alcanza el límite.
    await this.conexiones.execute(
      `UPDATE usuarios
          SET intentos_acceso_fallidos = intentos_acceso_fallidos + 1,
              bloqueado_hasta = CASE
                WHEN intentos_acceso_fallidos + 1 >= ?
                THEN DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
                ELSE bloqueado_hasta
              END
        WHERE id = ?`,
      [maximoIntentos, minutosBloqueo, usuarioId],
    );

    const [filas] = await this.conexiones.execute(
      `SELECT intentos_acceso_fallidos, bloqueado_hasta
         FROM usuarios WHERE id = ?`,
      [usuarioId],
    );
    return filas[0];
  }

  async registrarAccesoExitoso(usuarioId) {
    // Limpia los intentos anteriores y registra la fecha del último acceso.
    await this.conexiones.execute(
      `UPDATE usuarios
          SET intentos_acceso_fallidos = 0,
              bloqueado_hasta = NULL,
              ultimo_acceso_en = UTC_TIMESTAMP()
        WHERE id = ?`,
      [usuarioId],
    );
  }
}
