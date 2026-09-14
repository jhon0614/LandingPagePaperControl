import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";

import "../styles/Dashboard.css";
import "../styles/Ventas.css";
import "../styles/Caja.css";

import { obtenerTurnoActual } from "../services/caja.service";
import {
    obtenerVentas, 
    obtenerHistorialVentas, 
    registrarVenta as crearVentaApi,
    eliminarVenta,
    obtenerComprobante,
    obtenerComprobanteHtml,
} from "../services/ventas.service";
import { obtenerProductos } from "../services/productos.service";
import { obtenerMetodosPago, cambiarEstadoMetodoPago } from "../services/ventas.service";
import { obtenerClientes, obtenerCliente } from "../services/clientes.service";
import { aNumeroMonto, formatearMontoEntrada, limpiarMontoEntrada } from "../utils/moneda";

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

            } catch {

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

        } catch {

            setProductos([]);

        } finally {

            setCargandoProductos(false);

        }

    }

    useEffect(() => {

        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarProductos();

    }, []);


    const [clientes, setClientes] = useState([]);

    useEffect(() => {

        async function cargarClientes() {

            try {

                const lista = await obtenerClientes();

                setClientes(lista);

            } catch {

                setClientes([]);

            }

        }

        cargarClientes();

    }, []);


    /*
     * =========================================================
     * MÉTODOS DE PAGO
     * =========================================================
     */

    const [metodosPago, setMetodosPago] = useState([]);

    useEffect(() => {

        async function cargarMetodosPago() {

            try {

                const lista = await obtenerMetodosPago();

                setMetodosPago(lista);

            } catch {

                setMetodosPago([]);

            }

        }

        cargarMetodosPago();

    }, []);


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
    
    const [montoRecibido, setMontoRecibido] = 
        useState("");

    const [tipoDescuento, setTipoDescuento] = useState("");
    const [valorDescuento, setValorDescuento] = useState("");

    const [modalVentaExitosa, setModalVentaExitosa] = 
        useState(false);

    const [ventaExitosaInfo, setVentaExitosaInfo] = 
        useState(null);

    const [comprobante, setComprobante] = useState(null);
    const [cargandoComprobante, setCargandoComprobante] = useState(false);
    const [htmlComprobante, setHtmlComprobante] = useState("");
    const [cargandoHtmlComprobante, setCargandoHtmlComprobante] = useState(false);
    
    const [modalAnular, setModalAnular] = useState(false);

    const [ventaAAnular, setVentaAAnular] = useState(null);

    const [motivoAnulacion, setMotivoAnulacion] = useState("");

    const [anulandoVenta, setAnulandoVenta] = useState(false);

    const [errorAnulacion, setErrorAnulacion] = useState("");

    const [modalCliente, setModalCliente] = 
        useState(false);

    const [datosCliente, setDatosCliente] = 
        useState(null);

    const [cargandoCliente, setCargandoCliente] = 
        useState(false);


    async function verDatosCliente() {

        if (!clienteSeleccionado) return;

        try {

            setCargandoCliente(true);

            setModalCliente(true);

            const cliente = await obtenerCliente(clienteSeleccionado);

            setDatosCliente(cliente);

        } catch (error) {

            alert(
                error.message ||
                "No fue posible cargar los datos del cliente."
            );

            setModalCliente(false);

        } finally {

            setCargandoCliente(false);

        }

    }

    async function verComprobante(idVenta) {
        try {
            setCargandoComprobante(true);
            setComprobante(await obtenerComprobante(idVenta));
        } catch (error) {
            alert(error.message || "No fue posible cargar el recibo.");
        } finally {
            setCargandoComprobante(false);
        }
    }

    function imprimirComprobante() {
        if (!comprobante) return;

        const escaparHtml = (texto) => String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        const productos = comprobante.productos.map((producto) => `
            <tr><td>${escaparHtml(producto.nombre)}</td><td>${producto.cantidad}</td><td>$${producto.precioUnitario.toLocaleString("es-CO")}</td><td>$${producto.total.toLocaleString("es-CO")}</td></tr>
        `).join("");
        const pagos = escaparHtml(comprobante.pagos.map((pago) => pago.nombre || pago.metodo).join(", "));
        const ventana = window.open("", "_blank");

        if (!ventana) {
            alert("El navegador bloqueó la ventana de impresión.");
            return;
        }

        ventana.opener = null;
        ventana.document.write(`<!doctype html><html lang="es"><head><title>Recibo ${comprobante.numeroVenta}</title><style>body{font-family:Arial,sans-serif;color:#17313a;padding:24px}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:8px;border-bottom:1px solid #dce6e8;text-align:left}h1{color:#05788a}.total{font-size:18px;font-weight:bold}</style></head><body><h1>PaperControl</h1><p><strong>Recibo:</strong> ${comprobante.numeroVenta}<br><strong>Fecha:</strong> ${new Date(comprobante.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>${productos}</tbody></table><p>Subtotal: $${comprobante.subtotal.toLocaleString("es-CO")}<br>Descuento: $${comprobante.descuento.monto.toLocaleString("es-CO")}<br>Método de pago: ${pagos}</p><p class="total">Total: $${comprobante.total.toLocaleString("es-CO")}</p></body></html>`);
        ventana.document.close();
        ventana.focus();
        ventana.print();
    }

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

     const [filtroVendedor, setFiltroVendedor] =
      useState("Todos");

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

    /* =========================================================
    ANULAR VENTA
    ========================================================= */

    function puedeAnular(venta) {

        if (puedeAdministrar()) return true;

        return venta.vendedorId === usuarioActual?.id;

    }

    function abrirModalAnular(venta) {

        setVentaAAnular(venta);

        setMotivoAnulacion("");

        setErrorAnulacion("");

        setModalAnular(true);

    }

    function cerrarModalAnular() {

        if (anulandoVenta) return;

        setModalAnular(false);

        setVentaAAnular(null);

        setMotivoAnulacion("");

        setErrorAnulacion("");

    }

    async function confirmarAnulacion(e) {

        e.preventDefault();

        const motivo = motivoAnulacion.trim();

        if (motivo && (motivo.length < 3 || motivo.length > 500)) {

            setErrorAnulacion(
                "El motivo debe tener entre 3 y 500 caracteres."
            );

            return;

        }

        try {

            setAnulandoVenta(true);

            setErrorAnulacion("");

            await eliminarVenta(
                ventaAAnular.id,
                motivo || undefined
            );

            setModalAnular(false);

            setVentaAAnular(null);

            setMotivoAnulacion("");

            await cargarProductos();

            await cargarVentas();

        } catch (error) {

            if (error?.codigo === "VENTA_YA_ANULADA") {

                setErrorAnulacion("Esta venta ya fue anulada.");

            } else if (error?.codigo === "TURNO_CAJA_CERRADO") {

                setErrorAnulacion(
                    "No se puede anular: el turno de caja de esa venta ya está cerrado."
                );

            } else if (error?.codigo === "ACCESO_DENEGADO") {

                setErrorAnulacion(
                    "No tienes permisos para anular esta venta."
                );

            } else {

                setErrorAnulacion(
                    error?.message ||
                    "No fue posible anular la venta."
                );

            }

        } finally {

            setAnulandoVenta(false);

        }

    }

    // Carga el historial de ventas
    useEffect(() => {
        
        if (!verificandoCaja) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            cargarVentas();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        verificandoCaja,
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

        const listaProductos = productos || [];

        if (!texto) {

            return listaProductos;

        }
        
        return listaProductos.filter((producto) => {

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

    /* =========================================================
     * VENDEDORES DISPONIBLES
     ========================================================= */

     const vendedoresDisponibles = useMemo(() => {

        return [
            "Todos",
            ...new Set(
                ventas
                    .map((v) => v.vendedor)
                    .filter(Boolean)
            ),
        ];

    }, [ventas]);

    const ventasFiltradas = useMemo(() => {

        if (filtroVendedor === "Todos") {

            return ventas;

        }

        return ventas.filter(
            (v) => v.vendedor === filtroVendedor
        );

    }, [ventas, filtroVendedor]);


    /*
     * =========================================================
     * MÉTODOS ACTIVOS
     * =========================================================
     */

    const metodosPagoActivos =
        useMemo(() => {

            return (metodosPago || []).filter(
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

            return (tiposTarjeta || []).filter(
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

            return (bancos || []).filter(
                (banco) =>
                    banco.activo
            );

        }, [bancos]);


    /*
     * =========================================================
     * TOTAL
     * =========================================================
     */

    const subtotal = useMemo(() => {

        return carrito.reduce(
            (acumulado, item) =>
                acumulado +
                item.precio *
                item.cantidad,
            0
        );

    }, [carrito]);

    const montoDescuentoEstimado = useMemo(() => {
        const valor = aNumeroMonto(valorDescuento);
        if (!tipoDescuento || valor <= 0) return 0;
        return tipoDescuento === "PORCENTAJE"
            ? Math.round((subtotal * valor / 100) * 100) / 100
            : valor;
    }, [subtotal, tipoDescuento, valorDescuento]);

    const total = Math.max(0, subtotal - montoDescuentoEstimado);

    function manejarValorDescuento(valor) {
        const limpio = limpiarMontoEntrada(valor);
        setValorDescuento(limpio);
    }

    async function cargarHtmlComprobante(idVenta = comprobante?.id) {
        if (!idVenta) return "";
        setCargandoHtmlComprobante(true);
        try {
            const html = await obtenerComprobanteHtml(idVenta);
            setHtmlComprobante(html);
            return html;
        } catch (error) {
            alert(error.message || "No fue posible cargar el comprobante HTML.");
            return "";
        } finally {
            setCargandoHtmlComprobante(false);
        }
    }

    async function mostrarHtmlComprobante() {
        const html = htmlComprobante || await cargarHtmlComprobante();
        if (html) setComprobante((actual) => ({ ...actual, mostrarHtml: true }));
    }

    async function imprimirHtmlComprobante() {
        const html = htmlComprobante || await cargarHtmlComprobante();
        if (!html) return;
        const ventana = window.open("", "_blank");
        if (!ventana) {
            alert("El navegador bloqueó la ventana de impresión.");
            return;
        }
        ventana.opener = null;
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        ventana.print();
    }

    async function descargarHtmlComprobante() {
        if (!comprobante?.id) return;
        try {
            const respuesta = await obtenerComprobanteHtml(comprobante.id, { descargar: true });
            const url = URL.createObjectURL(respuesta.blob);
            const enlace = document.createElement("a");
            const disposicion = respuesta.headers.get("Content-Disposition") || "";
            const nombre = disposicion.match(/filename\*?=(?:UTF-8'')?['"]?([^;"']+)/i)?.[1] || `comprobante-${comprobante.numeroVenta || comprobante.id}.html`;
            enlace.href = url;
            enlace.download = decodeURIComponent(nombre);
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
            setTimeout(() => URL.revokeObjectURL(url), 0);
        } catch (error) {
            alert(error.message || "No fue posible descargar el comprobante.");
        }
    }


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
     * CAMBIAR CANTIDAD MANUAL
     * =========================================================
     */
    function cambiarCantidadManual(id, valorTexto) {

        const producto = productos.find((p) => p.id === id);

        const stockDisponible = Number(producto?.stock || 0);

        const valor = Number(valorTexto);


        if (valorTexto === "" ) {

            return;

        }


        if (!Number.isFinite(valor) || valor < 1) {

            return;

        }


        if (valor > stockDisponible) {

            alert(
                `No hay suficiente stock de "${producto?.nombre}". Disponible: ${stockDisponible}.`
            );

            return;

        }


        setCarrito((actual) =>

            actual.map((item) =>

                item.id === id
                    ? { ...item, cantidad: valor }
                    : item

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

    async function toggleMetodoPago(metodo) {

        if (!puedeAdministrar()) {

            return;

        }

        try {

            await cambiarEstadoMetodoPago(
                metodo.id,
                !metodo.activo
            );

            setMetodosPago((actuales) =>

                actuales.map((m) =>

                    m.id === metodo.id
                        ? { ...m, activo: !m.activo }
                        : m

                )

            );

            if (metodoPago === metodo.codigo) {

                setMetodoPago("");

            }

        } catch (error) {

            alert(
                error.message ||
                "No fue posible cambiar el estado del método de pago."
            );

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

        const descuento = aNumeroMonto(valorDescuento);
        if (descuento < 0 || (tipoDescuento === "PORCENTAJE" && descuento > 100)) {
            alert("El descuento no es válido.");
            return;
        }
        if (tipoDescuento === "VALOR_FIJO" && descuento > subtotal) {
            alert("El descuento no puede superar el subtotal.");
            return;
        }
        if (tipoDescuento && subtotal - montoDescuentoEstimado <= 0) {
            alert("El descuento no puede dejar la venta en cero.");
            return;
        }


        if (!metodoPago) {

            alert(
                "Selecciona un método de pago para continuar."
            );

            return;

        }


        if (
            metodoPago === "TARJETA" &&
            !tipoTarjetaSeleccionado
        ) {

            alert(
                "Selecciona el tipo de tarjeta."
            );

            return;

        }


        if (
            metodoPago === "TARJETA" &&
            !bancoSeleccionado
        ) {

            alert(
                "Selecciona el banco de la tarjeta."
            );

            return;

        }


        if (
            metodoPago === "TRANSFERENCIA" &&
            !bancoSeleccionado
        ) {

            alert(
                "Selecciona el banco o billetera."
            );

            return;

        }

        /*
         * Validación específica de pago en efectivo:
         * el monto recibido debe existir y ser mayor
         * o igual al total.
         */

        if (metodoPago === "EFECTIVO") {

            const recibido = aNumeroMonto(montoRecibido);

            if (!montoRecibido || !Number.isFinite(recibido)) {

                alert(
                    "Ingresa el monto recibido en efectivo."
                );

                return;

            }

            if (recibido < total) {

                alert(
                    `El monto recibido ($${recibido.toLocaleString(
                        "es-CO"
                    )}) es menor al total de la venta ($${total.toLocaleString(
                        "es-CO"
                    )}).`
                );

                return;

            }

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


            const venta = await crearVentaApi({

                turnoCajaId: turnoActivo.id,

                clienteId: clienteSeleccionado || null,

                metodoPago,

                tipoTarjeta: tipoTarjetaSeleccionado || null,

                banco: bancoSeleccionado || null,
                ...(tipoDescuento
                    ? {
                        tipoDescuento,
                        valorDescuento: descuento,
                    }
                    : {}),

                montoRecibido:
                    metodoPago === "EFECTIVO"
                        ? aNumeroMonto(montoRecibido)
                        : null,

                items: carrito.map((item) => ({
                    productoId: item.id,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio,
                })),

            });

            const pagoEfectivo = (venta?.pagos || []).find(
                (pago) => pago.metodo === "EFECTIVO"
            );

            setVentaExitosaInfo({
                subtotal: venta?.subtotal ?? subtotal,
                descuento: venta?.descuento?.monto ?? venta?.montoDescuento ?? montoDescuentoEstimado,
                total: venta?.total ?? total,
                metodoPago,
                montoRecibido:
                    metodoPago === "EFECTIVO"
                        ? aNumeroMonto(montoRecibido)
                        : null,
                cambio: pagoEfectivo?.cambio ?? null,
            });

            setModalVentaExitosa(true);


            setCarrito([]);

            setClienteSeleccionado("");

            setMetodoPago("");

            setTipoTarjetaSeleccionado("");

            setBancoSeleccionado("");
            
            setMontoRecibido("");
            setTipoDescuento("");
            setValorDescuento("");

            /*
             * La venta ya se registró (201). Un fallo aquí es solo
             * de refresco de listas, no de la venta en sí — no debe
             * mostrarse como error de registro.
             */
            
            try{

                await cargarProductos();

                await cargarVentas();


        } catch {

                // El catálogo/historial podría quedar desactualizado
                // hasta la próxima recarga manual, pero la venta
                // ya quedó registrada correctamente.

            }
        
        } catch (error) {

                if (
                    error?.status === 409 &&
                    error?.codigo === "STOCK_INSUFICIENTE"
                ) {

                    const detalles = error?.detalles || {};

                    const producto = productos.find(
                        (p) => p.id === detalles.productoId
                    );

                    alert(
                        `No hay stock suficiente de "${
                            producto?.nombre || "un producto"
                        }". Disponible: ${detalles.disponible ?? "desconocido"}. Ajusta la cantidad e intenta de nuevo.`
                    );

                    // El carrito se conserva a propósito para que el
                    // usuario pueda corregir la cantidad sin perder
                    // el resto de la selección.

                    await cargarProductos();

                } else {

                alert(
                    error.message ||
                    "No fue posible registrar la venta."
                );

            }

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
                        value: metodo.codigo,
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

            {!turnoActivo ? (

                <div className="caja-apertura-card">
                    <i className="fa-solid fa-lock"></i>
                    <h2>Caja cerrada</h2>
                    <p>
                        Debes abrir la caja antes de poder
                        registrar nuevas ventas. Puedes seguir
                        consultando el historial más abajo.
                    </p>
                    <button
                        type="button"
                        className="auth-button"
                        onClick={() => navigate("/caja")}
                    >
                        Ir a Caja
                    </button>
                </div>

            ) : (

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

                        {clienteSeleccionado && (

                            <button
                                type="button"
                                className="btn-ver-cliente"
                                onClick={verDatosCliente}
                            >
                                <i className="fa-solid fa-id-card"></i>
                                Ver datos del cliente
                            </button>

                        )}

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

                                            <input
                                                type="number"
                                                min="1"
                                                className="pos-cantidad-input"
                                                value={item.cantidad}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                                onChange={(e) =>
                                                    cambiarCantidadManual(
                                                        item.id,
                                                        e.target.value
                                                    )
                                                }
                                            />


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

                        <div className="pos-descuento-panel">
                            <label htmlFor="tipoDescuento">Descuento</label>
                            <select id="tipoDescuento" value={tipoDescuento} onChange={(e) => { setTipoDescuento(e.target.value); setValorDescuento(""); }}>
                                <option value="">Sin descuento</option>
                                <option value="PORCENTAJE">Porcentaje</option>
                                <option value="VALOR_FIJO">Valor fijo</option>
                            </select>
                            {tipoDescuento && (
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatearMontoEntrada(valorDescuento)}
                                    onChange={(e) => manejarValorDescuento(e.target.value)}
                                    placeholder={tipoDescuento === "PORCENTAJE" ? "Ej: 10" : "Ej: 5000"}
                                />
                            )}
                            <div className="pos-descuento-resumen">
                                <span>Subtotal: ${subtotal.toLocaleString("es-CO")}</span>
                                <span>Descuento: -${montoDescuentoEstimado.toLocaleString("es-CO")}</span>
                                <strong>Total estimado: ${total.toLocaleString("es-CO")}</strong>
                            </div>
                        </div>


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
                            MONTO RECIBIDO (EFECTIVO)
                        ================================================= */}

                        {metodoPago === "EFECTIVO" && (

                            <div className="pos-bancos-selector">

                                <label>
                                    Monto recibido
                                </label>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder={`Mínimo $${total.toLocaleString("es-CO")}`}
                                    value={formatearMontoEntrada(montoRecibido)}
                                    onChange={(e) =>
                                        setMontoRecibido(limpiarMontoEntrada(e.target.value))
                                    }
                                    className="pos-monto-recibido-input"
                                />

                                {montoRecibido &&
                                    aNumeroMonto(montoRecibido) >= total && (

                                        <small className="pos-cambio-estimado">
                                            Cambio estimado: $
                                            {(
                                                aNumeroMonto(montoRecibido) - total
                                            ).toLocaleString("es-CO")}
                                        </small>

                                    )}

                            </div>

                        )}

                        {/* =================================================
                            TIPO DE TARJETA
                        ================================================= */}

                        {metodoPago === "TARJETA" && (

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

                        {(metodoPago === "TARJETA" ||
                            metodoPago === "TRANSFERENCIA") && (

                            <div className="pos-bancos-selector">

                                <label>

                                    {metodoPago === "TARJETA"
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

            )}

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

                    {puedeAdministrar() && (

                        <div className="historial-filtro">

                            <label htmlFor="filtroVendedor">
                                Vendedor
                            </label>

                            <select
                                id="filtroVendedor"
                                value={filtroVendedor}
                                onChange={(e) =>
                                    setFiltroVendedor(e.target.value)
                                }
                            >

                                {vendedoresDisponibles.map((nombre) => (
                                    <option key={nombre} value={nombre}>
                                        {nombre}
                                    </option>
                                ))}

                            </select>

                        </div>

                    )}

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

                    ) : ventasFiltradas.length === 0 ? (

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
                                        <th></th>
                                    </tr>

                                </thead>


                                <tbody>

                                    {ventasFiltradas.map((venta) => (

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
                                                        timeZone: "America/Bogota",
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

                                            {/* ANULAR */}

                                            <td>

                                                <div className="historial-acciones">
                                                    <button
                                                        type="button"
                                                        className="btn-ver-recibo"
                                                        title="Ver recibo"
                                                        onClick={() => verComprobante(venta.id)}
                                                    >
                                                        <i className="fa-solid fa-receipt"></i>
                                                    </button>

                                                    {String(
                                                        venta.estado || ""
                                                    ).toUpperCase() !==
                                                        "ANULADA" &&
                                                        puedeAnular(venta) && (

                                                        <button
                                                            type="button"
                                                            className="caja-gasto-eliminar"
                                                            title="Anular venta"
                                                            onClick={() =>
                                                                abrirModalAnular(
                                                                    venta
                                                                )
                                                            }
                                                        >
                                                            <i className="fa-solid fa-ban"></i>
                                                        </button>

                                                    )}
                                                </div>

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </section>

                        {modalAnular && ventaAAnular && (

                <div
                    className="pos-modal-overlay"
                    onMouseDown={(e) => {

                        if (e.target === e.currentTarget) {

                            cerrarModalAnular();

                        }

                    }}
                >

                    <div className="pos-modal">

                        <div className="pos-modal-header">

                            <div>
                                <h2>Anular venta</h2>
                                <p>
                                    Venta {ventaAAnular.numero_venta}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="pos-modal-cerrar"
                                onClick={cerrarModalAnular}
                                disabled={anulandoVenta}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                        </div>

                        <form onSubmit={confirmarAnulacion}>

                            <div className="config-pagos-body">

                                {errorAnulacion && (
                                    <div
                                        className="caja-error"
                                        style={{ marginBottom: "14px" }}
                                    >
                                        {errorAnulacion}
                                    </div>
                                )}

                                <label style={{ fontSize: "13px", fontWeight: 600 }}>
                                    Motivo (opcional)
                                </label>

                                <textarea
                                    className="pos-monto-recibido-input"
                                    style={{ minHeight: "80px", marginTop: "6px" }}
                                    value={motivoAnulacion}
                                    onChange={(e) =>
                                        setMotivoAnulacion(e.target.value)
                                    }
                                    maxLength={500}
                                    placeholder="Ej: Producto equivocado, cliente se arrepintió, etc."
                                    disabled={anulandoVenta}
                                />

                            </div>

                            <div className="pos-modal-footer">

                                <button
                                    type="button"
                                    className="btn-cancelar-cierre"
                                    onClick={cerrarModalAnular}
                                    disabled={anulandoVenta}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="btn-cerrar-pos-modal"
                                    disabled={anulandoVenta}
                                >

                                    {anulandoVenta
                                        ? "Anulando..."
                                        : "Confirmar anulación"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {cargandoComprobante && (
                <div className="pos-modal-overlay">
                    <div className="pos-modal"><div className="config-pagos-body">Cargando recibo...</div></div>
                </div>
            )}

            {comprobante && (
                <div className="pos-modal-overlay" onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setComprobante(null);
                }}>
                    <div className="pos-modal recibo-modal">
                        <div className="pos-modal-header">
                            <div>
                                <h2>Recibo {comprobante.numeroVenta}</h2>
                                <p>{new Date(comprobante.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>
                            </div>
                            <button type="button" className="pos-modal-cerrar" onClick={() => setComprobante(null)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div className="config-pagos-body recibo-contenido">
                            <p><strong>Cliente:</strong> {comprobante.cliente?.nombre || "Venta sin cliente"}</p>
                            {comprobante.estado === "ANULADA" && <p className="caja-error"><strong>Venta anulada:</strong> {comprobante.motivoAnulacion || "Sin motivo registrado."}</p>}
                            <div className="recibo-tabla"><table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>
                                {comprobante.productos.map((producto) => <tr key={producto.productoId}><td>{producto.nombre}</td><td>{producto.cantidad}</td><td>${producto.precioUnitario.toLocaleString("es-CO")}</td><td>${producto.total.toLocaleString("es-CO")}</td></tr>)}
                            </tbody></table></div>
                            <div className="recibo-totales">
                                <p>Subtotal <strong>${comprobante.subtotal.toLocaleString("es-CO")}</strong></p>
                                <p>Descuento <strong>-${comprobante.descuento.monto.toLocaleString("es-CO")}</strong></p>
                                <p>Método de pago <strong>{comprobante.pagos.map((pago) => pago.nombre || pago.metodo).join(", ")}</strong></p>
                                <p className="recibo-total">Total <strong>${comprobante.total.toLocaleString("es-CO")}</strong></p>
                            </div>
                        </div>
                        <div className="pos-modal-footer"><button type="button" className="btn-cerrar-pos-modal" onClick={imprimirComprobante}><i className="fa-solid fa-print"></i> Imprimir</button><button type="button" className="btn-cerrar-pos-modal" onClick={mostrarHtmlComprobante} disabled={cargandoHtmlComprobante}>{cargandoHtmlComprobante ? "Cargando..." : "Ver HTML"}</button><button type="button" className="btn-cerrar-pos-modal" onClick={imprimirHtmlComprobante} disabled={cargandoHtmlComprobante}>Imprimir HTML</button><button type="button" className="btn-cerrar-pos-modal" onClick={descargarHtmlComprobante}>Descargar HTML</button></div>
                    </div>
                </div>
            )}

            {comprobante?.mostrarHtml && htmlComprobante && (
                <div className="pos-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setComprobante((actual) => ({ ...actual, mostrarHtml: false })); }}>
                    <div className="pos-modal recibo-html-modal">
                        <div className="pos-modal-header"><h2>Comprobante HTML</h2><button type="button" className="pos-modal-cerrar" onClick={() => setComprobante((actual) => ({ ...actual, mostrarHtml: false }))}><i className="fa-solid fa-xmark"></i></button></div>
                        <iframe title="Comprobante HTML" className="recibo-html-frame" srcDoc={htmlComprobante}></iframe>
                    </div>
                </div>
            )}

            {modalVentaExitosa && ventaExitosaInfo && (

                <div
                    className="pos-modal-overlay"
                    onMouseDown={(e) => {

                        if (e.target === e.currentTarget) {

                            setModalVentaExitosa(false);

                        }

                    }}
                >

                    <div className="pos-modal">

                        <div className="pos-modal-header">

                            <div>
                                <h2>Venta registrada</h2>
                            </div>

                            <button
                                type="button"
                                className="pos-modal-cerrar"
                                onClick={() => setModalVentaExitosa(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                        </div>

                        <div className="config-pagos-body">

                            <div className="datos-cliente-detalle">

                                <p>
                                    <strong>Subtotal:</strong> $
                                    {(ventaExitosaInfo.subtotal ?? 0).toLocaleString("es-CO")}
                                </p>

                                <p>
                                    <strong>Descuento:</strong> -$
                                    {(ventaExitosaInfo.descuento ?? 0).toLocaleString("es-CO")}
                                </p>

                                <p>
                                    <strong>Total:</strong> $
                                    {ventaExitosaInfo.total.toLocaleString("es-CO")}
                                </p>

                                {ventaExitosaInfo.metodoPago === "EFECTIVO" && (

                                    <>

                                        <p>
                                            <strong>Monto recibido:</strong> $
                                            {ventaExitosaInfo.montoRecibido?.toLocaleString("es-CO")}
                                        </p>

                                        <p className="pos-cambio-destacado">
                                            <strong>Cambio a entregar:</strong> $
                                            {(
                                                ventaExitosaInfo.cambio ??
                                                ventaExitosaInfo.montoRecibido - ventaExitosaInfo.total
                                            ).toLocaleString("es-CO")}
                                        </p>

                                    </>

                                )}

                            </div>

                        </div>

                        <div className="pos-modal-footer">

                            <button
                                type="button"
                                className="btn-cerrar-pos-modal"
                                onClick={() => setModalVentaExitosa(false)}
                            >
                                Entendido
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {modalCliente && (

                <div
                    className="pos-modal-overlay"
                    onMouseDown={(e) => {

                        if (e.target === e.currentTarget) {

                            setModalCliente(false);

                            setDatosCliente(null);

                        }

                    }}
                >

                    <div className="pos-modal">

                        <div className="pos-modal-header">

                            <div>
                                <h2>Datos del cliente</h2>
                            </div>

                            <button
                                type="button"
                                className="pos-modal-cerrar"
                                onClick={() => {

                                    setModalCliente(false);

                                    setDatosCliente(null);

                                }}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                        </div>

                        <div className="config-pagos-body">

                            {cargandoCliente ? (

                                <p>Cargando...</p>

                            ) : datosCliente ? (

                                <div className="datos-cliente-detalle">

                                    <p><strong>Nombre:</strong> {datosCliente.nombres} {datosCliente.apellidos}</p>
                                    {rolActual !== "VENDEDOR" && (
                                        <p><strong>Documento:</strong> {datosCliente.tipoDocumento} {datosCliente.documento}</p>
                                    )}
                                    <p><strong>Teléfono:</strong> {datosCliente.telefono || "—"}</p>
                                    <p><strong>Correo:</strong> {datosCliente.correo || "—"}</p>
                                    <p><strong>Dirección:</strong> {datosCliente.direccion || "—"}</p>
                                    <p><strong>Estado:</strong> {datosCliente.estaActivo ? "Activo" : "Inactivo"}</p>

                                </div>

                            ) : (

                                <p>No fue posible cargar los datos.</p>

                            )}

                        </div>

                    </div>

                </div>

            )}
            
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
                                                        metodo
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
