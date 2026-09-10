import { ErrorAplicacion } from "../errors/app-error.js";

export function paginacion(filtros = {}) {
  const pagina = Number(filtros.pagina ?? 1);
  const limite = Number(filtros.limite ?? 500);
  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 500
  )
    throw new ErrorAplicacion(
      "pagina debe estar entre 1 y 10000; limite entre 1 y 500.",
      400,
      "PAGINACION_INVALIDA",
    );
  return { pagina, limite, offset: (pagina - 1) * limite };
}

export function rangoFechas(desde, hasta) {
  const valida = (valor) =>
    typeof valor === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    valor >= "1000-01-01" &&
    Number.isFinite(Date.parse(`${valor}T00:00:00Z`)) &&
    new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
  if (
    (desde && !valida(desde)) ||
    (hasta && !valida(hasta)) ||
    (desde &&
      hasta &&
      (desde > hasta ||
        (Date.parse(hasta) - Date.parse(desde)) / 86400000 > 365))
  )
    throw new ErrorAplicacion(
      "Usa fechas reales AAAA-MM-DD y un rango de hasta 366 dÃ­as.",
      400,
      "RANGO_FECHAS_INVALIDO",
    );
}

export function limiteSql(filtros) {
  const { limite, offset } = paginacion(filtros);
  return `LIMIT ${limite + 1} OFFSET ${offset}`;
}

export function listaPaginada(nombre, filas, filtros = {}) {
  const { pagina, limite } = paginacion(filtros);
  const hayMas = filas.length > limite;
  if (hayMas && filtros.pagina === undefined && filtros.limite === undefined)
    throw new ErrorAplicacion(
      "El listado supera 500 registros. Consulta usando pagina y limite.",
      422,
      "PAGINACION_REQUERIDA",
    );
  return {
    exito: true,
    datos: {
      [nombre]: filas.slice(0, limite),
      paginacion: { pagina, limite, hayMas },
    },
  };
}
