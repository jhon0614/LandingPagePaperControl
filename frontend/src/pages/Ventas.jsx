import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";

import "../styles/Dashboard.css";
import "../styles/Ventas.css";
import "../styles/Caja.css";

import { obtenerTurnoActual } from "../services/caja.service";
import {obtenerVentas, obtenerHistorialVentas, crearVenta, obtenerComprobante, 
    eliminarVenta,} from "../services/ventas.service";
import { obtenerProductos } from "../services/productos.service";
import { registrarVenta as crearVentaApi } from "../services/ventas.service";

function Dropdown({
    value,
    options,
    placeholder,
    onChange,
    className = "",
}) {

    const [abierto, setAbierto] = useState(false);

    const dropdownRef = useRef(null);


    const opcionSeleccionada = options.find(
        (option) =>
            String(option.value) === String(value)
    );


    useEffect(() => {

        function cerrarDropdown(e) {

            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {

                setAbierto(false);

            }

        }


        document.addEventListener(
            "mousedown",
            cerrarDropdown
        );


        return () => {

            document.removeEventListener(
                "mousedown",
                cerrarDropdown
            );

        };

    }, []);


    function seleccionarOpcion(option) {

        onChange(option.value);

        setAbierto(false);

    }


    return (

        <div
            className={`pos-dropdown ${className}`}
            ref={dropdownRef}
        >

            <button
                type="button"
                className={
                    abierto
                        ? "pos-dropdown-trigger abierto"
                        : "pos-dropdown-trigger"
                }
                onClick={() =>
                    setAbierto((actual) => !actual)
                }
            >

                <span
                    className={
                        opcionSeleccionada
                            ? "pos-dropdown-text"
                            : "pos-dropdown-placeholder"
                    }
                >

                    {opcionSeleccionada
                        ? opcionSeleccionada.label
                        : placeholder}

                </span>


                <i
                    className={
                        abierto
                            ? "fa-solid fa-chevron-up"
                            : "fa-solid fa-chevron-down"
                    }
                ></i>

            </button>


            {abierto && (

                <div className="pos-dropdown-menu">

                    {options.length === 0 ? (

                        <div className="pos-dropdown-empty">

                            No hay opciones disponibles.

                        </div>

                    ) : (

                        options.map((option) => (

                            <button
                                type="button"
                                key={option.value}
                                className={
                                    String(option.value) ===
                                    String(value)
                                        ? "pos-dropdown-option seleccionado"
                                        : "pos-dropdown-option"
                                }
                                onClick={() =>
                                    seleccionarOpcion(
                                        option
                                    )
                                }
                            >

                                <span>
                                    {option.label}
                                </span>


                                {String(option.value) ===
                                    String(value) && (

                                    <i className="fa-solid fa-check"></i>

                                )}

                            </button>

                        ))

                    )}

                </div>

            )}

        </div>

    );

}


