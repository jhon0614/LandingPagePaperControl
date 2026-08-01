// Consulta parámetros que pueden cambiar sin modificar el código, por ejemplo
// la cantidad máxima de intentos permitidos.
export class ModeloConfiguracion {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async obtenerEnteroPositivo(clave, valorDefecto) {
    // Si el valor no existe o no es válido, se utiliza un valor seguro por defecto.
    const [filas] = await this.conexiones.execute(
      "SELECT valor_configuracion FROM configuraciones_sistema WHERE clave_configuracion = ? LIMIT 1",
      [clave],
    );
    const valor = Number(filas[0]?.valor_configuracion ?? valorDefecto);
    return Number.isInteger(valor) && valor > 0 ? valor : valorDefecto;
  }
}
