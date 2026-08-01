// Guarda un historial de los intentos de acceso, sean correctos o fallidos.
export class ModeloIntentoAcceso {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async crear({ usuarioId, correo, fueExitoso, motivoFallo, direccionIp, agenteUsuario }) {
    await this.conexiones.execute(
      `INSERT INTO intentos_acceso
        (usuario_id, correo_intentado, fue_exitoso, motivo_fallo, direccion_ip, agente_usuario)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        usuarioId ?? null,
        correo,
        fueExitoso,
        motivoFallo ?? null,
        direccionIp ?? null,
        agenteUsuario?.slice(0, 500) ?? null,
      ],
    );
  }
}
