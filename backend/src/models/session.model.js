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
  }) {
    await this.conexiones.execute(
      `INSERT INTO sesiones_usuario
        (usuario_id, hash_token_renovacion, direccion_ip, agente_usuario, expira_en)
       VALUES (?, ?, ?, ?, ?)`,
      [
        usuarioId,
        hashTokenRenovacion,
        direccionIp ?? null,
        agenteUsuario?.slice(0, 500) ?? null,
        expiraEn,
      ],
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
