// Presenta los COUNT de MySQL como números JSON, aunque el driver los entregue
// como texto o bigint según la configuración de la conexión.
export class ServicioDashboard {
  constructor(modelo) {
    this.modelo = modelo;
  }

  async resumen() {
    const fila = await this.modelo.resumen();

    return {
      productos: Number(fila?.productos ?? 0),
      ventas: Number(fila?.ventas ?? 0),
      usuarios: Number(fila?.usuarios ?? 0),
      stockBajo: Number(fila?.stock_bajo ?? 0),
    };
  }
}
