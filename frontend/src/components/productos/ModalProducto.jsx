import FormularioProducto from "./FormularioProducto";

function ModalProducto({
    abierto,
    cerrar,
    agregarProducto,
    productoEditar
    }) {

    if (!abierto) {
        return null;
    }

    return (
        <div className="modal-overlay">

        <div className="modal">

            <h2>
            {productoEditar
                ? "Editar Producto"
                : "Nuevo Producto"}
            </h2>

            <FormularioProducto
            key={productoEditar?.id || "nuevo"}
            guardarProducto={agregarProducto}
            cerrar={cerrar}
            productoEditar={productoEditar}
            />

        </div>

        </div>
    );
}

export default ModalProducto;