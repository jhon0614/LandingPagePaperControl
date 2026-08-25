// Registra las sesiones iniciadas. Solo recibe el hash del refresh token,
// nunca el token original que se entrega al navegador.
export class ModeloSesion {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async crear({
    usuarioId,
    hashTokenRenovacion,
    direccionIp,
    agenteUsuario,
    expiraEn,
    esPersistente,
  }) {
    await this.conexiones.execute(
      `INSERT INTO sesiones_usuario
        (usuario_id, hash_token_renovacion, direccion_ip, agente_usuario,
         expira_en, es_persistente)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        hashTokenRenovacion,
        direccionIp ?? null,
        agenteUsuario?.slice(0, 500) ?? null,
        expiraEn,
        esPersistente,
      ],
    );
  }

  async buscarActivaPorHash(hashTokenRenovacion) {
    // Además de revisar la sesión, confirma que el usuario siga disponible.
    // También recupera si debe cambiar su contraseña para conservar esa regla
    // cuando React restaura la sesión mediante /refresh.
    const [filas] = await this.conexiones.execute(
      `SELECT s.id AS sesion_id, s.usuario_id, s.hash_token_renovacion,
              s.expira_en, s.es_persistente,
              u.nombres, u.apellidos, u.correo, u.debe_cambiar_contrasena,
              r.nombre AS rol
         FROM sesiones_usuario s
         JOIN usuarios u ON u.id = s.usuario_id
         JOIN roles r ON r.id = u.rol_id
        WHERE s.hash_token_renovacion = ?
          AND s.revocado_en IS NULL
          AND s.expira_en > UTC_TIMESTAMP()
          AND u.esta_activo = TRUE
          AND u.eliminado_en IS NULL
        LIMIT 1`,
      [hashTokenRenovacion],
    );

    return filas[0] ?? null;
  }

  async rotarToken({ sesionId, hashTokenActual, hashTokenNuevo, expiraEn }) {
    // Reemplaza el token anterior. La condición evita que dos renovaciones
    // simultáneas puedan utilizar el mismo token.
    const [resultado] = await this.conexiones.execute(
      `UPDATE sesiones_usuario
          SET hash_token_renovacion = ?,
              expira_en = ?
        WHERE id = ?
          AND hash_token_renovacion = ?
          AND revocado_en IS NULL
          AND expira_en > UTC_TIMESTAMP()`,
      [hashTokenNuevo, expiraEn, sesionId, hashTokenActual],
    );

    return resultado.affectedRows > 0;
  }

  async revocarPorHash(hashTokenRenovacion) {
    // Cierra únicamente la sesión representada por la cookie recibida.
    await this.conexiones.execute(
      `UPDATE sesiones_usuario
          SET revocado_en = UTC_TIMESTAMP()
        WHERE hash_token_renovacion = ?
          AND revocado_en IS NULL`,
      [hashTokenRenovacion],
    );
  }

  async revocarPorUsuario(usuarioId) {
    // Marcar con UTC_TIMESTAMP() todas las sesiones del usuario
    // que todavía no estén revocadas.
    await this.conexiones.execute(
      `UPDATE sesiones_usuario
          SET revocado_en = UTC_TIMESTAMP()
        WHERE usuario_id = ?
          AND revocado_en IS NULL`,
      [usuarioId],
    );
  }
}
