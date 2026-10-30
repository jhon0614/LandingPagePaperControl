// Registra y consulta solicitudes usando la transacción de creación de la venta.
export class SolicitudesVenta {
  async registrarYBuscar(
    conexion,
    { usuarioId, claveIdempotencia, hashSolicitud },
  ) {
    // Si la clave ya existe, conserva la solicitud original.
    await conexion.execute(
      `INSERT INTO solicitudes_venta (usuario_id, clave, hash_solicitud)
       VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE clave = clave`,
      [usuarioId, claveIdempotencia, hashSolicitud],
    );

    // Bloquea la solicitud para coordinar intentos simultáneos con la misma clave.
    const [solicitudes] = await conexion.execute(
      `SELECT hash_solicitud, venta_id FROM solicitudes_venta
       WHERE usuario_id = ? AND clave = ? FOR UPDATE`,
      [usuarioId, claveIdempotencia],
    );

    return solicitudes[0];
  }
}