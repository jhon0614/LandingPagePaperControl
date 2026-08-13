// Administra los tokens temporales utilizados para restablecer contraseñas.
// El token original se envía al usuario; en MySQL se guarda únicamente su hash.
export class ModeloRestablecimientoContrasena {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async crear({ usuarioId, hashToken, expiraEn }) {
    // Invalida solicitudes anteriores para que solo funcione el token más reciente.
    await this.conexiones.execute(
      `UPDATE tokens_recuperacion_contrasena
          SET usado_en = UTC_TIMESTAMP()
        WHERE usuario_id = ?
          AND usado_en IS NULL`,
      [usuarioId],
    );

    const [resultado] = await this.conexiones.execute(
      `INSERT INTO tokens_recuperacion_contrasena
         (usuario_id, hash_token, expira_en)
       VALUES (?, ?, ?)`,
      [usuarioId, hashToken, expiraEn],
    );

    return resultado.insertId;
  }

  async buscarActivoPorHash(hashToken) {
    // Busca un token que todavía no haya sido usado ni haya vencido.
    const [filas] = await this.conexiones.execute(
      `SELECT id, usuario_id, hash_token, expira_en, creado_en
         FROM tokens_recuperacion_contrasena
        WHERE hash_token = ?
          AND usado_en IS NULL
          AND expira_en > UTC_TIMESTAMP()
        LIMIT 1`,
      [hashToken],
    );

    return filas[0] ?? null;
  }

  async marcarComoUsado(id) {
    // La condición también evita aceptar un token que haya vencido justo antes.
    const [resultado] = await this.conexiones.execute(
      `UPDATE tokens_recuperacion_contrasena
          SET usado_en = UTC_TIMESTAMP()
        WHERE id = ?
          AND usado_en IS NULL
          AND expira_en > UTC_TIMESTAMP()`,
      [id],
    );

    return resultado.affectedRows > 0;
  }

  async invalidarPorUsuario(usuarioId) {
    await this.conexiones.execute(
      `UPDATE tokens_recuperacion_contrasena
          SET usado_en = UTC_TIMESTAMP()
        WHERE usuario_id = ?
          AND usado_en IS NULL`,
      [usuarioId],
    );
  }
}
