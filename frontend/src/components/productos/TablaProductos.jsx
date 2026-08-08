import FilaProducto from "./FilaProducto";

function TablaProductos({
    productos,
    eliminarProducto,
    editarProducto
    }) {

    return (
        <table className="tabla-productos">

        <thead>
            <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Stock</th>
            <th>Precio</th>
            <th>Acciones</th>
            </tr>
        </thead>

        <tbody>

            {productos.length > 0 ? (

            productos.map((producto) => (
                <FilaProducto
                key={producto.id}
                producto={producto}
                eliminarProducto={eliminarProducto}
                editarProducto={editarProducto}
                />
            ))

            ) : (

            <tr>
                <td
                colSpan="6"
                className="productos-sin-resultados"
                >
                <div className="sin-resultados-contenido">

                    <i className="fa-solid fa-box-open"></i>

                    <strong>
                    No encontramos productos
                    </strong>

                    <span>
                    Intenta buscar con otro nombre,
                    código o categoría.
                    </span>

                </div>
                </td>
            </tr>

            )}

        </tbody>

        </table>
    );
}

export default TablaProductos;