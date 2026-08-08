import { useState } from "react";

import Layout from "../components/Layout";
import TablaProductos from "../components/productos/TablaProductos";
import ModalProducto from "../components/productos/ModalProducto";
import EstadisticasProductos from "../components/productos/EstadisticasProductos";
import BuscadorProductos from "../components/productos/BuscadorProductos";

import "../styles/Productos.css";

    function Productos() {

    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoEditar, setProductoEditar] = useState(null);
    const [busqueda, setBusqueda] = useState("");

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


    // =========================
    // BUSCAR PRODUCTOS
    // =========================

    const normalizarTexto = (texto) => {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };

    const productosFiltrados = productos.filter((producto) => {

    const texto = normalizarTexto(busqueda);

    return (
        normalizarTexto(producto.codigo).includes(texto) ||
        normalizarTexto(producto.nombre).includes(texto) ||
        normalizarTexto(producto.categoria).includes(texto)
    );

    });


    // =========================
    // CREAR / EDITAR PRODUCTO
    // =========================

    const guardarProducto = (datosProducto) => {

        if (productoEditar) {

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


    // =========================
    // ELIMINAR PRODUCTO
    // =========================

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


    // =========================
    // EDITAR PRODUCTO
    // =========================

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

        <BuscadorProductos
            valor={busqueda}
            cambiarValor={setBusqueda}
        />


        {/* =========================
            TABLA
        ========================= */}

        <TablaProductos
            productos={productosFiltrados}
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