import { useMemo, useState, useEffect } from "react";

import Layout from "../components/Layout";

import "../styles/Dashboard.css";
import "../styles/Clientes.css";
import "../styles/Caja.css";

import {
    obtenerClientes,
    crearCliente,
    actualizarCliente,
    cambiarEstadoCliente,
    eliminarCliente as eliminarClienteApi,
} from "../services/clientes.service";

function Clientes() {
    const usuarioActual = JSON.parse(
        localStorage.getItem("usuario")
    );

    const rolActual = usuarioActual?.rol || "";

    const [clientes, setClientes] = useState([]);

    const [cargandoClientes, setCargandoClientes] = useState(true);

    const [errorClientes, setErrorClientes] = useState("");


    async function cargarClientes() {

        try {

            setErrorClientes("");

            const lista = await obtenerClientes();

            setClientes(lista);

        } catch (error) {

            setErrorClientes(
                error.message ||
                "No fue posible cargar los clientes."
            );

        } finally {

            setCargandoClientes(false);

        }

    }

    useEffect(() => {

        cargarClientes();

    }, []);

    const [busqueda, setBusqueda] = useState("");

    const [mostrarFrecuentes, setMostrarFrecuentes] =
        useState(false);

    const [clienteSeleccionado, setClienteSeleccionado] =
        useState(null);

    /* ESTADO DEL FORMULARIO (crear / editar) */

    const [modalNuevoCliente, setModalNuevoCliente] =
        useState(false);

    const [clienteEditando, setClienteEditando] =
        useState(null);

    const [formulario, setFormulario] = useState({
        nombres: "",
        apellidos: "",
        documento: "",
        telefono: "",
        correo: "",
    });

    const [erroresFormulario, setErroresFormulario] =
        useState({});

    const [guardando, setGuardando] = useState(false);

    /*
     * NORMALIZAR TEXTO
     *
     * Permite buscar sin tildes:
     *
     * "gomez"      -> encuentra "Gómez"
     * "martinez"   -> encuentra "Martínez"
     * "rodriguez"  -> encuentra "Rodríguez"
     * "andres"     -> encuentra "Andrés"
     * "lopez"      -> encuentra "López"
     * "sofia"      -> encuentra "Sofía"
     * "hernandez"  -> encuentra "Hernández"
     *
     * También mantiene la búsqueda sin importar
     * mayúsculas o minúsculas.
     */
    function normalizarTexto(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    const clientesActivos = useMemo(() => {
        return clientes.filter(
            (cliente) =>
                cliente.estaActivo === true
        );
    }, [clientes]);

    const clientesInactivos = useMemo(() => {
        return clientes.filter(
            (cliente) =>
                cliente.estaActivo === false
        );
    }, [clientes]);

    const clientesFrecuentes = useMemo(() => {
        return clientes.filter(
            (cliente) =>
                cliente.esFrecuente === true &&
                cliente.estaActivo === true
        );
    }, [clientes]);

    function filtrarClientes(lista) {
        const texto = normalizarTexto(busqueda);

        if (!texto) {
            return lista;
        }

        return lista.filter((cliente) => {
            const nombreCompleto = normalizarTexto(
                `${cliente.nombres} ${cliente.apellidos}`
            );

            const documento = normalizarTexto(
                cliente.documento
            );

            const telefono = normalizarTexto(
                cliente.telefono
            );

            const correo = normalizarTexto(
                cliente.correo
            );

            return (
                nombreCompleto.includes(texto) ||
                documento.includes(texto) ||
                telefono.includes(texto) ||
                correo.includes(texto)
            );
        });
    }

    const activosFiltrados =
        filtrarClientes(clientesActivos);

    const inactivosFiltrados =
        filtrarClientes(clientesInactivos);

    const frecuentesFiltrados =
        filtrarClientes(clientesFrecuentes);

    function abrirDetalle(cliente) {
        setClienteSeleccionado(cliente);
    }

    function cerrarDetalle() {
        setClienteSeleccionado(null);
    }

    function puedeAdministrar() {
        return (
            rolActual === "ADMINISTRADOR" ||
            rolActual === "DUENO"
        );
    }

    /* ABRIR / CERRAR MODAL DE CREAR */

    function abrirNuevoCliente() {
        if (!puedeAdministrar()) {
            return;
        }

        setErroresFormulario({});

        setClienteEditando(null);

        setFormulario({
            nombres: "",
            apellidos: "",
            documento: "",
            telefono: "",
            correo: "",
        });

        setModalNuevoCliente(true);
    }

    function cerrarNuevoCliente() {
        if (guardando) {
            return;
        }

        setModalNuevoCliente(false);
    }

    /* ABRIR / CERRAR MODAL DE EDITAR */

    function abrirEditarCliente(cliente) {
        if (!puedeAdministrar()) {
            return;
        }

        setErroresFormulario({});

        setModalNuevoCliente(false);

        setClienteEditando(cliente);

        setFormulario({
            nombres: cliente.nombres || "",
            apellidos: cliente.apellidos || "",
            documento: cliente.documento || "",
            telefono: cliente.telefono || "",
            correo: cliente.correo || "",
        });
    }

    function cerrarEditarCliente() {
        if (guardando) {
            return;
        }

        setClienteEditando(null);
    }

    function manejarCambioFormulario(e) {
        const { name, value } = e.target;

        setFormulario((formularioActual) => ({
            ...formularioActual,
            [name]: value,
        }));

        if (erroresFormulario[name]) {
            setErroresFormulario((actuales) => ({
                ...actuales,
                [name]: null,
            }));
        }
    }

    function validarFormulario() {
        const nuevosErrores = {};

        if (!formulario.nombres.trim()) {
            nuevosErrores.nombres =
                "El nombre es obligatorio.";
        }

        if (!formulario.apellidos.trim()) {
            nuevosErrores.apellidos =
                "El apellido es obligatorio.";
        }

        if (!formulario.documento.trim()) {
            nuevosErrores.documento =
                "El documento es obligatorio.";
        } else if (
            !/^\d{6,15}$/.test(
                formulario.documento.trim()
            )
        ) {
            nuevosErrores.documento =
                "El documento debe tener entre 6 y 15 dígitos.";
        }

        if (!formulario.telefono.trim()) {
            nuevosErrores.telefono =
                "El teléfono es obligatorio.";
        } else if (
            !/^\d{7,10}$/.test(
                formulario.telefono.trim()
            )
        ) {
            nuevosErrores.telefono =
                "El teléfono debe tener entre 7 y 10 dígitos.";
        }

        if (!formulario.correo.trim()) {
            nuevosErrores.correo =
                "El correo es obligatorio.";
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formulario.correo.trim()
            )
        ) {
            nuevosErrores.correo =
                "El correo no es válido.";
        }

        setErroresFormulario(nuevosErrores);

        return (
            Object.keys(nuevosErrores).length === 0
        );
    }

    async function guardarNuevoCliente(e) {
        e.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        try {
            setGuardando(true);

            await crearCliente({
                nombres: formulario.nombres.trim(),
                apellidos: formulario.apellidos.trim(),
                documento: formulario.documento.trim(),
                telefono: formulario.telefono.trim(),
                correo: formulario.correo.trim(),
            });

            await cargarClientes();

            setModalNuevoCliente(false);
        } catch (error) {

            setErroresFormulario({
                general:
                    error.message ||
                    "No fue posible crear el cliente.",
            });
        } finally {
            setGuardando(false);
        }
    }

    async function guardarCambiosCliente(e) {
        e.preventDefault();

        if (!clienteEditando) {
            return;
        }

        if (!validarFormulario()) {
            return;
        }

        try {
            setGuardando(true);

            await actualizarCliente(clienteEditando.id, {
                nombres: formulario.nombres.trim(),
                apellidos: formulario.apellidos.trim(),
                telefono: formulario.telefono.trim(),
                correo: formulario.correo.trim(),
            });

            await cargarClientes();

            setClienteEditando(null);
        } catch (error) {
            console.error(
                "Error actualizando cliente:",
                error
            );

            setErroresFormulario({
                general:
                    error.message ||
                    "No fue posible actualizar el cliente.",
            });
        } finally {
            setGuardando(false);
        }
    }

    async function desactivarCliente(id) {
        if (!puedeAdministrar()) {
            return;
        }

        const confirmar = window.confirm(
            "¿Seguro que deseas desactivar este cliente?"
        );

        if (!confirmar) {
            return;
        }

        try {

            await cambiarEstadoCliente(id, false);

            await cargarClientes();

        } catch (error) {

            alert(
                error.message ||
                "No fue posible desactivar el cliente."
            );

        }
    }

    async function activarCliente(id) {
        if (!puedeAdministrar()) {
            return;
        }

        try {

            await cambiarEstadoCliente(id, true);

            await cargarClientes();

        } catch (error) {

            alert(
                error.message ||
                "No fue posible activar el cliente."
            );

        }
    }

    async function eliminarCliente(id) {
        if (!puedeAdministrar()) {
            return;
        }

        const confirmar = window.confirm(
            "¿Seguro que deseas eliminar este cliente?"
        );

        if (!confirmar) {
            return;
        }

        try {

            await eliminarClienteApi(id);

            await cargarClientes();

        } catch (error) {

            alert(
                error.message ||
                "No fue posible eliminar el cliente."
            );

        }
    }

    function renderTablaClientes(
        lista,
        tipo
    ) {
        if (lista.length === 0) {
            return (
                <div className="clientes-vacio">
                    <i className="fa-solid fa-users-slash"></i>

                    <p>
                        {tipo === "activos"
                            ? "No hay clientes activos."
                            : "No hay clientes inactivos."}
                    </p>
                </div>
            );
        }

        return (
            <div className="tabla-clientes-container">
                <table className="tabla-clientes">
                    <thead>
                        <tr>
                            <th>
                                Cliente
                            </th>

                            <th>
                                Documento
                            </th>

                            <th>
                                Teléfono
                            </th>

                            <th>
                                Correo
                            </th>

                            <th>
                                Estado
                            </th>

                            <th>
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {lista.map((cliente) => (
                            <tr key={cliente.id}>
                                <td>
                                    <div className="cliente-nombre">
                                        <div className="cliente-avatar">
                                            {cliente.nombres
                                                ?.charAt(0)
                                                ?.toUpperCase()}
                                        </div>

                                        <div>
                                            <strong>
                                                {cliente.nombres}{" "}
                                                {cliente.apellidos}
                                            </strong>

                                            {cliente.esFrecuente &&
                                                cliente.estaActivo && (
                                                    <span className="cliente-frecuente-mini">
                                                        <i className="fa-solid fa-star"></i>

                                                        Frecuente
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                </td>

                                <td>
                                    {cliente.documento}
                                </td>

                                <td>
                                    {cliente.telefono}
                                </td>

                                <td>
                                    {cliente.correo}
                                </td>

                                <td>
                                    <span
                                        className={
                                            cliente.estaActivo
                                                ? "estado-activo"
                                                : "estado-inactivo"
                                        }
                                    >
                                        {cliente.estaActivo
                                            ? "Activo"
                                            : "Inactivo"}
                                    </span>
                                </td>

                                <td>
                                    <div className="acciones-cliente">
                                        <button
                                            type="button"
                                            className="btn-ver-cliente"
                                            title="Ver cliente"
                                            onClick={() =>
                                                abrirDetalle(
                                                    cliente
                                                )
                                            }
                                        >
                                            <i className="fa-solid fa-eye"></i>
                                        </button>

                                        {puedeAdministrar() && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn-editar-cliente"
                                                    title="Editar cliente"
                                                    onClick={() =>
                                                        abrirEditarCliente(
                                                            cliente
                                                        )
                                                    }
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>

                                                {cliente.estaActivo ? (
                                                    <button
                                                        type="button"
                                                        className="btn-desactivar-cliente"
                                                        title="Desactivar cliente"
                                                        onClick={() =>
                                                            desactivarCliente(
                                                                cliente.id
                                                            )
                                                        }
                                                    >
                                                        <i className="fa-solid fa-user-slash"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-activar-cliente"
                                                        title="Activar cliente"
                                                        onClick={() =>
                                                            activarCliente(
                                                                cliente.id
                                                            )
                                                        }
                                                    >
                                                        <i className="fa-solid fa-user-check"></i>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn-eliminar-cliente"
                                                    title="Eliminar cliente"
                                                    onClick={() =>
                                                        eliminarCliente(
                                                            cliente.id
                                                        )
                                                    }
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    const modalFormularioAbierto =
        modalNuevoCliente ||
        clienteEditando;

    if (cargandoClientes) {

        return (
            <Layout>
                <div className="caja-cargando">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <p>Cargando clientes...</p>
                </div>
            </Layout>
        );

    }

    return (
        <Layout>

            {errorClientes && (
                <div className="caja-error">{errorClientes}</div>
            )}
            <div className="clientes-header">
                <div>
                    <h1>
                        Clientes
                    </h1>

                    <p className="dashboard-subtitle">
                        Gestiona y consulta los clientes de PaperControl.
                    </p>
                </div>

                {puedeAdministrar() && (
                    <button
                        type="button"
                        className="btn-nuevo-cliente"
                        onClick={
                            abrirNuevoCliente
                        }
                    >
                        <i className="fa-solid fa-user-plus"></i>

                        Nuevo cliente
                    </button>
                )}
            </div>

            <div className="clientes-info">
                <div className="card-cliente-estadistica">
                    <div className="cliente-estadistica-icono">
                        <i className="fa-solid fa-users"></i>
                    </div>

                    <div>
                        <h3>
                            {clientes.length}
                        </h3>

                        <p>
                            Total clientes
                        </p>
                    </div>
                </div>

                <div className="card-cliente-estadistica">
                    <div className="cliente-estadistica-icono activo">
                        <i className="fa-solid fa-user-check"></i>
                    </div>

                    <div>
                        <h3>
                            {clientesActivos.length}
                        </h3>

                        <p>
                            Clientes activos
                        </p>
                    </div>
                </div>

                <div className="card-cliente-estadistica">
                    <div className="cliente-estadistica-icono inactivo">
                        <i className="fa-solid fa-user-slash"></i>
                    </div>

                    <div>
                        <h3>
                            {clientesInactivos.length}
                        </h3>

                        <p>
                            Clientes inactivos
                        </p>
                    </div>
                </div>

                <div className="card-cliente-estadistica">
                    <div className="cliente-estadistica-icono frecuente">
                        <i className="fa-solid fa-star"></i>
                    </div>

                    <div>
                        <h3>
                            {clientesFrecuentes.length}
                        </h3>

                        <p>
                            Clientes frecuentes
                        </p>
                    </div>
                </div>
            </div>

            <div className="clientes-busqueda">
                <div className="clientes-buscador">
                    <i className="fa-solid fa-magnifying-glass"></i>

                    <input
                        type="text"
                        placeholder="Buscar por nombre, documento, teléfono o correo..."
                        value={busqueda}
                        onChange={(e) =>
                            setBusqueda(
                                e.target.value
                            )
                        }
                    />

                    {busqueda && (
                        <button
                            type="button"
                            onClick={() =>
                                setBusqueda("")
                            }
                            title="Limpiar búsqueda"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </div>
            </div>

            <section className="clientes-seccion">
                <div className="clientes-seccion-header">
                    <div>
                        <h2>
                            <span className="titulo-activos">
                                <i className="fa-solid fa-circle"></i>

                                Clientes activos
                            </span>
                        </h2>

                        <p>
                            Clientes que pueden realizar operaciones en el sistema.
                        </p>
                    </div>

                    <span className="contador-clientes activo">
                        {activosFiltrados.length}
                    </span>
                </div>

                {renderTablaClientes(
                    activosFiltrados,
                    "activos"
                )}
            </section>

            <section className="clientes-seccion clientes-seccion-inactivos">
                <div className="clientes-seccion-header">
                    <div>
                        <h2>
                            <span className="titulo-inactivos">
                                <i className="fa-solid fa-circle"></i>

                                Clientes inactivos
                            </span>
                        </h2>

                        <p>
                            Clientes que actualmente no están activos.
                        </p>
                    </div>

                    <span className="contador-clientes inactivo">
                        {inactivosFiltrados.length}
                    </span>
                </div>

                {renderTablaClientes(
                    inactivosFiltrados,
                    "inactivos"
                )}
            </section>

            <section className="clientes-frecuentes">
                <div className="clientes-frecuentes-header">
                    <div>
                        <h2>
                            <i className="fa-solid fa-star"></i>

                            Clientes frecuentes
                        </h2>

                        <p>
                            Clientes que posteriormente serán identificados
                            automáticamente a partir de las ventas.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-ver-frecuentes"
                        onClick={() =>
                            setMostrarFrecuentes(
                                !mostrarFrecuentes
                            )
                        }
                    >
                        {mostrarFrecuentes
                            ? "Ocultar"
                            : "Ver clientes"}

                        <i
                            className={
                                mostrarFrecuentes
                                    ? "fa-solid fa-chevron-up"
                                    : "fa-solid fa-chevron-down"
                            }
                        ></i>
                    </button>
                </div>

                {mostrarFrecuentes && (
                    <div className="frecuentes-lista">
                        {frecuentesFiltrados.length === 0 ? (
                            <div className="frecuentes-vacio">
                                <i className="fa-solid fa-star"></i>

                                <p>
                                    No hay clientes frecuentes registrados.
                                </p>
                            </div>
                        ) : (
                            frecuentesFiltrados.map(
                                (cliente) => (
                                    <div
                                        className="frecuente-card"
                                        key={cliente.id}
                                    >
                                        <div className="cliente-avatar frecuente-avatar">
                                            {cliente.nombres
                                                ?.charAt(0)
                                                ?.toUpperCase()}
                                        </div>

                                        <div className="frecuente-datos">
                                            <strong>
                                                {cliente.nombres}{" "}
                                                {cliente.apellidos}
                                            </strong>

                                            <span>
                                                {cliente.correo}
                                            </span>
                                        </div>

                                        <div className="frecuente-icono">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                    </div>
                                )
                            )
                        )}
                    </div>
                )}
            </section>

            {/* MODAL VER DETALLE */}

            {clienteSeleccionado && (
                <div
                    className="cliente-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            cerrarDetalle();
                        }
                    }}
                >
                    <div className="cliente-modal">
                        <div className="cliente-modal-header">
                            <div>
                                <h2>
                                    Información del cliente
                                </h2>

                                <p>
                                    Datos registrados en PaperControl.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="cliente-modal-cerrar"
                                onClick={
                                    cerrarDetalle
                                }
                                title="Cerrar"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="cliente-detalle">
                            <div className="cliente-detalle-avatar">
                                {clienteSeleccionado.nombres
                                    ?.charAt(0)
                                    ?.toUpperCase()}
                            </div>

                            <h3>
                                {
                                    clienteSeleccionado.nombres
                                }{" "}
                                {
                                    clienteSeleccionado.apellidos
                                }
                            </h3>

                            <div className="cliente-detalle-badges">
                                <span
                                    className={
                                        clienteSeleccionado.estaActivo
                                            ? "estado-activo"
                                            : "estado-inactivo"
                                    }
                                >
                                    {clienteSeleccionado.estaActivo
                                        ? "Activo"
                                        : "Inactivo"}
                                </span>

                                <span
                                    className={
                                        clienteSeleccionado.esFrecuente
                                            ? "badge-frecuente"
                                            : "badge-regular"
                                    }
                                >
                                    <i
                                        className={
                                            clienteSeleccionado.esFrecuente
                                                ? "fa-solid fa-star"
                                                : "fa-regular fa-user"
                                        }
                                    ></i>

                                    {clienteSeleccionado.esFrecuente
                                        ? "Cliente frecuente"
                                        : "Cliente regular"}
                                </span>
                            </div>

                            <div className="cliente-detalle-datos">
                                <div>
                                    <span>
                                        Documento
                                    </span>

                                    <strong>
                                        {
                                            clienteSeleccionado.documento
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Teléfono
                                    </span>

                                    <strong>
                                        {
                                            clienteSeleccionado.telefono
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Correo
                                    </span>

                                    <strong>
                                        {
                                            clienteSeleccionado.correo
                                        }
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div className="cliente-modal-footer">
                            <button
                                type="button"
                                className="btn-cerrar-cliente"
                                onClick={
                                    cerrarDetalle
                                }
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR */}

            {modalFormularioAbierto && (
                <div
                    className="cliente-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                                e.currentTarget &&
                            !guardando
                        ) {
                            if (
                                modalNuevoCliente
                            ) {
                                cerrarNuevoCliente();
                            } else {
                                cerrarEditarCliente();
                            }
                        }
                    }}
                >
                    <div className="cliente-modal">
                        <div className="cliente-modal-header">
                            <div>
                                <h2>
                                    {modalNuevoCliente
                                        ? "Nuevo cliente"
                                        : "Editar cliente"}
                                </h2>

                                <p>
                                    {modalNuevoCliente
                                        ? "Registra un nuevo cliente en PaperControl."
                                        : "Actualiza los datos del cliente."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="cliente-modal-cerrar"
                                onClick={
                                    modalNuevoCliente
                                        ? cerrarNuevoCliente
                                        : cerrarEditarCliente
                                }
                                disabled={guardando}
                                title="Cerrar"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form
                            className="formulario-cliente"
                            onSubmit={
                                modalNuevoCliente
                                    ? guardarNuevoCliente
                                    : guardarCambiosCliente
                            }
                            noValidate
                        >
                            {erroresFormulario.general && (
                                <div className="campo-error campo-error-general">
                                    {
                                        erroresFormulario.general
                                    }
                                </div>
                            )}

                            <div className="formulario-cliente-grid">
                                <div className="campo-formulario">
                                    <label htmlFor="cliente-nombres">
                                        Nombres
                                    </label>

                                    <input
                                        id="cliente-nombres"
                                        name="nombres"
                                        type="text"
                                        value={
                                            formulario.nombres
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        disabled={
                                            guardando
                                        }
                                        placeholder="Ej. Laura"
                                        maxLength="80"
                                    />

                                    {erroresFormulario.nombres && (
                                        <span className="campo-error">
                                            {
                                                erroresFormulario.nombres
                                            }
                                        </span>
                                    )}
                                </div>

                                <div className="campo-formulario">
                                    <label htmlFor="cliente-apellidos">
                                        Apellidos
                                    </label>

                                    <input
                                        id="cliente-apellidos"
                                        name="apellidos"
                                        type="text"
                                        value={
                                            formulario.apellidos
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        disabled={
                                            guardando
                                        }
                                        placeholder="Ej. Gómez"
                                        maxLength="80"
                                    />

                                    {erroresFormulario.apellidos && (
                                        <span className="campo-error">
                                            {
                                                erroresFormulario.apellidos
                                            }
                                        </span>
                                    )}
                                </div>

                                <div className="campo-formulario">
                                    <label htmlFor="cliente-documento">
                                        Documento
                                    </label>

                                    <input
                                        id="cliente-documento"
                                        name="documento"
                                        type="text"
                                        inputMode="numeric"
                                        value={
                                            formulario.documento
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        disabled={
                                            guardando ||
                                            Boolean(
                                                clienteEditando
                                            )
                                        }
                                        placeholder="Ej. 1001234567"
                                    />

                                    {erroresFormulario.documento && (
                                        <span className="campo-error">
                                            {
                                                erroresFormulario.documento
                                            }
                                        </span>
                                    )}
                                </div>

                                <div className="campo-formulario">
                                    <label htmlFor="cliente-telefono">
                                        Teléfono
                                    </label>

                                    <input
                                        id="cliente-telefono"
                                        name="telefono"
                                        type="text"
                                        inputMode="numeric"
                                        value={
                                            formulario.telefono
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        disabled={
                                            guardando
                                        }
                                        placeholder="Ej. 3001234567"
                                    />

                                    {erroresFormulario.telefono && (
                                        <span className="campo-error">
                                            {
                                                erroresFormulario.telefono
                                            }
                                        </span>
                                    )}
                                </div>

                                <div className="campo-formulario campo-formulario-full">
                                    <label htmlFor="cliente-correo">
                                        Correo
                                    </label>

                                    <input
                                        id="cliente-correo"
                                        name="correo"
                                        type="email"
                                        value={
                                            formulario.correo
                                        }
                                        onChange={
                                            manejarCambioFormulario
                                        }
                                        disabled={
                                            guardando
                                        }
                                        placeholder="Ej. laura@gmail.com"
                                        maxLength="191"
                                    />

                                    {erroresFormulario.correo && (
                                        <span className="campo-error">
                                            {
                                                erroresFormulario.correo
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="cliente-modal-footer">
                                <button
                                    type="button"
                                    className="btn-cancelar-cliente"
                                    onClick={
                                        modalNuevoCliente
                                            ? cerrarNuevoCliente
                                            : cerrarEditarCliente
                                    }
                                    disabled={
                                        guardando
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="btn-guardar-cliente"
                                    disabled={
                                        guardando
                                    }
                                >
                                    {guardando ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin"></i>

                                            Guardando...
                                        </>
                                    ) : modalNuevoCliente ? (
                                        "Crear cliente"
                                    ) : (
                                        "Guardar cambios"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default Clientes;