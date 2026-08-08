function EstadisticasProductos({ productos }) {

    const total = productos.length;

    const stockBajo = productos.filter(
        (producto) => Number(producto.stock) <= 10
    ).length;

    const categorias = new Set(
        productos.map((producto) => producto.categoria)
    ).size;

    const valorInventario = productos.reduce(
        (total, producto) => {
        return total + (
            Number(producto.stock || 0) *
            Number(producto.precio || 0)
        );
        },
        0
    );

    const formatoMoneda = (valor) => {
        return valor.toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
        });
    };

    return (
        <div className="estadisticas">

        {/* PRODUCTOS */}

        <div className="card-estadistica">

            <i className="fa-solid fa-box"></i>

            <h3>{total}</h3>

            <p>Productos</p>

        </div>


        {/* STOCK BAJO */}

        <div className="card-estadistica">

            <i className="fa-solid fa-triangle-exclamation"></i>

            <h3>{stockBajo}</h3>

            <p>Stock bajo</p>

        </div>


        {/* CATEGORÍAS */}

        <div className="card-estadistica">

            <i className="fa-solid fa-tags"></i>

            <h3>{categorias}</h3>

            <p>Categorías</p>

        </div>


        {/* VALOR INVENTARIO */}

        <div className="card-estadistica">

            <i className="fa-solid fa-dollar-sign"></i>

            <h3>{formatoMoneda(valorInventario)}</h3>

            <p>Valor del inventario</p>

        </div>

        </div>
    );
}

export default EstadisticasProductos;