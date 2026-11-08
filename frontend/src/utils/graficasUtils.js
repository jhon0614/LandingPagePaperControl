/*
 * Utilidades compartidas por las gráficas del dashboard y de reportes.
 */

export const COLORES = {
    primario: "#05788a",
    primarioClaro: "#3aa6b9",
    celadon: "#8fd3b6",
    oscuro: "#062f3d",
    naranja: "#f2a65a",
    rojo: "#e5675c",
    texto: "#64748b",
    rejilla: "#eaf0f3",
};

export function formatoPesos(valor) {
    return `$${Number(valor || 0).toLocaleString("es-CO")}`;
}

/*
 * Montos cortos para los ejes: $850 · $320 mil · $1,2 M
 */
export function formatoPesosCorto(valor) {
    const n = Number(valor || 0);

    if (Math.abs(n) >= 1_000_000) {
        return `$${(n / 1_000_000).toLocaleString("es-CO", {
            maximumFractionDigits: 1,
        })} M`;
    }

    if (Math.abs(n) >= 1_000) {
        return `$${Math.round(n / 1_000).toLocaleString("es-CO")} mil`;
    }

    return `$${n.toLocaleString("es-CO")}`;
}

export function fechaDesdeTexto(texto) {
    const [anio, mes, dia] = String(texto).slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}

export function textoDesdeFecha(fecha) {
    return fecha.toISOString().slice(0, 10);
}

/*
 * El reporte solo trae los días con actividad. Para que la gráfica
 * muestre la tendencia real, se rellenan con 0 los días sin movimiento
 * entre "desde" y "hasta".
 */
export function completarDias(dias = [], desde, hasta) {
    const porFecha = new Map(
        dias.map((dia) => [String(dia.fecha).slice(0, 10), dia])
    );

    const fechasConDatos = [...porFecha.keys()].sort();

    const inicioTexto = desde || fechasConDatos[0];
    const finTexto = hasta || fechasConDatos[fechasConDatos.length - 1];

    if (!inicioTexto || !finTexto) return [];

    const resultado = [];
    const cursor = fechaDesdeTexto(inicioTexto);
    const fin = fechaDesdeTexto(finTexto);

    while (cursor <= fin && resultado.length < 400) {
        const clave = textoDesdeFecha(cursor);
        const dia = porFecha.get(clave);

        resultado.push({
            fecha: clave,
            etiqueta: `${clave.slice(8, 10)}/${clave.slice(5, 7)}`,
            etiquetaLarga: `${clave.slice(8, 10)}/${clave.slice(5, 7)}/${clave.slice(0, 4)}`,
            ventas: Number(dia?.totalVentas || 0),
            gastos: Number(dia?.totalGastos || 0),
        });

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return resultado;
}

export function hoyTexto(diasAtras = 0) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}