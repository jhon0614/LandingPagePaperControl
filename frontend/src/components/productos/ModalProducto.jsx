import { useEffect, useState } from "react";

    function ModalProducto({
    abierto,
    cerrar,
    agregarProducto,
    productoEditar
    }) {

    const [codigo, setCodigo] = useState("");
    const [nombre, setNombre] = useState("");
    const [categoria, setCategoria] = useState("Papelería");
    const [stock, setStock] = useState("");
    const [precio, setPrecio] = useState("");

    useEffect(() => {

        if (productoEditar) {

        setCodigo(productoEditar.codigo);
        setNombre(productoEditar.nombre);
        setCategoria(productoEditar.categoria);
        setStock(productoEditar.stock);
        setPrecio(productoEditar.precio);

        } else {

        setCodigo("");
        setNombre("");
        setCategoria("Papelería");
        setStock("");
        setPrecio("");

        }

    }, [productoEditar, abierto]);

    if (!abierto) return null;

    const guardarProducto = (e) => {

        e.preventDefault();

        if (
        !codigo ||
        !nombre ||
        !categoria ||
        !stock ||
        !precio
        ) {
        alert("Todos los campos son obligatorios.");
        return;
        }

        agregarProducto({
        codigo,
        nombre,
        categoria,
        stock: Number(stock),
        precio: Number(precio)
        });

    };

    const esEdicion = productoEditar !== null;

    return (
        <div className="modal-overlay">

        <div className="modal">

            <h2>
            {esEdicion
                ? "Editar Producto"
                : "Nuevo Producto"}
            </h2>

            <form
            className="modal-form"
            onSubmit={guardarProducto}
            >

            <div className="modal-group">

                <label>Código</label>

                <input
                type="text"
                value={codigo}
                onChange={(e) =>
                    setCodigo(e.target.value)
                }
                />

            </div>

            <div className="modal-group">

                <label>Nombre</label>

                <input
                type="text"
                value={nombre}
                onChange={(e) =>
                    setNombre(e.target.value)
                }
                />

            </div>

            <div className="modal-group">

                <label>Categoría</label>

                <select
                value={categoria}
                onChange={(e) =>
                    setCategoria(e.target.value)
                }
                >

                <option>Papelería</option>
                <option>Útiles</option>
                <option>Oficina</option>

                </select>

            </div>

            <div className="modal-group">

                <label>Stock</label>

                <input
                type="number"
                value={stock}
                onChange={(e) =>
                    setStock(e.target.value)
                }
                />

            </div>

            <div className="modal-group">

                <label>Precio</label>

                <input
                type="number"
                value={precio}
                onChange={(e) =>
                    setPrecio(e.target.value)
                }
                />

            </div>

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
                {esEdicion
                    ? "Actualizar"
                    : "Guardar"}
                </button>

            </div>

            </form>

        </div>

        </div>
    );
}

export default ModalProducto;