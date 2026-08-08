import { useState } from "react";

function FormularioProducto({
    guardarProducto,
    cerrar,
    productoEditar
    }) {

    const [formulario, setFormulario] = useState(() => ({
        codigo: productoEditar?.codigo || "",
        nombre: productoEditar?.nombre || "",
        categoria: productoEditar?.categoria || "Papelería",
        stock: productoEditar?.stock ?? "",
        precio: productoEditar?.precio ?? ""
    }));


    const cambiarCampo = (e) => {

        const { name, value } = e.target;

        setFormulario((actual) => ({
        ...actual,
        [name]: value
        }));

    };


    const enviarFormulario = (e) => {

        e.preventDefault();


        if (
        !formulario.codigo.trim() ||
        !formulario.nombre.trim() ||
        formulario.stock === "" ||
        formulario.precio === ""
        ) {

        alert("Completa todos los campos.");

        return;
        }

        const stock = Number(formulario.stock);
        const precio = Number(formulario.precio);

        if (stock < 0) {

        alert("El stock no puede ser negativo.");

        return;
        }


        if (precio < 0) {

        alert("El precio no puede ser negativo.");

        return;
        }


        guardarProducto({

        codigo: formulario.codigo.trim(),

        nombre: formulario.nombre.trim(),

        categoria: formulario.categoria,

        stock,

        precio

        });

    };


    return (
        <form
        className="modal-form"
        onSubmit={enviarFormulario}
        >

        {/* CÓDIGO */}

        <div className="modal-group">

            <label htmlFor="codigo">
            Código
            </label>

            <input
            id="codigo"
            name="codigo"
            type="text"
            value={formulario.codigo}
            onChange={cambiarCampo}
            placeholder="Ej: 001"
            />

        </div>


        {/* NOMBRE */}

        <div className="modal-group">

            <label htmlFor="nombre">
            Nombre
            </label>

            <input
            id="nombre"
            name="nombre"
            type="text"
            value={formulario.nombre}
            onChange={cambiarCampo}
            placeholder="Nombre del producto"
            />

        </div>


        {/* CATEGORÍA */}

        <div className="modal-group">

            <label htmlFor="categoria">
            Categoría
            </label>

            <select
            id="categoria"
            name="categoria"
            value={formulario.categoria}
            onChange={cambiarCampo}
            >

            <option value="Papelería">
                Papelería
            </option>

            <option value="Útiles">
                Útiles
            </option>

            <option value="Oficina">
                Oficina
            </option>

            </select>

        </div>


        {/* STOCK */}

        <div className="modal-group">

            <label htmlFor="stock">
            Stock
            </label>

            <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            value={formulario.stock}
            onChange={cambiarCampo}
            placeholder="Cantidad"
            />

        </div>


        {/* PRECIO */}

        <div className="modal-group">

            <label htmlFor="precio">
            Precio
            </label>

            <input
            id="precio"
            name="precio"
            type="number"
            min="0"
            step="1"
            value={formulario.precio}
            onChange={cambiarCampo}
            placeholder="Precio en pesos"
            />

        </div>


        {/* BOTONES */}

        <div className="modal-buttons">

            <button
            type="button"
            className="btn-cancelar"
            onClick={cerrar}
            >
            Cancelar
            </button>

            <button
            type="submit"
            className="btn-guardar"
            >
            {productoEditar
                ? "Guardar cambios"
                : "Guardar producto"}
            </button>

        </div>

        </form>
    );
}

export default FormularioProducto;