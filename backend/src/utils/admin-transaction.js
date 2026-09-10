import { ErrorAplicacion } from "../errors/app-error.js";

export async function transaccionAdministrativa(
  conexiones,
  responsableId,
  operacion,
) {
  const conexion = await conexiones.getConnection();
  try {
    await conexion.beginTransaction();
    // Filas estables: serializan el conteo y modificación del último administrador.
    await conexion.execute("SELECT id FROM roles ORDER BY id FOR UPDATE");
    const [responsables] = await conexion.execute(
      `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
        WHERE u.id = ? AND u.esta_activo = TRUE AND u.eliminado_en IS NULL
        AND r.nombre IN ('ADMINISTRADOR', 'DUENO') FOR UPDATE`,
      [responsableId],
    );
    if (!responsables[0])
      throw new ErrorAplicacion(
        "El responsable ya no tiene permiso.",
        403,
        "ACCESO_DENEGADO",
      );
    const resultado = await operacion(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
