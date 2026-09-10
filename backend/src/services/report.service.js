import { rangoFechas } from "../utils/query.js";
import { centavos, importeNumero } from "../utils/money.js";
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
      return (
        Number.isFinite(fechaUTC.getTime()) &&
        fechaUTC.toISOString().slice(0, 10) === valor &&
        valor >= "1000-01-01"
      );
    };
    if (!valida(desde) || !valida(hasta) || desde > hasta) {
      throw new ErrorAplicacion(
        "Envía desde y hasta como fechas válidas AAAA-MM-DD en orden cronológico.",
        400,
        "RANGO_FECHAS_INVALIDO",
      );
    }
    // Acota el trabajo de una petición y rechaza IDs ambiguos o repetidos.
    if ((Date.parse(hasta) - Date.parse(desde)) / 86400000 > 365)
      throw new ErrorAplicacion(
        "El rango no puede superar 366 días.",
        400,
        "RANGO_FECHAS_INVALIDO",
      );
    let vendedorId;
    if (filtros.vendedorId !== undefined) {
      if (
        typeof filtros.vendedorId !== "string" ||
        !/^[1-9]\d*$/.test(filtros.vendedorId) ||
        !Number.isSafeInteger(Number(filtros.vendedorId))
      )
        throw new ErrorAplicacion(
          "El vendedorId no es válido.",
          400,
          "VENDEDOR_ID_INVALIDO",
        );
      vendedorId = Number(filtros.vendedorId);
    }
    const filas = await this.modelo.caja({ desde, hasta, vendedorId });
    const dias = filas.map((fila) => ({
      fecha: fila.fecha,
      totalVentas: Number(fila.total_ventas),
      ventasPorMetodo: {
        efectivo: Number(fila.efectivo),
        tarjeta: Number(fila.tarjeta),
        transferencia: Number(fila.transferencia),
      },
      totalGastos: Number(fila.total_gastos),
      flujoNeto: importeNumero(
        centavos(fila.total_ventas) - centavos(fila.total_gastos),
      ),
    }));
    const sumar = (obtener) =>
      importeNumero(filas.reduce((total, fila) => total + obtener(fila), 0n));
    return {
      desde,
      hasta,
      vendedorId: vendedorId ?? null,
      dias,
      resumen: {
        totalVentas: sumar((d) => centavos(d.total_ventas)),
        totalGastos: sumar((d) => centavos(d.total_gastos)),
        flujoNeto: sumar(
          (d) => centavos(d.total_ventas) - centavos(d.total_gastos),
        ),
        ventasPorMetodo: {
          efectivo: sumar((d) => centavos(d.efectivo)),
          tarjeta: sumar((d) => centavos(d.tarjeta)),
          transferencia: sumar((d) => centavos(d.transferencia)),
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
    if (periodo === "rango") rangoFechas(filtros.desde, filtros.hasta);
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
