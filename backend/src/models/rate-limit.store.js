import { createHash } from "node:crypto";

// Ventanas compartidas entre procesos. El bloqueo protege incrementos concurrentes.
export class AlmacenLimitesMySQL {
  constructor(conexiones, nombre) {
    this.conexiones = conexiones;
    this.prefix = nombre;
    this.localKeys = false;
  }
  init({ windowMs }) {
    this.windowMs = windowMs;
  }
  clave(key) {
    return createHash("sha256").update(`${this.prefix}:${key}`).digest("hex");
  }
  async increment(key) {
    const conexion = await this.conexiones.getConnection();
    const clave = this.clave(key);
    try {
      await conexion.beginTransaction();
      await conexion.execute(
        `INSERT INTO limites_solicitudes (clave, total, reinicia_en)
          VALUES (?, 1, TIMESTAMPADD(MICROSECOND, ?, UTC_TIMESTAMP(3)))
          ON DUPLICATE KEY UPDATE
            total = IF(reinicia_en <= UTC_TIMESTAMP(3), 1, total + 1),
            reinicia_en = IF(reinicia_en <= UTC_TIMESTAMP(3),
              TIMESTAMPADD(MICROSECOND, ?, UTC_TIMESTAMP(3)), reinicia_en)`,
        [clave, this.windowMs * 1000, this.windowMs * 1000],
      );
      const [filas] = await conexion.execute(
        `SELECT total, DATE_FORMAT(reinicia_en, '%Y-%m-%dT%H:%i:%s.%fZ') AS reinicia_en
          FROM limites_solicitudes WHERE clave = ?`,
        [clave],
      );
      await conexion.commit();
      return {
        totalHits: Number(filas[0].total),
        resetTime: new Date(filas[0].reinicia_en),
      };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }
  async decrement(key) {
    await this.conexiones.execute(
      "UPDATE limites_solicitudes SET total = GREATEST(0, total - 1) WHERE clave = ?",
      [this.clave(key)],
    );
  }
  async resetKey(key) {
    await this.conexiones.execute(
      "DELETE FROM limites_solicitudes WHERE clave = ?",
      [this.clave(key)],
    );
  }
}
