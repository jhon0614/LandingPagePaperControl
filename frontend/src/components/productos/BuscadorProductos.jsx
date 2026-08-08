function BuscadorProductos({ valor, cambiarValor }) {
    return (
        <div className="productos-busqueda">

        <i className="fa-solid fa-magnifying-glass buscador-icono"></i>

        <input
            type="text"
            placeholder="Buscar producto..."
            value={valor}
            onChange={(e) => cambiarValor(e.target.value)}
        />

        {valor && (
            <button
            type="button"
            className="buscador-limpiar"
            onClick={() => cambiarValor("")}
            title="Limpiar búsqueda"
            >
            <i className="fa-solid fa-xmark"></i>
            </button>
        )}

        </div>
    );
}

export default BuscadorProductos;