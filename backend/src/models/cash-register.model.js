// Encapsula las consultas de turnos y gastos. Las operaciones de apertura y
// cierre usan transacciones para impedir estados parciales o dos cajas abiertas.
export class ModeloTurnoCaja {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async buscarAbierto(ejecutor = this.conexiones, bloquear = false) {
    // FOR UPDATE se activa dentro de transacciones que necesitan exclusividad.
    const [filas] = await ejecutor.execute(
      `SELECT t.id, t.abierto_por, t.cerrado_por, t.monto_apertura,
              t.abierto_en, t.efectivo_esperado, t.efectivo_contado,
              t.diferencia, t.cerrado_en, t.estado, t.notas_cierre,
              CONCAT(u.nombres, ' ', u.apellidos) AS abierto_por_nombre
         FROM turnos_caja t
         JOIN usuarios u ON u.id = t.abierto_por
        WHERE t.estado = 'ABIERTO'
        ORDER BY t.abierto_en DESC
        LIMIT 1${bloquear ? " FOR UPDATE" : ""}`,
    );
    return filas[0] ?? null;
  }

  async abrir({ usuarioId, montoInicial }) {
    const conexion = await this.conexiones.getConnection();
    try {
      // El bloqueo serializa aperturas simultáneas antes de insertar el turno.
      await conexion.beginTransaction();
      const abierto = await this.buscarAbierto(conexion, true);
      if (abierto) {
        await conexion.rollback();
        return { existente: abierto };
      }
      const [resultado] = await conexion.execute(
        `INSERT INTO turnos_caja (abierto_por, monto_apertura)
         VALUES (?, ?)`,
        [usuarioId, montoInicial],
      );
      const [filas] = await conexion.execute(
        `SELECT t.id, t.abierto_por, t.cerrado_por, t.monto_apertura,
                t.abierto_en, t.efectivo_esperado, t.efectivo_contado,
                t.diferencia, t.cerrado_en, t.estado, t.notas_cierre,
                CONCAT(u.nombres, ' ', u.apellidos) AS abierto_por_nombre
           FROM turnos_caja t
           JOIN usuarios u ON u.id = t.abierto_por
          WHERE t.id = ?`,
        [resultado.insertId],
      );
      await conexion.commit();
      return { creado: filas[0] };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async obtenerResumen(turnoId, ejecutor = this.conexiones) {
    // Las ventas anuladas no aportan al cuadre y los gastos reducen el efectivo.
    const [filas] = await ejecutor.execute(
      `SELECT t.monto_apertura,
              COALESCE(v.total_ventas, 0) AS total_ventas,
              COALESCE(v.efectivo, 0) AS efectivo,
              COALESCE(v.tarjeta, 0) AS tarjeta,
              COALESCE(v.transferencia, 0) AS transferencia,
              COALESCE(g.total_gastos, 0) AS total_gastos
         FROM turnos_caja t
         LEFT JOIN (
           SELECT ve.turno_caja_id,
                  SUM(p.monto) AS total_ventas,
                  SUM(CASE WHEN mp.codigo = 'EFECTIVO' THEN p.monto ELSE 0 END) AS efectivo,
                  SUM(CASE WHEN mp.codigo = 'TARJETA' THEN p.monto ELSE 0 END) AS tarjeta,
                  SUM(CASE WHEN mp.codigo = 'TRANSFERENCIA' THEN p.monto ELSE 0 END) AS transferencia
             FROM ventas ve
             JOIN pagos_venta p ON p.venta_id = ve.id
             JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
            WHERE ve.estado = 'CONFIRMADA' AND ve.turno_caja_id = ?
            GROUP BY ve.turno_caja_id
         ) v ON v.turno_caja_id = t.id
         LEFT JOIN (
           SELECT turno_caja_id, SUM(monto) AS total_gastos
             FROM gastos_caja WHERE turno_caja_id = ? GROUP BY turno_caja_id
         ) g ON g.turno_caja_id = t.id
        WHERE t.id = ?`,
      [turnoId, turnoId, turnoId],
    );
    return filas[0] ?? null;
  }

  async listarGastos(turnoId) {
    const [filas] = await this.conexiones.execute(
      `SELECT g.id, g.turno_caja_id, g.registrado_por, g.descripcion,
              g.monto, g.ocurrido_en, g.creado_en,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
         FROM gastos_caja g
         JOIN usuarios u ON u.id = g.registrado_por
        WHERE g.turno_caja_id = ?
        ORDER BY g.ocurrido_en DESC, g.id DESC`,
      [turnoId],
    );
    return filas;
  }

  async crearGasto({ turnoId, usuarioId, descripcion, monto }) {
    const [resultado] = await this.conexiones.execute(
      `INSERT INTO gastos_caja
         (turno_caja_id, registrado_por, descripcion, monto)
       VALUES (?, ?, ?, ?)`,
      [turnoId, usuarioId, descripcion, monto],
    );
    const [filas] = await this.conexiones.execute(
      `SELECT id, turno_caja_id, registrado_por, descripcion, monto,
              ocurrido_en, creado_en
         FROM gastos_caja WHERE id = ?`,
      [resultado.insertId],
    );
    return filas[0];
  }

  async buscarGasto(id) {
    const [filas] = await this.conexiones.execute(
      `SELECT id, turno_caja_id, registrado_por, descripcion, monto,
              ocurrido_en, creado_en
         FROM gastos_caja WHERE id = ? LIMIT 1`,
      [id],
    );
    return filas[0] ?? null;
  }

  async eliminarGasto(id) {
    const [resultado] = await this.conexiones.execute(
      `DELETE FROM gastos_caja WHERE id = ?`,
      [id],
    );
    return resultado.affectedRows > 0;
  }

  async cerrar({ turnoId, usuarioId, montoContado }) {
    const conexion = await this.conexiones.getConnection();
    try {
      // Turno, resumen y cierre se calculan bajo la misma transacción.
      await conexion.beginTransaction();
      const [turnos] = await conexion.execute(
        `SELECT id, monto_apertura, estado FROM turnos_caja
          WHERE id = ? FOR UPDATE`,
        [turnoId],
      );
      if (!turnos[0] || turnos[0].estado !== "ABIERTO") {
        await conexion.rollback();
        return null;
      }
      const resumen = await this.obtenerResumen(turnoId, conexion);
      // Solo los pagos en efectivo afectan el dinero físico esperado en caja.
      const esperado =
        Number(resumen.monto_apertura) +
        Number(resumen.efectivo) -
        Number(resumen.total_gastos);
      const diferencia = Number(montoContado) - esperado;
      await conexion.execute(
        `UPDATE turnos_caja
            SET cerrado_por = ?, efectivo_esperado = ?, efectivo_contado = ?,
                diferencia = ?, cerrado_en = CURRENT_TIMESTAMP, estado = 'CERRADO'
          WHERE id = ? AND estado = 'ABIERTO'`,
        [usuarioId, esperado, montoContado, diferencia, turnoId],
      );
      const [filas] = await conexion.execute(
        `SELECT id, abierto_por, cerrado_por, monto_apertura, abierto_en,
                efectivo_esperado, efectivo_contado, diferencia, cerrado_en,
                estado, notas_cierre
           FROM turnos_caja WHERE id = ?`,
        [turnoId],
      );
      await conexion.commit();
      return { turno: filas[0], resumen };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async listar({ desde, hasta }) {
    // Los filtros se construyen con fragmentos controlados y valores preparados.
    const condiciones = [];
    const parametros = [];
    if (desde) {
      condiciones.push("t.abierto_en >= ?");
      parametros.push(desde);
    }
    if (hasta) {
      condiciones.push("t.abierto_en < DATE_ADD(?, INTERVAL 1 DAY)");
      parametros.push(hasta);
    }
    const where = condiciones.length
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";
    const [filas] = await this.conexiones.execute(
      `SELECT t.id, t.abierto_por, t.cerrado_por, t.monto_apertura,
              t.abierto_en, t.efectivo_esperado, t.efectivo_contado,
              t.diferencia, t.cerrado_en, t.estado, t.notas_cierre,
              CONCAT(ua.nombres, ' ', ua.apellidos) AS abierto_por_nombre,
              CONCAT(uc.nombres, ' ', uc.apellidos) AS cerrado_por_nombre
         FROM turnos_caja t
         JOIN usuarios ua ON ua.id = t.abierto_por
         LEFT JOIN usuarios uc ON uc.id = t.cerrado_por
         ${where}
        ORDER BY t.abierto_en DESC`,
      parametros,
    );
    return filas;
  }
}
