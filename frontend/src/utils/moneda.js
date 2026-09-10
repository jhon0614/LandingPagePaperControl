export function limpiarMontoEntrada(valor) {
    const texto = String(valor ?? "").trim();

    if (!texto) return "";

    const sinEspacios = texto.replace(/\s/g, "");
    const tieneComa = sinEspacios.includes(",");
    const entero = (tieneComa ? sinEspacios.split(",")[0] : sinEspacios)
        .replace(/\D/g, "");
    const decimal = tieneComa
        ? (sinEspacios.split(",").slice(1).join("").replace(/\D/g, "").slice(0, 2))
        : "";

    if (!entero && !decimal) return "";

    return decimal ? `${entero || "0"}.${decimal}` : entero;
}

export function formatearMontoEntrada(valor) {
    const limpio = limpiarMontoEntrada(valor);

    if (!limpio) return "";

    const [entero, decimal] = limpio.split(".");
    const enteroFormateado = Number(entero || 0).toLocaleString("es-CO");

    return decimal !== undefined
        ? `${enteroFormateado},${decimal}`
        : enteroFormateado;
}

export function aNumeroMonto(valor) {
    const limpio = limpiarMontoEntrada(valor);
    return limpio === "" ? 0 : Number(limpio);
}
