import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import "../styles/Inventario.css";

import {
    obtenerProductos,
    crearProducto,
    actualizarProducto,
    cambiarEstadoProducto,
    eliminarProducto,
    obtenerMovimientosProducto,
    registrarMovimiento,
} from "../services/productos.service";

import {
    obtenerProveedores,
    obtenerProveedoresDeProducto,
    asociarProveedor,
    quitarProveedor,
} from "../services/proveedores.service";


function Inventario() {

    const [busqueda, setBusqueda] = useState("");

    const [filtroCategoria, setFiltroCategoria] =
        useState("Todas las categorías");

    const [filtroProveedor, setFiltroProveedor] =
        useState("Todos los proveedores");

    const [filtroEstado, setFiltroEstado] =
        useState("Todos los estados");

    const [mostrarDesactivados, setMostrarDesactivados] =
        useState(true);

    const [modalAbierto, setModalAbierto] =
        useState(false);

    const [productoEditar, setProductoEditar] =
        useState(null);

    const [menuAbierto, setMenuAbierto] =
        useState(null);

    const [productos, setProductos] = useState([]);

    const [proveedoresDisponibles, setProveedoresDisponibles] =
        useState([]);

    const [cargando, setCargando] = useState(true);

    const [error, setError] = useState("");

    /*
     * =====================================================
     * MODAL DE HISTORIAL DE MOVIMIENTOS
     * =====================================================
     */

    const [modalHistorial, setModalHistorial] = useState(false);

    const [productoHistorial, setProductoHistorial] = useState(null);

    const [movimientos, setMovimientos] = useState([]);

    const [cargandoMovimientos, setCargandoMovimientos] =
        useState(false);

    const [nuevoMovimiento, setNuevoMovimiento] = useState({
        tipo: "ENTRADA",
        cantidad: "",
        nota: "",
    });


    /*
     * =====================================================
     * PROVEEDORES ASOCIADOS AL PRODUCTO EN EDICIÓN
     * =====================================================
     */

    const [proveedoresProducto, setProveedoresProducto] =
        useState([]);

    const [proveedorSeleccionado, setProveedorSeleccionado] =
        useState("");


    /*
     * =====================================================
     * CARGA INICIAL
     * =====================================================
     */

    async function cargarDatos() {

        try {

            setError("");

            const [listaProductos, listaProveedores] =
                await Promise.all([
                    obtenerProductos(),
                    obtenerProveedores(),
                ]);

            setProductos(listaProductos);

            setProveedoresDisponibles(listaProveedores);

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cargar el inventario."
            );

        } finally {

            setCargando(false);

        }

    }

    useEffect(() => {

        cargarDatos();

    }, []);


    // =========================================================
    // NORMALIZAR TEXTO
    // =========================================================

    const normalizarTexto = (texto = "") => {
        return String(texto)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    };

    // =========================================================
    // LISTAS PARA LOS FILTROS
    // =========================================================

    const categorias = useMemo(() => {
        return [
            ...new Set(
                productos.map(
                    (producto) => producto.categoria
                )
            ),
        ];
    }, [productos]);

    const nombresProveedores = useMemo(() => {
        return [
            ...new Set(
                proveedoresDisponibles.map(
                    (proveedor) => proveedor.nombre
                )
            ),
        ];
    }, [proveedoresDisponibles]);

    // =========================================================
    // FILTRAR PRODUCTOS
    // =========================================================

    const productosFiltrados = useMemo(() => {
        const texto = normalizarTexto(busqueda);

        return productos.filter((producto) => {

            const nombresProveedoresProducto =
                (producto.proveedores || [])
                    .map((p) => p.nombre)
                    .join(" ");

            const coincideBusqueda =
                !texto ||
                normalizarTexto(producto.nombre).includes(texto) ||
                normalizarTexto(producto.marca || "").includes(texto) ||
                normalizarTexto(producto.codigo || "").includes(texto) ||
                normalizarTexto(producto.categoria || "").includes(texto) ||
                normalizarTexto(nombresProveedoresProducto).includes(texto);

            const coincideCategoria =
                filtroCategoria === "Todas las categorías" ||
                producto.categoria === filtroCategoria;

            const coincideProveedor =
                filtroProveedor === "Todos los proveedores" ||
                (producto.proveedores || []).some(
                    (p) => p.nombre === filtroProveedor
                );

            let coincideEstado = true;

            if (filtroEstado === "Activos") {
                coincideEstado = producto.estaActivo;
            }

            if (filtroEstado === "Desactivados") {
                coincideEstado = !producto.estaActivo;
            }

            if (filtroEstado === "Agotados") {
                coincideEstado =
                    producto.estaActivo &&
                    Number(producto.stock) === 0;
            }

            if (filtroEstado === "Stock bajo") {
                coincideEstado =
                    producto.estaActivo &&
                    Number(producto.stock) > 0 &&
                    Number(producto.stock) <=
                        Number(producto.stockMinimo);
            }

            return (
                coincideBusqueda &&
                coincideCategoria &&
                coincideProveedor &&
                coincideEstado
            );
        });
    }, [
        productos,
        busqueda,
        filtroCategoria,
        filtroProveedor,
        filtroEstado,
    ]);

    const productosActivos = productosFiltrados.filter(
        (p) => p.estaActivo && Number(p.stock) > 0
    );

    const productosAgotados = productosFiltrados.filter(
        (p) => p.estaActivo && Number(p.stock) === 0
    );

    const productosDesactivados = productosFiltrados.filter(
        (p) => !p.estaActivo
    );

    // =========================================================
    // ESTADÍSTICAS
    // =========================================================

    const productosActivosTotal = productos.filter(
        (p) => p.estaActivo
    );

    const unidadesTotal = productos
        .filter((p) => p.estaActivo)
        .reduce((total, p) => total + Number(p.stock || 0), 0);

    const stockBajoTotal = productos.filter(
        (p) =>
            p.estaActivo &&
            Number(p.stock) > 0 &&
            Number(p.stock) <= Number(p.stockMinimo)
    ).length;

    const agotadosTotal = productos.filter(
        (p) => p.estaActivo && Number(p.stock) === 0
    ).length;

    const valorMayoristaTotal = productos
        .filter((p) => p.estaActivo)
        .reduce(
            (total, p) =>
                total + Number(p.stock || 0) * Number(p.precioMayor || 0),
            0
        );

    const valorDetalTotal = productos
        .filter((p) => p.estaActivo)
        .reduce(
            (total, p) =>
                total + Number(p.stock || 0) * Number(p.precioDetal || 0),
            0
        );

    const formatoPrecio = (valor) => {
        return `$ ${Number(valor || 0).toLocaleString("es-CO")}`;
    };

    const formatoFecha = (fecha) => {

        if (!fecha) return "—";

        return new Date(fecha).toLocaleString("es-CO");

    };

    // =========================================================
    // MODAL PRODUCTO — ABRIR / CERRAR
    // =========================================================

    const abrirNuevoProducto = () => {

        setProductoEditar(null);

        setProveedoresProducto([]);

        setProveedorSeleccionado("");

        setModalAbierto(true);

    };

    const abrirEditarProducto = async (producto) => {

        setProductoEditar(producto);

        setModalAbierto(true);

        setMenuAbierto(null);

        try {

            const listaProveedores =
                await obtenerProveedoresDeProducto(producto.id);

            setProveedoresProducto(listaProveedores);

        } catch (error) {

            setProveedoresProducto(producto.proveedores || []);

        }

    };

    // =========================================================
    // ASOCIAR / QUITAR PROVEEDOR EN EL MODAL
    // =========================================================

    async function manejarAsociarProveedor() {

        if (!proveedorSeleccionado || !productoEditar) return;

        try {

            await asociarProveedor(
                productoEditar.id,
                proveedorSeleccionado
            );

            const proveedor = proveedoresDisponibles.find(
                (p) => String(p.id) === String(proveedorSeleccionado)
            );

            if (proveedor) {

                setProveedoresProducto((actuales) => [
                    ...actuales,
                    proveedor,
                ]);

            }

            setProveedorSeleccionado("");

        } catch (error) {

            setError(
                error.message ||
                "No fue posible asociar el proveedor."
            );

        }

    }

    async function manejarQuitarProveedor(idProveedor) {

        if (!productoEditar) return;

        try {

            await quitarProveedor(productoEditar.id, idProveedor);

            setProveedoresProducto((actuales) =>
                actuales.filter((p) => p.id !== idProveedor)
            );

        } catch (error) {

            setError(
                error.message ||
                "No fue posible quitar el proveedor."
            );

        }

    }

    // =========================================================
    // GUARDAR PRODUCTO
    // =========================================================

    const guardarProducto = async (evento) => {

        evento.preventDefault();

        const formulario = new FormData(evento.currentTarget);

        const datos = {
            nombre: formulario.get("nombre").trim(),
            marca: formulario.get("marca").trim(),
            codigo: formulario.get("codigo").trim(),
            categoria: formulario.get("categoria").trim(),
            precioMayor: Number(formulario.get("precioMayor")),
            precioDetal: Number(formulario.get("precioDetal")),
            stock: Number(formulario.get("stock")),
            stockMinimo: Number(formulario.get("stockMinimo")),
        };

        try {

            if (productoEditar) {

                await actualizarProducto(productoEditar.id, datos);

            } else {

                await crearProducto(datos);

            }

            setModalAbierto(false);

            setProductoEditar(null);

            await cargarDatos();

        } catch (error) {

            setError(
                error.message ||
                "No fue posible guardar el producto."
            );

        }

    };

    // =========================================================
    // ACTIVAR / DESACTIVAR
    // =========================================================

    const manejarCambiarEstado = async (producto) => {

        try {

            await cambiarEstadoProducto(
                producto.id,
                !producto.estaActivo
            );

            await cargarDatos();

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cambiar el estado del producto."
            );

        }

        setMenuAbierto(null);

    };

    // =========================================================
    // ELIMINAR (PROTEGIDO)
    // =========================================================

    const manejarEliminarProducto = async (producto) => {

        const confirmar = window.confirm(
            `¿Deseas eliminar "${producto.nombre}"? Si tiene ventas registradas, en su lugar se desactivará.`
        );

        if (!confirmar) return;

        try {

            await eliminarProducto(producto.id);

            await cargarDatos();

        } catch (error) {

            // El backend responde con un mensaje claro cuando el
            // producto tiene ventas asociadas y no puede borrarse.
            setError(
                error.message ||
                "No fue posible eliminar el producto."
            );

        }

        setMenuAbierto(null);

    };

    // =========================================================
    // HISTORIAL DE MOVIMIENTOS
    // =========================================================

    async function abrirHistorial(producto) {

        setProductoHistorial(producto);

        setModalHistorial(true);

        setMenuAbierto(null);

        setCargandoMovimientos(true);

        try {

            const lista = await obtenerMovimientosProducto(
                producto.id
            );

            setMovimientos(lista);

        } catch (error) {

            setMovimientos([]);

        } finally {

            setCargandoMovimientos(false);

        }

    }

    async function manejarRegistrarMovimiento(evento) {

        evento.preventDefault();

        if (
            !nuevoMovimiento.cantidad ||
            Number(nuevoMovimiento.cantidad) <= 0
        ) {

            setError("Ingresa una cantidad válida.");

            return;

        }

        try {

            await registrarMovimiento(
                productoHistorial.id,
                nuevoMovimiento
            );

            setNuevoMovimiento({
                tipo: "ENTRADA",
                cantidad: "",
                nota: "",
            });

            const lista = await obtenerMovimientosProducto(
                productoHistorial.id
            );

            setMovimientos(lista);

            await cargarDatos();

        } catch (error) {

            setError(
                error.message ||
                "No fue posible registrar el movimiento."
            );

        }

    }

    // =========================================================
    // LIMPIAR FILTROS
    // =========================================================

    const limpiarFiltros = () => {
        setBusqueda("");
        setFiltroCategoria("Todas las categorías");
        setFiltroProveedor("Todos los proveedores");
        setFiltroEstado("Todos los estados");
    };

    // =========================================================
    // COMPONENTE DROPDOWN
    // =========================================================

    const Dropdown = ({ id, valor, opciones, cambiar }) => {

        const abierto = menuAbierto === id;

        return (
            <div
                className="inventario-dropdown"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className={`inventario-dropdown-btn ${
                        abierto ? "abierto" : ""
                    }`}
                    onClick={() =>
                        setMenuAbierto(abierto ? null : id)
                    }
                >
                    <span>{valor}</span>
                    <i
                        className={`fa-solid fa-chevron-down ${
                            abierto ? "rotado" : ""
                        }`}
                    ></i>
                </button>

                {abierto && (
                    <div className="inventario-dropdown-menu">
                        {opciones.map((opcion) => (
                            <button
                                type="button"
                                key={opcion}
                                className={
                                    opcion === valor ? "seleccionado" : ""
                                }
                                onClick={() => {
                                    cambiar(opcion);
                                    setMenuAbierto(null);
                                }}
                            >
                                <span>{opcion}</span>
                                {opcion === valor && (
                                    <i className="fa-solid fa-check"></i>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );

    };

    // =========================================================
    // TABLA DE PRODUCTOS
    // =========================================================

    const TablaProductos = ({ lista, tipo }) => {

        return (
            <div className="inventario-tabla-wrapper">
                <table className="inventario-tabla">
                    <thead>
                        <tr>
                            <th>PRODUCTO</th>
                            <th>CÓDIGO</th>
                            <th>CATEGORÍA</th>
                            <th>PROVEEDORES</th>
                            <th>MAYOR</th>
                            <th>DETAL</th>
                            <th>STOCK</th>
                            <th>ÚLTIMA MOD.</th>
                            <th>ESTADO</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>

                    <tbody>
                        {lista.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="inventario-vacio">
                                    <div>
                                        <i className="fa-solid fa-box-open"></i>
                                        <strong>
                                            No hay productos para mostrar
                                        </strong>
                                        <span>
                                            Intenta cambiar los filtros de
                                            búsqueda.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            lista.map((producto) => {

                                const stock = Number(producto.stock);

                                const stockMinimo = Number(
                                    producto.stockMinimo
                                );

                                const agotado = stock === 0;

                                const stockBajo =
                                    stock > 0 && stock <= stockMinimo;

                                return (
                                    <tr key={producto.id}>

                                        <td>
                                            <div className="producto-info">
                                                <div
                                                    className={`producto-icono ${
                                                        tipo ===
                                                        "desactivados"
                                                            ? "inactivo"
                                                            : ""
                                                    }`}
                                                >
                                                    <i className="fa-solid fa-box"></i>
                                                </div>
                                                <div>
                                                    <strong>
                                                        {producto.nombre}
                                                    </strong>
                                                    <span>
                                                        {producto.marca}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="codigo-producto">
                                                {producto.codigo}
                                            </span>
                                        </td>

                                        <td>{producto.categoria}</td>

                                        <td>
                                            <div className="proveedores-celda">
                                                {(producto.proveedores || [])
                                                    .length === 0 ? (
                                                    <span className="sin-proveedor">
                                                        Sin proveedor
                                                    </span>
                                                ) : (
                                                    producto.proveedores.map(
                                                        (p) => (
                                                            <span
                                                                className="proveedor-chip"
                                                                key={p.id}
                                                            >
                                                                {p.nombre}
                                                            </span>
                                                        )
                                                    )
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            {formatoPrecio(
                                                producto.precioMayor
                                            )}
                                        </td>

                                        <td>
                                            <strong>
                                                {formatoPrecio(
                                                    producto.precioDetal
                                                )}
                                            </strong>
                                        </td>

                                        <td>
                                            <div
                                                className={`stock-wrapper ${
                                                    agotado
                                                        ? "agotado"
                                                        : stockBajo
                                                        ? "bajo"
                                                        : ""
                                                }`}
                                            >
                                                <strong>{stock}</strong>
                                                <small>
                                                    Mín. {stockMinimo}
                                                </small>
                                            </div>
                                        </td>

                                        <td>
                                            <small className="fecha-modificacion">
                                                {formatoFecha(
                                                    producto.actualizadoEn
                                                )}
                                            </small>
                                        </td>

                                        <td>
                                            {tipo === "desactivados" ? (
                                                <span className="estado-badge inactivo">
                                                    <span></span>
                                                    Inactivo
                                                </span>
                                            ) : agotado ? (
                                                <span className="estado-badge agotado">
                                                    <span></span>
                                                    Agotado
                                                </span>
                                            ) : stockBajo ? (
                                                <span className="estado-badge stock-bajo">
                                                    <span></span>
                                                    Stock bajo
                                                </span>
                                            ) : (
                                                <span className="estado-badge disponible">
                                                    <span></span>
                                                    Disponible
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <div className="acciones-producto">

                                                <button
                                                    type="button"
                                                    className="accion historial"
                                                    title="Ver historial de movimientos"
                                                    onClick={() =>
                                                        abrirHistorial(
                                                            producto
                                                        )
                                                    }
                                                >
                                                    <i className="fa-solid fa-clock-rotate-left"></i>
                                                </button>

                                                {tipo === "desactivados" ? (
                                                    <button
                                                        type="button"
                                                        className="accion activar"
                                                        title="Activar producto"
                                                        onClick={() =>
                                                            manejarCambiarEstado(
                                                                producto
                                                            )
                                                        }
                                                    >
                                                        <i className="fa-solid fa-check"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="accion desactivar"
                                                        title="Desactivar producto"
                                                        onClick={() =>
                                                            manejarCambiarEstado(
                                                                producto
                                                            )
                                                        }
                                                    >
                                                        <i className="fa-solid fa-ban"></i>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="accion editar"
                                                    title="Editar producto"
                                                    onClick={() =>
                                                        abrirEditarProducto(
                                                            producto
                                                        )
                                                    }
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="accion eliminar"
                                                    title="Eliminar producto"
                                                    onClick={() =>
                                                        manejarEliminarProducto(
                                                            producto
                                                        )
                                                    }
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        );

    };

    // =========================================================
    // RENDER — CARGANDO
    // =========================================================

    if (cargando) {

        return (
            <Layout>
                <div className="caja-cargando">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <p>Cargando inventario...</p>
                </div>
            </Layout>
        );

    }

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <Layout>
            <div
                className="inventario-page"
                onClick={() => setMenuAbierto(null)}
            >
                {/* ENCABEZADO */}

                <div className="inventario-header">
                    <div>
                        <h1>Inventario</h1>
                        <p>
                            Gestiona productos, marcas, proveedores,
                            precios y existencias.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-nuevo-producto"
                        onClick={abrirNuevoProducto}
                    >
                        <i className="fa-solid fa-plus"></i>
                        Nuevo producto
                    </button>
                </div>

                {error && (
                    <div className="caja-error">{error}</div>
                )}

                {/* ESTADÍSTICAS */}

                <div className="inventario-estadisticas">
                    <div className="estadistica-card">
                        <div className="estadistica-icono azul">
                            <i className="fa-solid fa-boxes-stacked"></i>
                        </div>
                        <div>
                            <span>Productos</span>
                            <strong>{productosActivosTotal.length}</strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono azul">
                            <i className="fa-solid fa-cubes"></i>
                        </div>
                        <div>
                            <span>Unidades</span>
                            <strong>
                                {unidadesTotal.toLocaleString("es-CO")}
                            </strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono verde">
                            <i className="fa-solid fa-money-bill-trend-up"></i>
                        </div>
                        <div>
                            <span>Valor mayorista</span>
                            <strong>
                                {formatoPrecio(valorMayoristaTotal)}
                            </strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono morado">
                            <i className="fa-solid fa-cart-shopping"></i>
                        </div>
                        <div>
                            <span>Valor al detal</span>
                            <strong>
                                {formatoPrecio(valorDetalTotal)}
                            </strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono naranja">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div>
                            <span>Stock bajo</span>
                            <strong>{stockBajoTotal}</strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono rojo">
                            <i className="fa-solid fa-circle-xmark"></i>
                        </div>
                        <div>
                            <span>Agotados</span>
                            <strong>{agotadosTotal}</strong>
                        </div>
                    </div>
                </div>

                {/* FILTROS */}

                <div className="inventario-filtros">
                    <div className="inventario-buscador">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) =>
                                setBusqueda(e.target.value)
                            }
                            placeholder="Buscar producto, código, marca o proveedor..."
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda("")}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        )}
                    </div>

                    <Dropdown
                        id="categorias"
                        valor={filtroCategoria}
                        cambiar={setFiltroCategoria}
                        opciones={[
                            "Todas las categorías",
                            ...categorias,
                        ]}
                    />

                    <Dropdown
                        id="proveedores"
                        valor={filtroProveedor}
                        cambiar={setFiltroProveedor}
                        opciones={[
                            "Todos los proveedores",
                            ...nombresProveedores,
                        ]}
                    />

                    <Dropdown
                        id="estados"
                        valor={filtroEstado}
                        cambiar={setFiltroEstado}
                        opciones={[
                            "Todos los estados",
                            "Activos",
                            "Desactivados",
                            "Agotados",
                            "Stock bajo",
                        ]}
                    />

                    <button
                        type="button"
                        className="btn-desactivados"
                        onClick={() =>
                            setMostrarDesactivados(!mostrarDesactivados)
                        }
                    >
                        <i
                            className={`fa-solid ${
                                mostrarDesactivados
                                    ? "fa-eye-slash"
                                    : "fa-eye"
                            }`}
                        ></i>
                        {mostrarDesactivados
                            ? "Ocultar desactivados"
                            : "Ver desactivados"}
                    </button>
                </div>

                {(busqueda ||
                    filtroCategoria !== "Todas las categorías" ||
                    filtroProveedor !== "Todos los proveedores" ||
                    filtroEstado !== "Todos los estados") && (
                    <div className="filtros-activos">
                        <span>Mostrando resultados filtrados</span>
                        <button type="button" onClick={limpiarFiltros}>
                            Limpiar filtros
                        </button>
                    </div>
                )}

                {/* TABLA ACTIVOS */}

                <section className="inventario-seccion">
                    <div className="seccion-header">
                        <div>
                            <h2>
                                <span className="titulo-verde">
                                    <i className="fa-solid fa-circle"></i>
                                    Productos activos
                                </span>
                            </h2>
                            <p>
                                Productos disponibles para las
                                operaciones del sistema.
                            </p>
                        </div>
                        <span className="contador verde">
                            {productosActivos.length}
                        </span>
                    </div>

                    <TablaProductos lista={productosActivos} tipo="activos" />
                </section>

                {/* TABLA AGOTADOS */}

                <section className="inventario-seccion agotados-seccion">
                    <div className="seccion-header">
                        <div>
                            <h2>
                                <span className="titulo-rojo">
                                    <i className="fa-solid fa-circle"></i>
                                    Productos agotados
                                </span>
                            </h2>
                            <p>
                                Productos activos que actualmente no
                                tienen existencias.
                            </p>
                        </div>
                        <span className="contador rojo">
                            {productosAgotados.length}
                        </span>
                    </div>

                    <TablaProductos
                        lista={productosAgotados}
                        tipo="agotados"
                    />
                </section>

                {/* TABLA DESACTIVADOS */}

                {mostrarDesactivados && (
                    <section className="inventario-seccion">
                        <div className="seccion-header">
                            <div>
                                <h2>
                                    <span className="titulo-gris">
                                        <i className="fa-solid fa-circle"></i>
                                        Productos desactivados
                                    </span>
                                </h2>
                                <p>
                                    Productos que no están disponibles
                                    actualmente.
                                </p>
                            </div>
                            <span className="contador gris">
                                {productosDesactivados.length}
                            </span>
                        </div>

                        <TablaProductos
                            lista={productosDesactivados}
                            tipo="desactivados"
                        />
                    </section>
                )}

                {/* =====================================================
                    MODAL PRODUCTO
                ===================================================== */}

                {modalAbierto && (
                    <div
                        className="modal-overlay"
                        onClick={() => setModalAbierto(false)}
                    >
                        <div
                            className="modal-producto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <div>
                                    <h2>
                                        {productoEditar
                                            ? "Editar producto"
                                            : "Nuevo producto"}
                                    </h2>
                                    <p>
                                        Completa la información del
                                        producto.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalAbierto(false)}
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <form onSubmit={guardarProducto}>
                                <div className="form-grid">
                                    <div className="campo">
                                        <label>Producto</label>
                                        <input
                                            name="nombre"
                                            defaultValue={
                                                productoEditar?.nombre || ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Marca</label>
                                        <input
                                            name="marca"
                                            defaultValue={
                                                productoEditar?.marca || ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Código</label>
                                        <input
                                            name="codigo"
                                            defaultValue={
                                                productoEditar?.codigo || ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Categoría</label>
                                        <input
                                            name="categoria"
                                            defaultValue={
                                                productoEditar?.categoria ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Precio proveedor</label>
                                        <input
                                            name="precioMayor"
                                            type="number"
                                            min="0"
                                            defaultValue={
                                                productoEditar?.precioMayor ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Precio al detal</label>
                                        <input
                                            name="precioDetal"
                                            type="number"
                                            min="0"
                                            defaultValue={
                                                productoEditar?.precioDetal ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Stock</label>
                                        <input
                                            name="stock"
                                            type="number"
                                            min="0"
                                            defaultValue={
                                                productoEditar?.stock ?? 0
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Stock mínimo</label>
                                        <input
                                            name="stockMinimo"
                                            type="number"
                                            min="0"
                                            defaultValue={
                                                productoEditar?.stockMinimo ??
                                                0
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                {/* PROVEEDORES ASOCIADOS — solo al editar
                                    (para crear, primero se guarda el
                                    producto y luego se asocian) */}

                                {productoEditar && (

                                    <div className="campo campo-completo proveedores-asociados">

                                        <label>
                                            Proveedores asociados
                                        </label>

                                        <div className="proveedores-asociados-lista">

                                            {proveedoresProducto.length === 0 ? (

                                                <span className="sin-proveedor">
                                                    Este producto no tiene
                                                    proveedores asociados.
                                                </span>

                                            ) : (

                                                proveedoresProducto.map(
                                                    (proveedor) => (

                                                        <span
                                                            className="proveedor-chip removible"
                                                            key={proveedor.id}
                                                        >
                                                            {proveedor.nombre}

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    manejarQuitarProveedor(
                                                                        proveedor.id
                                                                    )
                                                                }
                                                            >
                                                                <i className="fa-solid fa-xmark"></i>
                                                            </button>
                                                        </span>

                                                    )
                                                )

                                            )}

                                        </div>

                                        <div className="proveedores-agregar">

                                            <select
                                                value={proveedorSeleccionado}
                                                onChange={(e) =>
                                                    setProveedorSeleccionado(
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Selecciona un proveedor...
                                                </option>

                                                {proveedoresDisponibles
                                                    .filter(
                                                        (p) =>
                                                            !proveedoresProducto.some(
                                                                (pp) =>
                                                                    pp.id === p.id
                                                            )
                                                    )
                                                    .map((proveedor) => (
                                                        <option
                                                            key={proveedor.id}
                                                            value={proveedor.id}
                                                        >
                                                            {proveedor.nombre}
                                                        </option>
                                                    ))}
                                            </select>

                                            <button
                                                type="button"
                                                className="btn-agregar-proveedor"
                                                onClick={manejarAsociarProveedor}
                                                disabled={!proveedorSeleccionado}
                                            >
                                                <i className="fa-solid fa-plus"></i>
                                            </button>

                                        </div>

                                    </div>

                                )}

                                <div className="modal-acciones">
                                    <button
                                        type="button"
                                        className="btn-cancelar"
                                        onClick={() =>
                                            setModalAbierto(false)
                                        }
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn-guardar"
                                    >
                                        <i className="fa-solid fa-check"></i>
                                        {productoEditar
                                            ? "Guardar cambios"
                                            : "Crear producto"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* =====================================================
                    MODAL HISTORIAL DE MOVIMIENTOS
                ===================================================== */}

                {modalHistorial && (

                    <div
                        className="modal-overlay"
                        onClick={() => setModalHistorial(false)}
                    >

                        <div
                            className="modal-producto"
                            onClick={(e) => e.stopPropagation()}
                        >

                            <div className="modal-header">
                                <div>
                                    <h2>
                                        Historial —{" "}
                                        {productoHistorial?.nombre}
                                    </h2>
                                    <p>
                                        Entradas, ajustes y última
                                        modificación del producto.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalHistorial(false)}
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <form
                                className="movimiento-form"
                                onSubmit={manejarRegistrarMovimiento}
                            >

                                <select
                                    value={nuevoMovimiento.tipo}
                                    onChange={(e) =>
                                        setNuevoMovimiento((actual) => ({
                                            ...actual,
                                            tipo: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="ENTRADA">Entrada</option>
                                    <option value="AJUSTE">Ajuste</option>
                                </select>

                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Cantidad"
                                    value={nuevoMovimiento.cantidad}
                                    onChange={(e) =>
                                        setNuevoMovimiento((actual) => ({
                                            ...actual,
                                            cantidad: e.target.value,
                                        }))
                                    }
                                />

                                <input
                                    type="text"
                                    placeholder="Nota (opcional)"
                                    value={nuevoMovimiento.nota}
                                    onChange={(e) =>
                                        setNuevoMovimiento((actual) => ({
                                            ...actual,
                                            nota: e.target.value,
                                        }))
                                    }
                                />

                                <button type="submit">
                                    <i className="fa-solid fa-plus"></i>
                                    Registrar
                                </button>

                            </form>

                            <div className="movimientos-tabla-wrapper">

                                {cargandoMovimientos ? (

                                    <p className="alerta-stock-cargando">
                                        Cargando movimientos...
                                    </p>

                                ) : movimientos.length === 0 ? (

                                    <p className="alerta-stock-vacio">
                                        Este producto no tiene movimientos
                                        registrados.
                                    </p>

                                ) : (

                                    <table className="inventario-tabla">
                                        <thead>
                                            <tr>
                                                <th>Tipo</th>
                                                <th>Cantidad</th>
                                                <th>Usuario</th>
                                                <th>Fecha</th>
                                                <th>Nota</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movimientos.map((mov) => (
                                                <tr key={mov.id}>
                                                    <td>{mov.tipo}</td>
                                                    <td>{mov.cantidad}</td>
                                                    <td>
                                                        {mov.usuarioNombre}
                                                    </td>
                                                    <td>
                                                        {formatoFecha(
                                                            mov.creadoEn
                                                        )}
                                                    </td>
                                                    <td>{mov.nota || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                )}

                            </div>

                        </div>

                    </div>

                )}

            </div>
        </Layout>
    );
}

export default Inventario;