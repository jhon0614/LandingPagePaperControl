// Registra las sesiones iniciadas. Solo recibe el hash del refresh token,
// nunca el token original que se entrega al navegador.
export class ModeloSesion {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async crear({ usuarioId, hashTokenRenovacion, direccionIp, agenteUsuario, expiraEn }) {
    await this.conexiones.execute(
      `INSERT INTO sesiones_usuario
        (usuario_id, hash_token_renovacion, direccion_ip, agente_usuario, expira_en)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, hashTokenRenovacion, direccionIp ?? null, agenteUsuario?.slice(0, 500) ?? null, expiraEn],
    );
  }
}
