function FilaProducto({ producto, eliminarProducto, editarProducto }) {

    const obtenerClaseStock = () => {
        if (producto.stock <= 10) return "stock-bajo";
        if (producto.stock <= 30) return "stock-medio";
        return "stock-alto";
    };

    return (
        <tr>

        <td>{producto.codigo}</td>

        <td>{producto.nombre}</td>

        <td>
            <span className="badge-categoria">
            {producto.categoria}
            </span>
        </td>

        <td>
            <span className={obtenerClaseStock()}>
            {producto.stock}
            </span>
        </td>

        <td>
            $
            {producto.precio.toLocaleString("es-CO")}
        </td>

        <td className="acciones">

            <button className="btn-editar" title="Editar producto" onClick={() => editarProducto(producto)}>
            <i className="fa-solid fa-pen"></i>
            </button>

            <button className="btn-eliminar" title="Eliminar producto"
            onClick={() => eliminarProducto(producto.id)}>
            <i className="fa-solid fa-trash"></i>
            </button>

        </td>

        </tr>
    );
}

export default FilaProducto;