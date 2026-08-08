function EstadisticasProductos({ productos }) {

    const total = productos.length;

    const stockBajo = productos.filter(
        (p) => p.stock <= 10
    ).length;

    const categorias = new Set(
        productos.map((p) => p.categoria)
    ).size;

    return (
        <div className="estadisticas">

        <div className="card-estadistica">
            <i className="fa-solid fa-box"></i>

            <h3>{total}</h3>

            <p>Productos</p>
        </div>

        <div className="card-estadistica">
            <i className="fa-solid fa-triangle-exclamation"></i>

            <h3>{stockBajo}</h3>

            <p>Stock bajo</p>
        </div>

        <div className="card-estadistica">
            <i className="fa-solid fa-tags"></i>

            <h3>{categorias}</h3>

            <p>Categorías</p>
        </div>

        </div>
    );
}

export default EstadisticasProductos;