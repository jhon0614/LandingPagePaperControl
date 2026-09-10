// Cada proceso puede ejecutar el consumidor: SKIP LOCKED evita reservar el mismo trabajo.
export function iniciarTrabajadorCorreo(
  servicio,
  cola,
  registrarError = console.error,
) {
  let pendiente = null;
  let ciclos = 0;
  const timer = setInterval(() => {
    if (pendiente) return;
    pendiente = (async () => {
      try {
        const tarea = await cola.tomar();
        if (tarea) {
          await servicio.procesarRecuperacion(tarea.correo);
          await cola.completar(tarea);
        }
        if (++ciclos % 60 === 0) await cola.limpiar();
      } catch (error) {
        // No registrar direcciones, tokens, SQL o credenciales del servidor SMTP.
        registrarError("Fallo procesando recuperación de contraseña", {
          codigo: error.code ?? "ERROR_CORREO",
        });
      }
    })().finally(() => {
      pendiente = null;
    });
  }, 1000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    await pendiente;
  };
}
