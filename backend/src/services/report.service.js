import { ErrorAplicacion } from "../errors/app-error.js";
const fecha = /^\d{4}-\d{2}-\d{2}$/;
// Valida los filtros antes de construir la consulta y presenta cantidades como
// números, aunque el driver entregue el resultado de SUM como texto.
export class ServicioReporte {
  constructor(modelo) {
    this.modelo = modelo;
  }
  async caja(filtros) {
    const { desde, hasta } = filtros;
    const valida = (valor) => {
      if (typeof valor !== "string" || !fecha.test(valor)) return false;
      const fechaUTC = new Date(`${valor}T00:00:00Z`);
      return Number.isFinite(fechaUTC.getTime()) &&
        fechaUTC.toISOString().slice(0, 10) === valor && valor >= "1000-01-01";
    };
    if (!valida(desde) || !valida(hasta) || desde > hasta) {
      throw new ErrorAplicacion(
        "Envía desde y hasta como fechas válidas AAAA-MM-DD en orden cronológico.",
        400, "RANGO_FECHAS_INVALIDO",
      );
    }
    // Acota el trabajo de una petición y rechaza IDs ambiguos o repetidos.
    if ((Date.parse(hasta) - Date.parse(desde)) / 86400000 > 365)
      throw new ErrorAplicacion("El rango no puede superar 366 días.", 400, "RANGO_FECHAS_INVALIDO");
    let vendedorId;
    if (filtros.vendedorId !== undefined) {
      if (typeof filtros.vendedorId !== "string" || !/^[1-9]\d*$/.test(filtros.vendedorId) ||
          !Number.isSafeInteger(Number(filtros.vendedorId)))
        throw new ErrorAplicacion("El vendedorId no es válido.", 400, "VENDEDOR_ID_INVALIDO");
      vendedorId = Number(filtros.vendedorId);
    }
    const redondear = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;
    const dias = (await this.modelo.caja({ desde, hasta, vendedorId })).map((fila) => ({
      fecha: fila.fecha,
      totalVentas: Number(fila.total_ventas),
      ventasPorMetodo: {
        efectivo: Number(fila.efectivo), tarjeta: Number(fila.tarjeta),
        transferencia: Number(fila.transferencia),
      },
      totalGastos: Number(fila.total_gastos),
      flujoNeto: redondear(Number(fila.total_ventas) - Number(fila.total_gastos)),
    }));
    const sumar = (obtener) => redondear(dias.reduce((total, dia) => total + obtener(dia), 0));
    return {
      desde, hasta, vendedorId: vendedorId ?? null, dias,
      resumen: {
        totalVentas: sumar((d) => d.totalVentas),
        totalGastos: sumar((d) => d.totalGastos),
        flujoNeto: sumar((d) => d.totalVentas - d.totalGastos),
        ventasPorMetodo: {
          efectivo: sumar((d) => d.ventasPorMetodo.efectivo),
          tarjeta: sumar((d) => d.ventasPorMetodo.tarjeta),
          transferencia: sumar((d) => d.ventasPorMetodo.transferencia),
        },
      },
    };
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
