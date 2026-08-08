import FilaProducto from "./FilaProducto";

function TablaProductos({ productos, eliminarProducto, editarProducto }) {
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
            {productos.map((producto) => (
            <FilaProducto
                key={producto.id}
                producto={producto}
                eliminarProducto={eliminarProducto}
                editarProducto={editarProducto}
            />
            ))}
        </tbody>
        </table>
    );
}

export default TablaProductos;