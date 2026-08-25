import { ErrorAplicacion } from "../errors/app-error.js";
const fecha = /^\d{4}-\d{2}-\d{2}$/;
// Valida los filtros antes de construir la consulta y presenta cantidades como
// números, aunque el driver entregue el resultado de SUM como texto.
export class ServicioReporte {
  constructor(modelo) {
    this.modelo = modelo;
  }
  async productosMasVendidos(filtros) {
    const periodo = filtros.periodo || "semana";
    if (!["semana", "mes", "rango"].includes(periodo))
      throw new ErrorAplicacion(
        "El periodo no es válido.",
        400,
        "PERIODO_INVALIDO",
      );
    const desde = filtros.desde?.trim();
    const hasta = filtros.hasta?.trim();
    if (
      periodo === "rango" &&
      (!fecha.test(desde ?? "") || !fecha.test(hasta ?? "") || desde > hasta)
    ) {
      throw new ErrorAplicacion(
        "Para el rango debes enviar desde y hasta en formato AAAA-MM-DD.",
        400,
        "RANGO_FECHAS_INVALIDO",
      );
    }
    return (
      await this.modelo.productosMasVendidos({ periodo, desde, hasta })
    ).map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      cantidadVendida: Number(fila.cantidad_vendida),
    }));
  }
}
