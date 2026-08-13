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

  async consumirYActualizarContrasena({ hashToken, hashContrasena }) {
    // Bloquea el token mientras se consume para que dos solicitudes no puedan
    // utilizarlo al mismo tiempo. El cambio y la revocación son una sola operación.
    const conexion = await this.conexiones.getConnection();

    try {
      // FOR UPDATE reserva el registro hasta confirmar o deshacer la operación.
      await conexion.beginTransaction();
      const [filas] = await conexion.execute(
        `SELECT t.id, t.usuario_id
           FROM tokens_recuperacion_contrasena t
           JOIN usuarios u ON u.id = t.usuario_id
          WHERE t.hash_token = ?
            AND t.usado_en IS NULL
            AND t.expira_en > UTC_TIMESTAMP()
            AND u.eliminado_en IS NULL
          LIMIT 1
          FOR UPDATE`,
        [hashToken],
      );

      const solicitud = filas[0];
      if (!solicitud) {
        // No se modifica nada cuando el token no existe, venció o ya fue usado.
        await conexion.rollback();
        return null;
      }

      await conexion.execute(
        `UPDATE tokens_recuperacion_contrasena
            SET usado_en = UTC_TIMESTAMP()
          WHERE id = ?`,
        [solicitud.id],
      );
      await conexion.execute(
        `UPDATE usuarios
            SET hash_contrasena = ?,
                debe_cambiar_contrasena = FALSE,
                contrasena_cambiada_en = UTC_TIMESTAMP(),
                intentos_acceso_fallidos = 0,
                bloqueado_hasta = NULL
          WHERE id = ?`,
        [hashContrasena, solicitud.usuario_id],
      );
      await conexion.execute(
        `UPDATE sesiones_usuario
            SET revocado_en = UTC_TIMESTAMP()
          WHERE usuario_id = ?
            AND revocado_en IS NULL`,
        [solicitud.usuario_id],
      );

      // Solo aquí quedan confirmados el consumo, el cambio y la revocación.
      await conexion.commit();
      return solicitud.usuario_id;
    } catch (error) {
      // Ante cualquier fallo, MySQL conserva el estado anterior completo.
      await conexion.rollback();
      throw error;
    } finally {
      // Devuelve la conexión al grupo Singleton aunque la operación falle.
      conexion.release();
    }
  }

  async invalidarPorUsuario(usuarioId) {
    // Puede utilizarse cuando sea necesario cancelar todos los enlaces pendientes.
    await this.conexiones.execute(
      `UPDATE tokens_recuperacion_contrasena
          SET usado_en = UTC_TIMESTAMP()
        WHERE usuario_id = ?
          AND usado_en IS NULL`,
      [usuarioId],
    );
  }
}
