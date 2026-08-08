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

  async buscarPorId(id) {
    // Busca el usuario por ID y su rol, solo si no está eliminado.
    const [filas] = await this.conexiones.execute(
      `SELECT u.id, u.nombres, u.apellidos, u.correo, u.debe_cambiar_contrasena, u.esta_activo, u.creado_en,
              r.id AS rol_id, r.nombre AS rol
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE u.id = ? AND u.eliminado_en IS NULL
        LIMIT 1`,
      [id],
    );
    return filas[0] ?? null;
  }

  async listar() {
    const [filas] = await this.conexiones.execute(
      `SELECT u.id, u.nombres, u.apellidos, u.correo,
            u.esta_activo, u.debe_cambiar_contrasena, u.creado_en,
            r.id AS rol_id, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE u.eliminado_en IS NULL
      ORDER BY u.nombres, u.apellidos`,
    );

    return filas;
  }

  async buscarPorCorreoIncluyendoEliminados(correo) {
    // buscar por correo sin filtrar eliminado_en.
    const [filas] = await this.conexiones.execute(
      `SELECT id, correo, eliminado_en FROM usuarios WHERE correo = ? LIMIT 1`,
      [correo],
    );
    // devolver la primera fila o null.
    return filas[0] ?? null;
  }

  async crear({ nombres, apellidos, correo, hashContrasena, rolId }) {
    // Inserta el usuario con debe_cambiar_contrasena = TRUE.
    const [resultado] = await this.conexiones.execute(
      `INSERT INTO usuarios
         (nombres, apellidos, correo, hash_contrasena,
          rol_id, debe_cambiar_contrasena, esta_activo, creado_en)
       VALUES (?, ?, ?, ?, ?, TRUE, TRUE, UTC_TIMESTAMP())`,
      [nombres, apellidos, correo, hashContrasena, rolId],
    );

    // obtener insertId.
    const nuevoId = resultado.insertId;

    // consultar y devolver el usuario creado.
    return this.buscarPorId(nuevoId);
  }

  async actualizar(id, { nombres, apellidos, correo, rolId }) {
    // actualizar nombres, apellidos, correo y rol_id.
    await this.conexiones.execute(
      `UPDATE usuarios
          SET nombres = ?,
              apellidos = ?,
              correo = ?,
              rol_id = ?
        WHERE id = ?
          AND eliminado_en IS NULL`,
      [nombres, apellidos, correo, rolId, id],
    );

    // Consultar y devolver el usuario actualizado.
    return this.buscarPorId(id);
  }

  async contarAdministradoresActivosExcepto(usuarioId) {
    // Contar administradores activos y no eliminados, excluyendo al usuario indicado.
    const [filas] = await this.conexiones.execute(
      `SELECT COUNT(*) AS total
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE r.nombre = 'ADMINISTRADOR'
          AND u.esta_activo = TRUE
          AND u.eliminado_en IS NULL
          AND u.id <> ?`,
      [usuarioId],
    );

    // Devolver el total como número.
    return Number(filas[0].total);
  }

  async actualizarEstado(id, estaActivo) {
    // Actualizar el campo esta_activo, excluyendo usuarios eliminados.
    await this.conexiones.execute(
      `UPDATE usuarios
          SET esta_activo = ?
        WHERE id = ?
          AND eliminado_en IS NULL`,
      [estaActivo, id],
    );

    // Consultar y devolver el usuario actualizado.
    return this.buscarPorId(id);
  }

  async eliminarLogicamente(id) {
    // Conserva el registro, pero lo marca como eliminado e inactivo.
    const [resultado] = await this.conexiones.execute(
      `UPDATE usuarios
          SET eliminado_en = UTC_TIMESTAMP(),
              esta_activo = FALSE
        WHERE id = ?
          AND eliminado_en IS NULL`,
      [id],
    );

    return resultado.affectedRows > 0;
  }
}
