function FilaProducto({
    producto,
    eliminarProducto,
    editarProducto
    }) {

    const obtenerClaseStock = () => {

        const stock = Number(producto.stock);

        if (stock <= 10) {
        return "stock-bajo";
        }

        if (stock <= 30) {
        return "stock-medio";
        }

        return "stock-alto";
    };


    const precio = Number(producto.precio || 0);


    return (
        <tr>

        {/* CÓDIGO */}

        <td>
            {producto.codigo}
        </td>


        {/* NOMBRE */}

        <td>
            {producto.nombre}
        </td>


        {/* CATEGORÍA */}

        <td>

            <span className="badge-categoria">
            {producto.categoria}
            </span>

        </td>


        {/* STOCK */}

        <td>

            <span className={obtenerClaseStock()}>
            {producto.stock}
            </span>

        </td>


        {/* PRECIO */}

        <td>
            $
            {precio.toLocaleString("es-CO")}
        </td>


        {/* ACCIONES */}

        <td className="acciones">

            <button
            type="button"
            className="btn-editar"
            title="Editar producto"
            onClick={() => editarProducto(producto)}
            >
            <i className="fa-solid fa-pen"></i>
            </button>


            <button
            type="button"
            className="btn-eliminar"
            title="Eliminar producto"
            onClick={() => eliminarProducto(producto.id)}
            >
            <i className="fa-solid fa-trash"></i>
            </button>

        </td>

        </tr>
    );
}

export default FilaProducto;