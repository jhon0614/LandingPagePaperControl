// Error controlado de la aplicación. Permite devolver al frontend un código,
// un mensaje entendible y el estado HTTP correspondiente.
export class ErrorAplicacion extends Error {
  constructor(mensaje, estadoHttp = 500, codigo = "ERROR_INTERNO", detalles) {
    super(mensaje);
    this.name = "ErrorAplicacion";
    this.estadoHttp = estadoHttp;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}
