import { z } from "zod";
import { ErrorAplicacion } from "../errors/app-error.js";

export const MAX_CENTAVOS = 999999999999n; // DECIMAL(12,2)

// Se analiza la representación decimal, sin multiplicaciones de punto flotante.
export function centavos(valor) {
  const texto = String(valor);
  if (!/^-?\d+(\.\d{1,2})?$/.test(texto))
    throw new ErrorAplicacion("El importe debe tener como máximo dos decimales.", 400, "IMPORTE_INVALIDO");
  const negativo = texto.startsWith("-");
  const [entero, decimal = ""] = texto.replace(/^-/, "").split(".");
  return (BigInt(entero) * 100n + BigInt(decimal.padEnd(2, "0"))) * (negativo ? -1n : 1n);
}

export function importeSql(valor) {
  if (valor > MAX_CENTAVOS || valor < -MAX_CENTAVOS)
    throw new ErrorAplicacion("El importe calculado excede el máximo permitido.", 400, "IMPORTE_FUERA_DE_RANGO");
  const absoluto = valor < 0n ? -valor : valor;
  return `${valor < 0n ? "-" : ""}${absoluto / 100n}.${String(absoluto % 100n).padStart(2, "0")}`;
}

// Conversión solo en el límite JSON; los cálculos se mantienen en centavos.
export function importeNumero(valor) {
  if (valor > BigInt(Number.MAX_SAFE_INTEGER) || valor < -BigInt(Number.MAX_SAFE_INTEGER))
    throw new ErrorAplicacion("El agregado excede la precisión admitida por la respuesta.", 400, "IMPORTE_FUERA_DE_RANGO");
  return Number(valor) / 100;
}

export const dinero = z.number().finite().nonnegative().max(9999999999.99)
  .refine((valor) => /^\d+(\.\d{1,2})?$/.test(String(valor)), "El importe admite hasta dos decimales.");
