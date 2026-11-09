import { centavos, MAX_CENTAVOS } from "./money.js";
import { ErrorAplicacion } from "../errors/app-error.js";

export const MAX_PORCENTAJE_DESCUENTO = 70;

export function validarDescuento(tipo, valor = 0) {
  const invalido = () =>
    new ErrorAplicacion(
      `Descuento inválido: usa PORCENTAJE (0 a ${MAX_PORCENTAJE_DESCUENTO}) o VALOR_FIJO no negativo, con hasta dos decimales.`,
      400,
      "DESCUENTO_INVALIDO",
    );
  if (tipo != null && !["PORCENTAJE", "VALOR_FIJO"].includes(tipo))
    throw invalido();
  if (typeof valor !== "number" || !Number.isFinite(valor)) throw invalido();
  let unidades;
  try {
    unidades = centavos(valor);
  } catch {
    throw invalido();
  }
  if (
    unidades < 0n ||
    unidades > MAX_CENTAVOS ||
    (tipo == null && unidades !== 0n)
  )
    throw invalido();
  if (tipo === "PORCENTAJE" && unidades > BigInt(MAX_PORCENTAJE_DESCUENTO) * 100n)
    throw new ErrorAplicacion(
      `El descuento no puede superar el ${MAX_PORCENTAJE_DESCUENTO} % del subtotal.`,
      400,
      "DESCUENTO_INVALIDO",
    );
  return unidades;
}

export function calcularDescuento(subtotal, tipo, valor = 0) {
  const unidades = validarDescuento(tipo, valor);
  // Porcentajes en centésimas: redondeo de medio centavo hacia arriba.
  const descuento =
    tipo === "PORCENTAJE"
      ? (subtotal * unidades + 5000n) / 10000n
      : tipo === "VALOR_FIJO"
        ? unidades
        : 0n;
  if (descuento * 100n > subtotal * BigInt(MAX_PORCENTAJE_DESCUENTO))
    throw new ErrorAplicacion(
      `El descuento no puede superar el ${MAX_PORCENTAJE_DESCUENTO} % del subtotal.`,
      400,
      "DESCUENTO_INVALIDO",
    );
  return descuento;
}
