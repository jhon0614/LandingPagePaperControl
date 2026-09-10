import { randomUUID } from "node:crypto";

export class ModeloColaCorreo {
  constructor(conexiones) { this.conexiones = conexiones; }
  async encolar(correo) {
    // Se encola también el correo inexistente: la respuesta HTTP no consulta usuarios ni SMTP.
    await this.conexiones.execute("INSERT INTO cola_recuperacion (correo) VALUES (?)", [correo]);
  }
  async tomar() {
    const conexion = await this.conexiones.getConnection();
    try {
      await conexion.beginTransaction();
      const [filas] = await conexion.execute(
        `SELECT id, correo FROM cola_recuperacion WHERE disponible_en <= UTC_TIMESTAMP()
          AND intentos < 3 ORDER BY disponible_en, id LIMIT 1 FOR UPDATE SKIP LOCKED`,
      );
      if (!filas[0]) { await conexion.commit(); return null; }
      const tarea = { ...filas[0], reserva: randomUUID() };
      await conexion.execute(
        `UPDATE cola_recuperacion SET intentos = intentos + 1, reserva = ?,
          disponible_en = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) WHERE id = ?`,
        [tarea.reserva, tarea.id],
      );
      await conexion.commit();
      return tarea;
    } catch (error) { await conexion.rollback(); throw error; }
    finally { conexion.release(); }
  }
  async completar(tarea) {
    await this.conexiones.execute("DELETE FROM cola_recuperacion WHERE id = ? AND reserva = ?", [tarea.id, tarea.reserva]);
  }
  async limpiar() {
    await this.conexiones.execute("DELETE FROM cola_recuperacion WHERE disponible_en < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) LIMIT 1000");
    await this.conexiones.execute("DELETE FROM limites_solicitudes WHERE reinicia_en < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) LIMIT 1000");
  }
}
