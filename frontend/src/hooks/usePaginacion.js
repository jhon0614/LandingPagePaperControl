import { useState } from "react";

export const OPCIONES_POR_PAGINA = [50, 100, 200, 500];

export default function usePaginacion(
    lista,
    porPaginaInicial = 50,
    opciones = OPCIONES_POR_PAGINA
) {
    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(porPaginaInicial);

    const total = lista.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const paginaActual = Math.min(pagina, totalPaginas);
    const inicio = (paginaActual - 1) * porPagina;

    return {
        items: lista.slice(inicio, inicio + porPagina),
        total,
        pagina: paginaActual,
        totalPaginas,
        porPagina,
        opciones,
        desde: total === 0 ? 0 : inicio + 1,
        hasta: Math.min(total, inicio + porPagina),
        irPrimera: () => setPagina(1),
        irAnterior: () => setPagina(Math.max(1, paginaActual - 1)),
        irSiguiente: () => setPagina(Math.min(totalPaginas, paginaActual + 1)),
        cambiarPorPagina: (valor) => {
            setPorPagina(Number(valor));
            setPagina(1);
        },
    };
}