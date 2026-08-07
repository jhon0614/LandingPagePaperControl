// Guarda un historial de las acciones importantes realizadas en el sistema.
export class ModeloAuditoria {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async registrar({
    usuarioId,
    accion,
    tipoEntidad,
    entidadId,
    detalles,
    direccionIp,
  }) {
    // MySQL recibe los detalles como JSON. Cuando no hay detalles, guarda null.
    const detallesJson = detalles ? JSON.stringify(detalles) : null;

    const [resultado] = await this.conexiones.execute(
      `INSERT INTO registros_auditoria
        (usuario_id, accion, tipo_entidad, entidad_id, detalles, direccion_ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        accion,
        tipoEntidad,
        entidadId,
        detallesJson,
        direccionIp?.slice(0, 45) ?? null,
      ],
    );

    // Devuelve el identificador del registro creado.
    return resultado.insertId;
  }
}
