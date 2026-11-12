function Botones({ paginacion }) {
    return (
        <div className="paginacion-botones">
            <button
                type="button"
                disabled={paginacion.pagina <= 1}
                onClick={paginacion.irAnterior}
            >
                Anterior
            </button>
            <span>Página {paginacion.pagina} de {paginacion.totalPaginas}</span>
            <button
                type="button"
                disabled={paginacion.pagina >= paginacion.totalPaginas}
                onClick={paginacion.irSiguiente}
            >
                Siguiente
            </button>
        </div>
    );
}

export function SelectorRegistros({ paginacion, etiqueta = "registros" }) {
    if (paginacion.total === 0) return null;

    return (
        <div className="paginacion-barra">
            <label className="paginacion-mostrar">
                Mostrar
                <select
                    value={paginacion.porPagina}
                    onChange={(e) => paginacion.cambiarPorPagina(e.target.value)}
                >
                    {paginacion.opciones.map((opcion) => (
                        <option key={opcion} value={opcion}>{opcion}</option>
                    ))}
                </select>
                {etiqueta}
            </label>
            <span className="paginacion-rango">
                {paginacion.desde}-{paginacion.hasta} de {paginacion.total}
            </span>
            <Botones paginacion={paginacion} />
        </div>
    );
}

export function NavegacionPaginas({ paginacion }) {
    if (paginacion.total === 0) return null;

    return (
        <div className="paginacion-navegacion">
            <Botones paginacion={paginacion} />
        </div>
    );
}