import { useState } from "react";

import Layout from "../components/Layout";
import TablaProductos from "../components/productos/TablaProductos";
import ModalProducto from "../components/productos/ModalProducto";
import EstadisticasProductos from "../components/productos/EstadisticasProductos";

import "../styles/Productos.css";

    function Productos() {

    const [modalAbierto, setModalAbierto] = useState(false);

    const [productoEditar, setProductoEditar] = useState(null);

    const [productos, setProductos] = useState([
        {
        id: 1,
        codigo: "001",
        nombre: "Resma Carta",
        categoria: "Papelería",
        stock: 50,
        precio: 18000
        },
        {
        id: 2,
        codigo: "002",
        nombre: "Esfero Azul",
        categoria: "Útiles",
        stock: 120,
        precio: 2500
        }
    ]);


    const guardarProducto = (datosProducto) => {

        if (productoEditar) {

        // EDITAR PRODUCTO

        setProductos(
            productos.map((producto) =>
            producto.id === productoEditar.id
                ? {
                    ...producto,
                    ...datosProducto
                }
                : producto
            )
        );

        } else {


        setProductos([
            ...productos,
            {
            id: Date.now(),
            ...datosProducto
            }
        ]);

        }

        setProductoEditar(null);
        setModalAbierto(false);
    };


    const eliminarProducto = (id) => {

        const confirmar = window.confirm(
        "¿Deseas eliminar este producto?"
        );

        if (!confirmar) return;

        setProductos(
        productos.filter(
            (producto) => producto.id !== id
        )
        );
    };



    const editarProducto = (producto) => {

        setProductoEditar(producto);

        setModalAbierto(true);
    };


    return (
        <Layout>

        {/* =========================
            ENCABEZADO
        ========================= */}

        <div className="productos-header">

            <div>

            <h1>Productos</h1>

            <p>
                Administra los productos del inventario.
            </p>

            </div>


            <button
            className="btn-nuevo"
            onClick={() => {

                setProductoEditar(null);

                setModalAbierto(true);

            }}
            >

            <i className="fa-solid fa-plus"></i>

            Nuevo producto

            </button>

        </div>


        {/* =========================
            ESTADÍSTICAS
        ========================= */}

        <EstadisticasProductos
            productos={productos}
        />


        {/* =========================
            BUSCADOR
        ========================= */}

        <div className="productos-busqueda">

            <input
            type="text"
            placeholder="Buscar producto..."
            />

        </div>


        {/* =========================
            TABLA
        ========================= */}

        <TablaProductos
            productos={productos}
            eliminarProducto={eliminarProducto}
            editarProducto={editarProducto}
        />


        {/* =========================
            MODAL
        ========================= */}

        <ModalProducto

            abierto={modalAbierto}

            cerrar={() => {

            setProductoEditar(null);

            setModalAbierto(false);

            }}

            agregarProducto={guardarProducto}

            productoEditar={productoEditar}

        />

        </Layout>
    );
}

export default Productos;