// Los DATETIME de autenticación son UTC, independientemente de DB_TIMEZONE
// (que conserva la zona de los registros comerciales existentes).
export function fechaUtcSql(fecha) {
  return new Date(fecha).toISOString().slice(0, 19).replace("T", " ");
}
