export function formatoFechaHora(fecha) {

    if (!fecha) return "—";

    return new Date(fecha).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
    });

}

export function formatoHora(fecha) {

    if (!fecha) return "—";

    return new Date(fecha).toLocaleTimeString("es-CO", {
        timeZone: "America/Bogota",
    });

}