import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import "../styles/Inventario.css";

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

    const [productos, setProductos] = useState([
        {
            id: 1,
            nombre: "Lapicero",
            marca: "Paper Mate",
            codigo: "LAP-PM-001",
            categoria: "Escritura",
            proveedor: "Distribuidora ABC",
            precioMayor: 900,
            precioDetal: 1500,
            stock: 40,
            stockMinimo: 10,
            estaActivo: true,
        },
        {
            id: 2,
            nombre: "Lapicero",
            marca: "Ofiesco",
            codigo: "LAP-OF-001",
            categoria: "Escritura",
            proveedor: "Papelería XYZ",
            precioMayor: 700,
            precioDetal: 1000,
            stock: 8,
            stockMinimo: 10,
            estaActivo: true,
        },
        {
            id: 3,
            nombre: "Lapicero",
            marca: "Kilométrico",
            codigo: "LAP-KM-001",
            categoria: "Escritura",
            proveedor: "Distribuidora ABC",
            precioMayor: 800,
            precioDetal: 1200,
            stock: 25,
            stockMinimo: 10,
            estaActivo: true,
        },
        {
            id: 4,
            nombre: "Lapicero",
            marca: "BIC",
            codigo: "LAP-BIC-001",
            categoria: "Escritura",
            proveedor: "Mayorista Nacional",
            precioMayor: 950,
            precioDetal: 1500,
            stock: 0,
            stockMinimo: 10,
            estaActivo: true,
        },
        {
            id: 5,
            nombre: "Cuaderno",
            marca: "Norma",
            codigo: "CUA-NOR-001",
            categoria: "Papelería",
            proveedor: "Distribuciones Escolar",
            precioMayor: 4500,
            precioDetal: 6500,
            stock: 32,
            stockMinimo: 8,
            estaActivo: true,
        },
        {
            id: 6,
            nombre: "Borrador",
            marca: "Maped",
            codigo: "BOR-MAP-001",
            categoria: "Escritura",
            proveedor: "Papelería XYZ",
            precioMayor: 600,
            precioDetal: 1000,
            stock: 18,
            stockMinimo: 5,
            estaActivo: false,
        },
        {
            id: 7,
            nombre: "Pegante",
            marca: "Pegaucho",
            codigo: "COL-PEG-001",
            categoria: "Manualidades",
            proveedor: "Mayorista Nacional",
            precioMayor: 2200,
            precioDetal: 3500,
            stock: 0,
            stockMinimo: 5,
            estaActivo: false,
        },
    ]);

    // =========================================================
    // NORMALIZAR TEXTO
    // =========================================================

    const normalizarTexto = (texto = "") => {
        return texto
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

    const proveedores = useMemo(() => {
        return [
            ...new Set(
                productos.map(
                    (producto) => producto.proveedor
                )
            ),
        ];
    }, [productos]);

    // =========================================================
    // FILTRAR PRODUCTOS
    // =========================================================

    const productosFiltrados = useMemo(() => {
        const texto = normalizarTexto(busqueda);

        return productos.filter((producto) => {
            const coincideBusqueda =
                !texto ||
                normalizarTexto(producto.nombre).includes(
                    texto
                ) ||
                normalizarTexto(producto.marca).includes(
                    texto
                ) ||
                normalizarTexto(producto.codigo).includes(
                    texto
                ) ||
                normalizarTexto(
                    producto.categoria
                ).includes(texto) ||
                normalizarTexto(
                    producto.proveedor
                ).includes(texto);

            const coincideCategoria =
                filtroCategoria ===
                    "Todas las categorías" ||
                producto.categoria === filtroCategoria;

            const coincideProveedor =
                filtroProveedor ===
                    "Todos los proveedores" ||
                producto.proveedor === filtroProveedor;

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

    // =========================================================
    // SEPARAR TABLAS
    // =========================================================

    const productosActivos =
        productosFiltrados.filter(
            (producto) =>
                producto.estaActivo &&
                Number(producto.stock) > 0
        );

    const productosAgotados =
        productosFiltrados.filter(
            (producto) =>
                producto.estaActivo &&
                Number(producto.stock) === 0
        );

    const productosDesactivados =
        productosFiltrados.filter(
            (producto) => !producto.estaActivo
        );

    // =========================================================
    // ESTADÍSTICAS
    // =========================================================

    const productosActivosTotal =
        productos.filter(
            (producto) => producto.estaActivo
        );

    const unidadesTotal = productos
        .filter((producto) => producto.estaActivo)
        .reduce(
            (total, producto) =>
                total + Number(producto.stock || 0),
            0
        );

    const stockBajoTotal = productos.filter(
        (producto) =>
            producto.estaActivo &&
            Number(producto.stock) > 0 &&
            Number(producto.stock) <=
                Number(producto.stockMinimo)
    ).length;

    const agotadosTotal = productos.filter(
        (producto) =>
            producto.estaActivo &&
            Number(producto.stock) === 0
    ).length;

    // =========================================================
    // VALOR TOTAL MAYORISTA
    // =========================================================

    const valorMayoristaTotal = productos
        .filter((producto) => producto.estaActivo)
        .reduce(
            (total, producto) =>
                total +
                Number(producto.stock || 0) *
                    Number(producto.precioMayor || 0),
            0
        );

    // =========================================================
    // VALOR TOTAL AL DETAL
    // =========================================================

    const valorDetalTotal = productos
        .filter((producto) => producto.estaActivo)
        .reduce(
            (total, producto) =>
                total +
                Number(producto.stock || 0) *
                    Number(producto.precioDetal || 0),
            0
        );

    // =========================================================
    // FORMATEAR DINERO
    // =========================================================

    const formatoPrecio = (valor) => {
        return `$ ${Number(valor || 0).toLocaleString(
            "es-CO"
        )}`;
    };

    // =========================================================
    // ABRIR MODAL NUEVO
    // =========================================================

    const abrirNuevoProducto = () => {
        setProductoEditar(null);
        setModalAbierto(true);
    };

    // =========================================================
    // ABRIR MODAL EDITAR
    // =========================================================

    const abrirEditarProducto = (producto) => {
        setProductoEditar(producto);
        setModalAbierto(true);
        setMenuAbierto(null);
    };

    // =========================================================
    // GUARDAR PRODUCTO
    // =========================================================

    const guardarProducto = (evento) => {
        evento.preventDefault();

        const formulario =
            new FormData(evento.currentTarget);

        const datos = {
            nombre: formulario
                .get("nombre")
                .trim(),

            marca: formulario
                .get("marca")
                .trim(),

            codigo: formulario
                .get("codigo")
                .trim(),

            categoria: formulario
                .get("categoria")
                .trim(),

            proveedor: formulario
                .get("proveedor")
                .trim(),

            precioMayor: Number(
                formulario.get("precioMayor")
            ),

            precioDetal: Number(
                formulario.get("precioDetal")
            ),

            stock: Number(
                formulario.get("stock")
            ),

            stockMinimo: Number(
                formulario.get("stockMinimo")
            ),
        };

        if (productoEditar) {
            setProductos(
                (productosActuales) =>
                    productosActuales.map(
                        (producto) =>
                            producto.id ===
                            productoEditar.id
                                ? {
                                      ...producto,
                                      ...datos,
                                  }
                                : producto
                    )
            );
        } else {
            setProductos(
                (productosActuales) => [
                    ...productosActuales,
                    {
                        id: Date.now(),
                        ...datos,
                        estaActivo: true,
                    },
                ]
            );
        }

        setModalAbierto(false);
        setProductoEditar(null);
    };

    // =========================================================
    // ACTIVAR / DESACTIVAR
    // =========================================================

    const cambiarEstadoProducto = (id) => {
        setProductos(
            (productosActuales) =>
                productosActuales.map(
                    (producto) =>
                        producto.id === id
                            ? {
                                  ...producto,
                                  estaActivo:
                                      !producto.estaActivo,
                              }
                            : producto
                )
        );

        setMenuAbierto(null);
    };

    // =========================================================
    // ELIMINAR
    // =========================================================

    const eliminarProducto = (id) => {
        const confirmar = window.confirm(
            "¿Deseas eliminar este producto definitivamente?"
        );

        if (!confirmar) return;

        setProductos(
            (productosActuales) =>
                productosActuales.filter(
                    (producto) =>
                        producto.id !== id
                )
        );

        setMenuAbierto(null);
    };

    // =========================================================
    // LIMPIAR FILTROS
    // =========================================================

    const limpiarFiltros = () => {
        setBusqueda("");
        setFiltroCategoria(
            "Todas las categorías"
        );
        setFiltroProveedor(
            "Todos los proveedores"
        );
        setFiltroEstado(
            "Todos los estados"
        );
    };

    // =========================================================
    // COMPONENTE DROPDOWN
    // =========================================================

    const Dropdown = ({
        id,
        valor,
        opciones,
        cambiar,
    }) => {
        const abierto = menuAbierto === id;

        return (
            <div
                className="inventario-dropdown"
                onClick={(evento) =>
                    evento.stopPropagation()
                }
            >
                <button
                    type="button"
                    className={`inventario-dropdown-btn ${
                        abierto ? "abierto" : ""
                    }`}
                    onClick={() =>
                        setMenuAbierto(
                            abierto ? null : id
                        )
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
                                    opcion === valor
                                        ? "seleccionado"
                                        : ""
                                }
                                onClick={() => {
                                    cambiar(opcion);
                                    setMenuAbierto(
                                        null
                                    );
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

    const TablaProductos = ({
        lista,
        tipo,
    }) => {
        return (
            <div className="inventario-tabla-wrapper">
                <table className="inventario-tabla">
                    <thead>
                        <tr>
                            <th>PRODUCTO</th>
                            <th>CÓDIGO</th>
                            <th>CATEGORÍA</th>
                            <th>PROVEEDOR</th>
                            <th>MAYOR</th>
                            <th>DETAL</th>
                            <th>STOCK</th>
                            <th>ESTADO</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>

                    <tbody>
                        {lista.length === 0 ? (
                            <tr>
                                <td
                                    colSpan="9"
                                    className="inventario-vacio"
                                >
                                    <div>
                                        <i className="fa-solid fa-box-open"></i>

                                        <strong>
                                            No hay productos
                                            para mostrar
                                        </strong>

                                        <span>
                                            Intenta cambiar
                                            los filtros de
                                            búsqueda.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            lista.map(
                                (producto) => {
                                    const stock =
                                        Number(
                                            producto.stock
                                        );

                                    const stockMinimo =
                                        Number(
                                            producto.stockMinimo
                                        );

                                    const agotado =
                                        stock === 0;

                                    const stockBajo =
                                        stock > 0 &&
                                        stock <=
                                            stockMinimo;

                                    return (
                                        <tr
                                            key={
                                                producto.id
                                            }
                                        >
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
                                                            {
                                                                producto.nombre
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                producto.marca
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="codigo-producto">
                                                    {
                                                        producto.codigo
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                {
                                                    producto.categoria
                                                }
                                            </td>

                                            <td>
                                                {
                                                    producto.proveedor
                                                }
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
                                                    <strong>
                                                        {
                                                            stock
                                                        }
                                                    </strong>

                                                    <small>
                                                        Mín.{" "}
                                                        {
                                                            stockMinimo
                                                        }
                                                    </small>
                                                </div>
                                            </td>

                                            <td>
                                                {tipo ===
                                                "desactivados" ? (
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
                                                    {tipo ===
                                                    "desactivados" ? (
                                                        <button
                                                            type="button"
                                                            className="accion activar"
                                                            title="Activar producto"
                                                            onClick={() =>
                                                                cambiarEstadoProducto(
                                                                    producto.id
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
                                                                cambiarEstadoProducto(
                                                                    producto.id
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
                                                            eliminarProducto(
                                                                producto.id
                                                            )
                                                        }
                                                    >
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }
                            )
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <Layout>
            <div
                className="inventario-page"
                onClick={() =>
                    setMenuAbierto(null)
                }
            >
                {/* ENCABEZADO */}

                <div className="inventario-header">
                    <div>
                        <h1>Inventario</h1>

                        <p>
                            Gestiona productos,
                            marcas, proveedores,
                            precios y existencias.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-nuevo-producto"
                        onClick={
                            abrirNuevoProducto
                        }
                    >
                        <i className="fa-solid fa-plus"></i>

                        Nuevo producto
                    </button>
                </div>

                {/* ESTADÍSTICAS */}

                <div className="inventario-estadisticas">
                    <div className="estadistica-card">
                        <div className="estadistica-icono azul">
                            <i className="fa-solid fa-boxes-stacked"></i>
                        </div>

                        <div>
                            <span>Productos</span>

                            <strong>
                                {
                                    productosActivosTotal.length
                                }
                            </strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono azul">
                            <i className="fa-solid fa-cubes"></i>
                        </div>

                        <div>
                            <span>Unidades</span>

                            <strong>
                                {unidadesTotal.toLocaleString(
                                    "es-CO"
                                )}
                            </strong>
                        </div>
                    </div>

                    {/* VALOR MAYORISTA */}

                    <div className="estadistica-card">
                        <div className="estadistica-icono verde">
                            <i className="fa-solid fa-money-bill-trend-up"></i>
                        </div>

                        <div>
                            <span>
                                Valor mayorista
                            </span>

                            <strong>
                                {formatoPrecio(
                                    valorMayoristaTotal
                                )}
                            </strong>
                        </div>
                    </div>

                    {/* VALOR AL DETAL */}

                    <div className="estadistica-card">
                        <div className="estadistica-icono morado">
                            <i className="fa-solid fa-cart-shopping"></i>
                        </div>

                        <div>
                            <span>
                                Valor al detal
                            </span>

                            <strong>
                                {formatoPrecio(
                                    valorDetalTotal
                                )}
                            </strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono naranja">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>

                        <div>
                            <span>Stock bajo</span>

                            <strong>
                                {stockBajoTotal}
                            </strong>
                        </div>
                    </div>

                    <div className="estadistica-card">
                        <div className="estadistica-icono rojo">
                            <i className="fa-solid fa-circle-xmark"></i>
                        </div>

                        <div>
                            <span>Agotados</span>

                            <strong>
                                {agotadosTotal}
                            </strong>
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
                            onChange={(evento) =>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                            placeholder="Buscar producto, código, marca o proveedor..."
                        />

                        {busqueda && (
                            <button
                                type="button"
                                onClick={() =>
                                    setBusqueda("")
                                }
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        )}
                    </div>

                    <Dropdown
                        id="categorias"
                        valor={filtroCategoria}
                        cambiar={
                            setFiltroCategoria
                        }
                        opciones={[
                            "Todas las categorías",
                            ...categorias,
                        ]}
                    />

                    <Dropdown
                        id="proveedores"
                        valor={filtroProveedor}
                        cambiar={
                            setFiltroProveedor
                        }
                        opciones={[
                            "Todos los proveedores",
                            ...proveedores,
                        ]}
                    />

                    <Dropdown
                        id="estados"
                        valor={filtroEstado}
                        cambiar={
                            setFiltroEstado
                        }
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
                            setMostrarDesactivados(
                                !mostrarDesactivados
                            )
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

                {/* LIMPIAR FILTROS */}

                {(busqueda ||
                    filtroCategoria !==
                        "Todas las categorías" ||
                    filtroProveedor !==
                        "Todos los proveedores" ||
                    filtroEstado !==
                        "Todos los estados") && (
                    <div className="filtros-activos">
                        <span>
                            Mostrando resultados
                            filtrados
                        </span>

                        <button
                            type="button"
                            onClick={
                                limpiarFiltros
                            }
                        >
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
                                Productos disponibles
                                para las operaciones
                                del sistema.
                            </p>
                        </div>

                        <span className="contador verde">
                            {
                                productosActivos.length
                            }
                        </span>
                    </div>

                    <TablaProductos
                        lista={
                            productosActivos
                        }
                        tipo="activos"
                    />
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
                                Productos activos que
                                actualmente no tienen
                                existencias.
                            </p>
                        </div>

                        <span className="contador rojo">
                            {
                                productosAgotados.length
                            }
                        </span>
                    </div>

                    <TablaProductos
                        lista={
                            productosAgotados
                        }
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
                                    Productos que no
                                    están disponibles
                                    actualmente.
                                </p>
                            </div>

                            <span className="contador gris">
                                {
                                    productosDesactivados.length
                                }
                            </span>
                        </div>

                        <TablaProductos
                            lista={
                                productosDesactivados
                            }
                            tipo="desactivados"
                        />
                    </section>
                )}

                {/* MODAL */}

                {modalAbierto && (
                    <div
                        className="modal-overlay"
                        onClick={() =>
                            setModalAbierto(false)
                        }
                    >
                        <div
                            className="modal-producto"
                            onClick={(evento) =>
                                evento.stopPropagation()
                            }
                        >
                            <div className="modal-header">
                                <div>
                                    <h2>
                                        {productoEditar
                                            ? "Editar producto"
                                            : "Nuevo producto"}
                                    </h2>

                                    <p>
                                        Completa la
                                        información
                                        del producto.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setModalAbierto(
                                            false
                                        )
                                    }
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <form
                                onSubmit={
                                    guardarProducto
                                }
                            >
                                <div className="form-grid">
                                    <div className="campo">
                                        <label>
                                            Producto
                                        </label>

                                        <input
                                            name="nombre"
                                            defaultValue={
                                                productoEditar?.nombre ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>
                                            Marca
                                        </label>

                                        <input
                                            name="marca"
                                            defaultValue={
                                                productoEditar?.marca ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>
                                            Código
                                        </label>

                                        <input
                                            name="codigo"
                                            defaultValue={
                                                productoEditar?.codigo ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>
                                            Categoría
                                        </label>

                                        <input
                                            name="categoria"
                                            defaultValue={
                                                productoEditar?.categoria ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo campo-completo">
                                        <label>
                                            Proveedor
                                        </label>

                                        <input
                                            name="proveedor"
                                            defaultValue={
                                                productoEditar?.proveedor ||
                                                ""
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>
                                            Precio proveedor
                                        </label>

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
                                        <label>
                                            Precio al detal
                                        </label>

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
                                        <label>
                                            Stock
                                        </label>

                                        <input
                                            name="stock"
                                            type="number"
                                            min="0"
                                            defaultValue={
                                                productoEditar?.stock ??
                                                0
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>
                                            Stock mínimo
                                        </label>

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

                                <div className="modal-acciones">
                                    <button
                                        type="button"
                                        className="btn-cancelar"
                                        onClick={() =>
                                            setModalAbierto(
                                                false
                                            )
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
            </div>
        </Layout>
    );
}

export default Inventario;