function Ventas() {

    const navigate = useNavigate();

    const [turnoActivo, setTurnoActivo] = useState(null);
    const [verificandoCaja, setVerificandoCaja] = useState(true);

    useEffect(() => {

        async function verificarCaja() {

            try {

                const turno = await obtenerTurnoActual();

                setTurnoActivo(turno);

            } catch (error) {

                setTurnoActivo(null);

            } finally {

                setVerificandoCaja(false);

            }

        }

        verificarCaja();

    }, []);

    

    const usuarioActual = JSON.parse(
        localStorage.getItem("usuario")
    );


    const rolActual =
        usuarioActual?.rol || "";


    function puedeAdministrar() {

        return (
            rolActual === "ADMINISTRADOR" ||
            rolActual === "DUENO"
        );

    }


    const [productos, setProductos] = useState([]);

    const [cargandoProductos, setCargandoProductos] = useState(true);


    async function cargarProductos() {

        try {

            const lista = await obtenerProductos();

            setProductos(lista);

        } catch (error) {

            setProductos([]);

        } finally {

            setCargandoProductos(false);

        }

    }

    useEffect(() => {

        cargarProductos();

    }, []);


    /*
     * =========================================================
     * DATOS TEMPORALES - CLIENTES
     * =========================================================
     */

    const [clientes] = useState([

        {
            id: 1,
            nombres: "Laura",
            apellidos: "Gómez",
            documento: "1001234567",
        },

        {
            id: 2,
            nombres: "Carlos",
            apellidos: "Martínez",
            documento: "1002345678",
        },

        {
            id: 3,
            nombres: "María",
            apellidos: "Rodríguez",
            documento: "1003456789",
        },

    ]);


    /*
     * =========================================================
     * MÉTODOS DE PAGO
     * =========================================================
     */

    const [metodosPago, setMetodosPago] =
        useState([

            {
                id: "efectivo",
                nombre: "Efectivo",
                activo: true,
            },

            {
                id: "tarjeta",
                nombre: "Tarjeta",
                activo: true,
            },

            {
                id: "transferencia",
                nombre: "Transferencia",
                activo: true,
            },

        ]);


    /*
     * =========================================================
     * TIPOS DE TARJETA
     * =========================================================
     */

    const [tiposTarjeta, setTiposTarjeta] =
        useState([

            {
                id: "visa",
                nombre: "Visa",
                activo: true,
            },

            {
                id: "mastercard",
                nombre: "Mastercard",
                activo: true,
            },

            {
                id: "american_express",
                nombre: "American Express",
                activo: true,
            },

            {
                id: "otra",
                nombre: "Otra",
                activo: true,
            },

        ]);


    /*
     * =========================================================
     * BANCOS / BILLETERAS
     * =========================================================
     */

    const [bancos, setBancos] =
        useState([

            {
                id: "nequi",
                nombre: "Nequi",
                activo: true,
            },

            {
                id: "daviplata",
                nombre: "Daviplata",
                activo: true,
            },

            {
                id: "bancolombia",
                nombre: "Bancolombia",
                activo: true,
            },

            {
                id: "davivienda",
                nombre: "Davivienda",
                activo: true,
            },

        ]);


    /*
     * =========================================================
     * ESTADOS
     * =========================================================
     */

    const [busqueda, setBusqueda] =
        useState("");


    const [carrito, setCarrito] =
        useState([]);


    const [clienteSeleccionado, setClienteSeleccionado] =
        useState("");


    const [metodoPago, setMetodoPago] =
        useState("");


    const [tipoTarjetaSeleccionado, setTipoTarjetaSeleccionado] =
        useState("");


    const [bancoSeleccionado, setBancoSeleccionado] =
        useState("");


    const [modalConfigPagos, setModalConfigPagos] =
        useState(false);


    /* =========================================================
    HISTORIAL DE VENTAS
    ========================================================= */

    const [ventas, setVentas] = useState([]);

    const [cargandoVentas, setCargandoVentas] =
        useState(false);

    const [fechaInicio, setFechaInicio] =
        useState("");

    const [fechaFin, setFechaFin] =
        useState("");

    const [orden, setOrden] =
    useState("fecha");

    /* =========================================================
    CARGAR HISTORIAL
    ========================================================= */

    async function cargarVentas() {

        try {

            setCargandoVentas(true);

            let datos = [];

            if (rolActual === "VENDEDOR") {

                datos = await obtenerVentas();

            } else {

                datos =
                    await obtenerHistorialVentas({

                        fechaInicio,

                        fechaFin,

                        orden,

                    });

            }

            setVentas(datos);
            console.log("Ventas cargadas:", datos);
            

        } catch (error) {

            console.error(
                "Error cargando ventas:",
                error
            );

        } finally {

            setCargandoVentas(false);

        }

    }

    // Carga el historial de ventas
    useEffect(() => {
        if (!verificandoCaja && turnoActivo) {
            cargarVentas();
        }
    }, [
        verificandoCaja,
        turnoActivo,
        fechaInicio,
        fechaFin,
        orden,
    ]);

    /*
     * =========================================================
     * NORMALIZAR TEXTO
     * =========================================================
     *
     * Esta función elimina las tildes para que:
     *
     * lapiz  -> lápiz
     * lápiz  -> lápiz
     * LAPIZ  -> lápiz
     *
     * sean considerados iguales al buscar.
     */

    function normalizarTexto(texto) {

        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    /*
     * =========================================================
     * PRODUCTOS FILTRADOS
     * =========================================================
     */

    const productosFiltrados = useMemo(() => {

        const texto =
            normalizarTexto(busqueda);


        if (!texto) {

            return productos;

        }


        return productos.filter((producto) => {

            const nombre =
                normalizarTexto(
                    producto.nombre
                );


            const categoria =
                normalizarTexto(
                    producto.categoria
                );


            return (
                nombre.includes(texto) ||
                categoria.includes(texto)
            );

        });

    }, [productos, busqueda]);


    /*
     * =========================================================
     * MÉTODOS ACTIVOS
     * =========================================================
     */

    const metodosPagoActivos =
        useMemo(() => {

            return metodosPago.filter(
                (metodo) =>
                    metodo.activo
            );

        }, [metodosPago]);


    /*
     * =========================================================
     * TIPOS DE TARJETA ACTIVOS
     * =========================================================
     */

    const tiposTarjetaActivos =
        useMemo(() => {

            return tiposTarjeta.filter(
                (tipo) =>
                    tipo.activo
            );

        }, [tiposTarjeta]);


    /*
     * =========================================================
     * BANCOS ACTIVOS
     * =========================================================
     */

    const bancosActivos =
        useMemo(() => {

            return bancos.filter(
                (banco) =>
                    banco.activo
            );

        }, [bancos]);


    /*
     * =========================================================
     * TOTAL
     * =========================================================
     */

    const total = useMemo(() => {

        return carrito.reduce(
            (acumulado, item) =>
                acumulado +
                item.precio *
                item.cantidad,
            0
        );

    }, [carrito]);


    /*
     * =========================================================
     * AGREGAR PRODUCTO
     * =========================================================
     */

    function agregarAlCarrito(producto) {

        const stockDisponible = Number(producto.stock || 0);


        setCarrito((actual) => {

            const productoExistente =
                actual.find(
                    (item) =>
                        item.id ===
                        producto.id
                );


            const cantidadActual =
                productoExistente
                    ? productoExistente.cantidad
                    : 0;


            if (cantidadActual + 1 > stockDisponible) {

                alert(
                    `No hay suficiente stock de "${producto.nombre}". Disponible: ${stockDisponible}.`
                );

                return actual;

            }


            if (productoExistente) {

                return actual.map(
                    (item) =>
                        item.id ===
                        producto.id
                            ? {
                                ...item,
                                cantidad:
                                    item.cantidad +
                                    1,
                            }
                            : item
                );

            }


            return [

                ...actual,

                {
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    cantidad: 1,
                },

            ];

        });

    }


    /*
     * =========================================================
     * AUMENTAR CANTIDAD
     * =========================================================
     */

    function aumentarCantidad(id) {

        const producto = productos.find(
            (p) => p.id === id
        );

        const stockDisponible = Number(
            producto?.stock || 0
        );


        setCarrito((actual) =>

            actual.map((item) => {

                if (item.id !== id) return item;


                if (item.cantidad + 1 > stockDisponible) {

                    alert(
                        `No hay más stock disponible de "${item.nombre}". Disponible: ${stockDisponible}.`
                    );

                    return item;

                }


                return {
                    ...item,
                    cantidad: item.cantidad + 1,
                };

            })

        );

    }


    /*
     * =========================================================
     * DISMINUIR CANTIDAD
     * =========================================================
     */

    function disminuirCantidad(id) {

        setCarrito((actual) =>

            actual

                .map((item) =>

                    item.id === id

                        ? {
                            ...item,
                            cantidad:
                                item.cantidad - 1,
                        }

                        : item

                )

                .filter(
                    (item) =>
                        item.cantidad > 0
                )

        );

    }


    /*
     * =========================================================
     * QUITAR PRODUCTO
     * =========================================================
     */

    function quitarDelCarrito(id) {

        setCarrito((actual) =>
            actual.filter(
                (item) =>
                    item.id !== id
            )
        );

    }


    /*
     * =========================================================
     * TOGGLE MÉTODO DE PAGO
     * =========================================================
     */

    function toggleMetodoPago(id) {

        if (!puedeAdministrar()) {

            return;

        }


        setMetodosPago((actuales) =>

            actuales.map((metodo) =>

                metodo.id === id

                    ? {
                        ...metodo,
                        activo:
                            !metodo.activo,
                    }

                    : metodo

            )

        );


        if (metodoPago === id) {

            setMetodoPago("");

        }

    }


    /*
     * =========================================================
     * TOGGLE TIPO DE TARJETA
     * =========================================================
     */

    function toggleTipoTarjeta(id) {

        if (!puedeAdministrar()) {

            return;

        }


        setTiposTarjeta((actuales) =>

            actuales.map((tipo) =>

                tipo.id === id

                    ? {
                        ...tipo,
                        activo:
                            !tipo.activo,
                    }

                    : tipo

            )

        );


        if (
            tipoTarjetaSeleccionado ===
            id
        ) {

            setTipoTarjetaSeleccionado("");

        }

    }


    /*
     * =========================================================
     * TOGGLE BANCO
     * =========================================================
     */

    function toggleBanco(id) {

        if (!puedeAdministrar()) {

            return;

        }


        setBancos((actuales) =>

            actuales.map((banco) =>

                banco.id === id

                    ? {
                        ...banco,
                        activo:
                            !banco.activo,
                    }

                    : banco

            )

        );


        if (
            bancoSeleccionado === id
        ) {

            setBancoSeleccionado("");

        }

    }


    /*
     * =========================================================
     * REGISTRAR VENTA
     * =========================================================
     */

    const [registrandoVenta, setRegistrandoVenta] =
        useState(false);


    async function registrarVenta() {

        if (carrito.length === 0) {

            return;

        }


        if (!metodoPago) {

            alert(
                "Selecciona un método de pago para continuar."
            );

            return;

        }


        if (
            metodoPago === "tarjeta" &&
            !tipoTarjetaSeleccionado
        ) {

            alert(
                "Selecciona el tipo de tarjeta."
            );

            return;

        }


        if (
            metodoPago === "tarjeta" &&
            !bancoSeleccionado
        ) {

            alert(
                "Selecciona el banco de la tarjeta."
            );

            return;

        }


        if (
            metodoPago === "transferencia" &&
            !bancoSeleccionado
        ) {

            alert(
                "Selecciona el banco o billetera."
            );

            return;

        }


        /*
         * Verificación final de stock antes de enviar,
         * por si el stock cambió desde que se cargó la
         * página (ej: otra caja vendió el mismo producto).
         */

        const productosSinStock = carrito.filter((item) => {

            const producto = productos.find(
                (p) => p.id === item.id
            );

            return (
                !producto ||
                item.cantidad > Number(producto.stock || 0)
            );

        });


        if (productosSinStock.length > 0) {

            alert(
                `No hay stock suficiente para: ${productosSinStock
                    .map((item) => item.nombre)
                    .join(", ")}. Actualiza la página e intenta de nuevo.`
            );

            return;

        }


        try {

            setRegistrandoVenta(true);


            await crearVentaApi({

                turnoCajaId: turnoActivo.id,

                clienteId: clienteSeleccionado || null,

                metodoPago,

                tipoTarjeta: tipoTarjetaSeleccionado || null,

                banco: bancoSeleccionado || null,

                items: carrito.map((item) => ({
                    productoId: item.id,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio,
                })),

            });


            alert("Venta registrada correctamente.");


            setCarrito([]);

            setClienteSeleccionado("");

            setMetodoPago("");

            setTipoTarjetaSeleccionado("");

            setBancoSeleccionado("");


            // Refresca el stock mostrado en el catálogo.

            await cargarProductos();


        } catch (error) {

            alert(
                error.message ||
                "No fue posible registrar la venta."
            );

        } finally {

            setRegistrandoVenta(false);

        }

    }


    /*
     * =========================================================
     * OPCIONES DROPDOWN CLIENTES
     * =========================================================
     */

    const opcionesClientes =
        useMemo(() => {

            return [

                {
                    value: "",
                    label: "Cliente ocasional",
                },

                ...clientes.map(
                    (cliente) => ({
                        value: cliente.id,
                        label:
                            `${cliente.nombres} ${cliente.apellidos} — ${cliente.documento}`,
                    })
                ),

            ];

        }, [clientes]);


    /*
     * =========================================================
     * OPCIONES DROPDOWN MÉTODOS
     * =========================================================
     */

    const opcionesMetodosPago =
        useMemo(() => {

            return [

                {
                    value: "",
                    label: "Selecciona un método",
                },

                ...metodosPagoActivos.map(
                    (metodo) => ({
                        value: metodo.id,
                        label: metodo.nombre,
                    })
                ),

            ];

        }, [metodosPagoActivos]);

        if (verificandoCaja || cargandoProductos) {

        return (
            <Layout>
                <div className="caja-cargando">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <p>Cargando información de ventas...</p>
                </div>
            </Layout>
        );

    }

    if (!turnoActivo) {

        return (
            <Layout>
                <div className="caja-apertura-card">
                    <i className="fa-solid fa-lock"></i>
                    <h2>Caja cerrada</h2>
                    <p>
                        Debes abrir la caja antes de poder
                        registrar ventas.
                    </p>
                    <button
                        type="button"
                        className="auth-button"
                        onClick={() => navigate("/caja")}
                    >
                        Ir a Caja
                    </button>
                </div>
            </Layout>
        );

    }

    return (

        <Layout>

            <div className="ventas-header">

                <div>

                    <h1>
                        Ventas
                    </h1>

                    <p className="dashboard-subtitle">
                        Gestiona todas las ventas del inventario.
                    </p>

                </div>

            </div>


            <div className="pos-container">


                {/* =================================================
                    COLUMNA IZQUIERDA
                ================================================= */}

                <div className="pos-productos">


                    {/* BUSCADOR */}

                    <div className="pos-buscador">

                        <i className="fa-solid fa-magnifying-glass"></i>

                        <input
                            type="text"
                            placeholder="Buscar producto por nombre..."
                            value={busqueda}
                            onChange={(e) =>
                                setBusqueda(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    {/* PRODUCTOS */}

                    <div className="pos-productos-grid">

                        {productosFiltrados.length === 0 ? (

                            <div className="pos-vacio">

                                <i className="fa-solid fa-box-open"></i>

                                <p>
                                    No se encontraron productos.
                                </p>

                            </div>

                        ) : (

                            productosFiltrados.map(
                                (producto) => (

                                    <div
                                        className="pos-producto-card"
                                        key={producto.id}
                                        onClick={() =>
                                            agregarAlCarrito(
                                                producto
                                            )
                                        }
                                    >

                                        <div className="pos-producto-icono">

                                            <i className="fa-solid fa-box"></i>

                                        </div>


                                        <div className="pos-producto-info">

                                            <strong>
                                                {producto.nombre}
                                            </strong>

                                            <span>
                                                {producto.categoria}
                                            </span>

                                        </div>


                                        <div className="pos-producto-precio">

                                            <span>

                                                $
                                                {producto.precio.toLocaleString(
                                                    "es-CO"
                                                )}

                                            </span>

                                            <small>
                                                Stock: {producto.stock}
                                            </small>

                                        </div>

                                    </div>

                                )
                            )

                        )}

                    </div>

                </div>


                {/* =================================================
                    COLUMNA DERECHA
                ================================================= */}

                <div className="pos-carrito">


                    {/* HEADER */}

                    <div className="pos-carrito-header">

                        <h2>

                            <i className="fa-solid fa-cart-shopping"></i>

                            Carrito

                        </h2>


                        <span className="pos-carrito-contador">

                            {carrito.reduce(
                                (totalItems, item) =>
                                    totalItems +
                                    item.cantidad,
                                0
                            )}

                        </span>

                    </div>


                    {/* CLIENTE */}

                    <div className="pos-carrito-cliente">

                        <label>
                            Cliente
                        </label>


                        <Dropdown
                            value={
                                clienteSeleccionado
                            }
                            options={
                                opcionesClientes
                            }
                            placeholder="Cliente ocasional"
                            onChange={
                                setClienteSeleccionado
                            }
                        />

                    </div>


                    {/* CARRITO */}

                    <div className="pos-carrito-items">

                        {carrito.length === 0 ? (

                            <div className="pos-carrito-vacio">

                                <i className="fa-solid fa-cart-arrow-down"></i>

                                <p>
                                    Agrega productos al carrito.
                                </p>

                            </div>

                        ) : (

                            carrito.map(
                                (item) => (

                                    <div
                                        className="pos-carrito-item"
                                        key={item.id}
                                    >

                                        <div className="pos-carrito-item-info">

                                            <strong>
                                                {item.nombre}
                                            </strong>

                                            <span>
                                                $
                                                {item.precio.toLocaleString(
                                                    "es-CO"
                                                )}{" "}
                                                unidad
                                            </span>


                                            <b>
                                                Subtotal: $
                                                {(
                                                    item.precio *
                                                    item.cantidad
                                                ).toLocaleString(
                                                    "es-CO"
                                                )}
                                            </b>

                                        </div>


                                        <div className="pos-carrito-item-controles">


                                            {/* MENOS */}

                                            <button
                                                type="button"
                                                className="pos-cantidad-btn"
                                                onClick={(e) => {

                                                    e.stopPropagation();

                                                    disminuirCantidad(
                                                        item.id
                                                    );

                                                }}
                                                title="Disminuir"
                                            >

                                                <i className="fa-solid fa-minus"></i>

                                            </button>


                                            {/* CANTIDAD */}

                                            <span className="pos-cantidad">

                                                {item.cantidad}

                                            </span>


                                            {/* MÁS */}

                                            <button
                                                type="button"
                                                className="pos-cantidad-btn"
                                                onClick={(e) => {

                                                    e.stopPropagation();

                                                    aumentarCantidad(
                                                        item.id
                                                    );

                                                }}
                                                title="Aumentar"
                                            >

                                                <i className="fa-solid fa-plus"></i>

                                            </button>


                                            {/* ELIMINAR */}

                                            <button
                                                type="button"
                                                className="pos-quitar-item"
                                                onClick={(e) => {

                                                    e.stopPropagation();

                                                    quitarDelCarrito(
                                                        item.id
                                                    );

                                                }}
                                                title="Quitar"
                                            >

                                                <i className="fa-solid fa-trash"></i>

                                            </button>

                                        </div>

                                    </div>

                                )
                            )

                        )}

                    </div>


                    {/* =================================================
                        PAGO
                    ================================================= */}

                    <div className="pos-carrito-pago">


                        <div className="pos-carrito-pago-header">

                            <label>
                                Método de pago
                            </label>


                            {puedeAdministrar() && (

                                <button
                                    type="button"
                                    className="btn-config-pagos"
                                    title="Configurar métodos de pago"
                                    onClick={() =>
                                        setModalConfigPagos(
                                            true
                                        )
                                    }
                                >

                                    <i className="fa-solid fa-gear"></i>

                                </button>

                            )}

                        </div>


                        {/* MÉTODO */}

                        <Dropdown
                            value={metodoPago}
                            options={
                                opcionesMetodosPago
                            }
                            placeholder="Selecciona un método"
                            onChange={
                                setMetodoPago
                            }
                            className="pos-dropdown-pago"
                        />


                        {/* =================================================
                            TIPO DE TARJETA
                        ================================================= */}

                        {metodoPago === "tarjeta" && (

                            <div className="pos-bancos-selector">

                                <label>
                                    Tipo de tarjeta
                                </label>


                                {tiposTarjetaActivos.length === 0 ? (

                                    <p className="pos-bancos-vacio">

                                        No hay tipos de tarjeta activos.

                                    </p>

                                ) : (

                                    <div className="pos-bancos-lista">

                                        {tiposTarjetaActivos.map(
                                            (tipo) => (

                                                <button
                                                    type="button"
                                                    key={tipo.id}
                                                    className={
                                                        tipoTarjetaSeleccionado ===
                                                        tipo.id
                                                            ? "pos-banco-chip seleccionado"
                                                            : "pos-banco-chip"
                                                    }
                                                    onClick={() =>
                                                        setTipoTarjetaSeleccionado(
                                                            tipo.id
                                                        )
                                                    }
                                                >

                                                    <span className="pos-banco-chip-punto"></span>

                                                    {tipo.nombre}


                                                    {tipoTarjetaSeleccionado ===
                                                        tipo.id && (

                                                        <i className="fa-solid fa-check"></i>

                                                    )}

                                                </button>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>

                        )}


                        {/* =================================================
                            BANCO / BILLETERA
                        ================================================= */}

                        {(metodoPago === "tarjeta" ||
                            metodoPago === "transferencia") && (

                            <div className="pos-bancos-selector">

                                <label>

                                    {metodoPago === "tarjeta"
                                        ? "Banco de la tarjeta"
                                        : "Banco / billetera"}

                                </label>


                                {bancosActivos.length === 0 ? (

                                    <p className="pos-bancos-vacio">

                                        No hay bancos o billeteras activos.

                                    </p>

                                ) : (

                                    <div className="pos-bancos-lista">

                                        {bancosActivos.map(
                                            (banco) => (

                                                <button
                                                    type="button"
                                                    key={banco.id}
                                                    className={
                                                        bancoSeleccionado ===
                                                        banco.id
                                                            ? `pos-banco-chip banco-${banco.id} seleccionado`
                                                            : `pos-banco-chip banco-${banco.id}`
                                                    }
                                                    onClick={() =>
                                                        setBancoSeleccionado(
                                                            banco.id
                                                        )
                                                    }
                                                >

                                                    <span className="pos-banco-chip-punto"></span>

                                                    {banco.nombre}


                                                    {bancoSeleccionado ===
                                                        banco.id && (

                                                        <i className="fa-solid fa-check"></i>

                                                    )}

                                                </button>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>

                        )}

                    </div>


                    {/* TOTAL */}

                    <div className="pos-carrito-total">

                        <span>
                            Total
                        </span>


                        <strong>

                            $
                            {total.toLocaleString(
                                "es-CO"
                            )}

                        </strong>

                    </div>


                    {/* REGISTRAR */}

                    <button
                        type="button"
                        className="btn-registrar-venta"
                        onClick={registrarVenta}
                        disabled={
                            carrito.length === 0 ||
                            registrandoVenta
                        }
                    >

                        {registrandoVenta ? (

                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                Registrando...
                            </>

                        ) : (

                            <>

                        <i className="fa-solid fa-check"></i>

                        Registrar venta
                        </>

                        )}
                        
                    </button>

                </div>

            </div>

            {/* =========================================================
                HISTORIAL DE VENTAS
            ========================================================= */}

            <section className="historial-ventas">

                <div className="historial-ventas-header">

                    <div>
                        <h2>
                            Historial de ventas
                        </h2>

                        <p>
                            Consulta las ventas registradas en el sistema.
                        </p>
                    </div>

                </div>


                {/* =====================================================
                    FILTROS
                ===================================================== */}

                <div className="historial-ventas-filtros">

                    <div className="historial-filtro">

                        <label htmlFor="fechaInicio">
                            Desde
                        </label>

                        <input
                            id="fechaInicio"
                            type="date"
                            value={fechaInicio}
                            onChange={(e) =>
                                setFechaInicio(e.target.value)
                            }
                        />

                    </div>


                    <div className="historial-filtro">

                        <label htmlFor="fechaFin">
                            Hasta
                        </label>

                        <input
                            id="fechaFin"
                            type="date"
                            value={fechaFin}
                            onChange={(e) =>
                                setFechaFin(e.target.value)
                            }
                        />

                    </div>


                    <div className="historial-filtro">

                        <label htmlFor="ordenVentas">
                            Ordenar por
                        </label>

                        <select
                            id="ordenVentas"
                            value={orden}
                            onChange={(e) =>
                                setOrden(e.target.value)
                            }
                        >

                            <option value="fecha">
                                Fecha
                            </option>

                            <option value="monto">
                                Monto
                            </option>

                            <option value="vendedor">
                                Vendedor
                            </option>

                        </select>

                    </div>

                </div>


                {/* =====================================================
                    CONTENIDO
                ===================================================== */}

                <div className="historial-ventas-contenido">

                    {cargandoVentas ? (

                        <div className="historial-ventas-vacio">

                            <i className="fa-solid fa-spinner fa-spin"></i>

                            <p>
                                Cargando ventas...
                            </p>

                        </div>

                    ) : ventas.length === 0 ? (

                        <div className="historial-ventas-vacio">

                            <i className="fa-solid fa-receipt"></i>

                            <h3>
                                No hay ventas registradas
                            </h3>

                            <p>
                                Cuando se registren ventas,
                                aparecerán aquí.
                            </p>

                        </div>

                    ) : (

                        <div className="historial-ventas-tabla">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Venta</th>
                                        <th>Fecha</th>
                                        <th>Vendedor</th>
                                        <th>Productos</th>
                                        <th>Método de pago</th>
                                        <th>Subtotal</th>
                                        <th>Descuento</th>
                                        <th>Total</th>
                                        <th>Estado</th>
                                    </tr>

                                </thead>


                                <tbody>

                                    {ventas.map((venta) => (

                                        <tr key={venta.id}>

                                            {/* NÚMERO DE VENTA */}

                                            <td>

                                                <strong>
                                                    {venta.numero_venta}
                                                </strong>

                                            </td>


                                            {/* FECHA */}

                                            <td>

                                                {venta.confirmado_en
                                                    ? new Date(
                                                        venta.confirmado_en
                                                    ).toLocaleString("es-CO", {
                                                        dateStyle: "short",
                                                        timeStyle: "short",
                                                    })
                                                    : "—"}

                                            </td>


                                            {/* VENDEDOR */}

                                            <td>

                                                {venta.vendedor || "—"}

                                            </td>


                                            {/* PRODUCTOS */}

                                            <td>

                                                <span
                                                    title={
                                                        venta.productos || ""
                                                    }
                                                >
                                                    {venta.productos || "—"}
                                                </span>

                                            </td>


                                            {/* MÉTODOS DE PAGO */}

                                            <td>

                                                {venta.metodos_pago || "—"}

                                            </td>


                                            {/* SUBTOTAL */}

                                            <td>

                                                $
                                                {Number(
                                                    venta.subtotal || 0
                                                ).toLocaleString("es-CO")}

                                            </td>


                                            {/* DESCUENTO */}

                                            <td>

                                                $
                                                {Number(
                                                    venta.monto_descuento || 0
                                                ).toLocaleString("es-CO")}

                                            </td>


                                            {/* TOTAL */}

                                            <td>

                                                <strong>

                                                    $
                                                    {Number(
                                                        venta.monto_total || 0
                                                    ).toLocaleString("es-CO")}

                                                </strong>

                                            </td>


                                            {/* ESTADO */}

                                            <td>

                                                <span
                                                    className={`historial-estado historial-estado-${String(
                                                        venta.estado || ""
                                                    ).toLowerCase()}`}
                                                >
                                                    {venta.estado || "—"}
                                                </span>

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </section>
            
            {/* =========================================================
                MODAL CONFIGURACIÓN
            ========================================================= */}

            {modalConfigPagos && (

                <div
                    className="pos-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target ===
                            e.currentTarget
                        ) {

                            setModalConfigPagos(
                                false
                            );

                        }

                    }}
                >

                    <div className="pos-modal">


                        <div className="pos-modal-header">

                            <div>

                                <h2>
                                    Configurar métodos de pago
                                </h2>

                                <p>

                                    Activa o desactiva los
                                    métodos de pago,
                                    tipos de tarjeta y
                                    bancos que acepta
                                    la papelería.

                                </p>

                            </div>


                            <button
                                type="button"
                                className="pos-modal-cerrar"
                                onClick={() =>
                                    setModalConfigPagos(
                                        false
                                    )
                                }
                                title="Cerrar"
                            >

                                <i className="fa-solid fa-xmark"></i>

                            </button>

                        </div>


                        <div className="config-pagos-body">


                            {/* MÉTODOS */}

                            <h3>
                                Métodos de pago
                            </h3>


                            <div className="config-pagos-lista">

                                {metodosPago.map(
                                    (metodo) => (

                                        <label
                                            className="config-pagos-item"
                                            key={metodo.id}
                                        >

                                            <span>
                                                {metodo.nombre}
                                            </span>


                                            <input
                                                type="checkbox"
                                                checked={
                                                    metodo.activo
                                                }
                                                onChange={() =>
                                                    toggleMetodoPago(
                                                        metodo.id
                                                    )
                                                }
                                            />

                                        </label>

                                    )
                                )}

                            </div>


                            {/* TIPOS DE TARJETA */}

                            <h3>
                                Tipos de tarjeta
                            </h3>


                            <div className="config-pagos-lista">

                                {tiposTarjeta.map(
                                    (tipo) => (

                                        <label
                                            className="config-pagos-item"
                                            key={tipo.id}
                                        >

                                            <span>
                                                {tipo.nombre}
                                            </span>


                                            <input
                                                type="checkbox"
                                                checked={
                                                    tipo.activo
                                                }
                                                onChange={() =>
                                                    toggleTipoTarjeta(
                                                        tipo.id
                                                    )
                                                }
                                            />

                                        </label>

                                    )
                                )}

                            </div>


                            {/* BANCOS */}

                            <h3>
                                Bancos / billeteras
                            </h3>


                            <div className="config-pagos-lista">

                                {bancos.map(
                                    (banco) => (

                                        <label
                                            className="config-pagos-item"
                                            key={banco.id}
                                        >

                                            <span>
                                                {banco.nombre}
                                            </span>


                                            <input
                                                type="checkbox"
                                                checked={
                                                    banco.activo
                                                }
                                                onChange={() =>
                                                    toggleBanco(
                                                        banco.id
                                                    )
                                                }
                                            />

                                        </label>

                                    )
                                )}

                            </div>

                        </div>


                        {/* FOOTER */}

                        <div className="pos-modal-footer">

                            <button
                                type="button"
                                className="btn-cerrar-pos-modal"
                                onClick={() =>
                                    setModalConfigPagos(
                                        false
                                    )
                                }
                            >

                                Cerrar

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </Layout>

    );

}


export default Ventas;