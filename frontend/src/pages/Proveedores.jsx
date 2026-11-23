import { useEffect, useState } from "react";

import Layout from "../components/Layout";

import "../styles/Dashboard.css";
import "../styles/Proveedores.css";

import {
    obtenerProveedores,
    crearProveedor,
    actualizarProveedor,
    cambiarEstadoProveedor,
} from "../services/proveedores.service";

import usePaginacion from "../hooks/usePaginacion";
import { SelectorRegistros, NavegacionPaginas } from "../components/Paginacion";
import BotonActualizar from "../components/BotonActualizar";
import "../styles/Clientes.css";

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function Proveedores() {

    const [proveedores, setProveedores] = useState([]);

    const [cargando, setCargando] = useState(true);

    const [error, setError] = useState("");

    const [modalAbierto, setModalAbierto] = useState(false);

    const [proveedorEditar, setProveedorEditar] = useState(null);

    const [guardando, setGuardando] = useState(false);

    const [actualizando, setActualizando] = useState(false);

    const [busqueda, setBusqueda] = useState("");

    const [filtroEstado, setFiltroEstado] = useState("TODOS");

    const proveedoresFiltrados = proveedores.filter((proveedor) => {

        const texto = normalizarTexto(busqueda);

        if (!texto) return true;

        return [
            proveedor.nombre,
            proveedor.contacto,
            proveedor.telefono,
            proveedor.correo,
            proveedor.direccion,
        ].some((campo) => normalizarTexto(campo).includes(texto));

    });

    const proveedoresActivos = proveedoresFiltrados.filter(
        (proveedor) => proveedor.estaActivo
    );

    const proveedoresInactivos = proveedoresFiltrados.filter(
        (proveedor) => !proveedor.estaActivo
    );

    const mostrarActivos = filtroEstado !== "INACTIVOS";

    const mostrarInactivos = filtroEstado !== "ACTIVOS";

    const hayFiltros = busqueda !== "" || filtroEstado !== "TODOS";

    function limpiarFiltros() {

        setBusqueda("");

        setFiltroEstado("TODOS");

    }

    const paginacion = usePaginacion(proveedoresActivos);

    const paginacionInactivos = usePaginacion(proveedoresInactivos);

    async function actualizarProveedores() {

        try {

            setActualizando(true);
            setError("");

            const lista = await obtenerProveedores({ refrescar: true, incluirInactivos: true });

            setProveedores(lista);

        } catch (error) {

            setError(
                error.message ||
                "No fue posible actualizar los proveedores."
            );

        } finally {

            setActualizando(false);

        }

    }

    async function cargarProveedores() {

        try {

            setError("");

            const lista = await obtenerProveedores({ incluirInactivos: true });

            setProveedores(lista);

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cargar los proveedores."
            );

        } finally {

            setCargando(false);

        }

    }

    useEffect(() => {

        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarProveedores();

    }, []);


    function abrirNuevo() {

        setProveedorEditar(null);

        setModalAbierto(true);

    }

    function abrirEditar(proveedor) {

        setProveedorEditar(proveedor);

        setModalAbierto(true);

    }


    async function guardarProveedor(evento) {

        evento.preventDefault();

        const formulario = new FormData(evento.currentTarget);

        const datos = {
            nombre: formulario.get("nombre").trim(),
            contacto: formulario.get("contacto").trim(),
            telefono: formulario.get("telefono").trim(),
            correo: formulario.get("correo").trim(),
            direccion: formulario.get("direccion").trim(),
        };

        try {

            setGuardando(true);

            if (proveedorEditar) {

                await actualizarProveedor(
                    proveedorEditar.id,
                    datos
                );

            } else {

                await crearProveedor(datos);

            }

            setModalAbierto(false);

            setProveedorEditar(null);

            await cargarProveedores();

        } catch (error) {

            setError(
                error.message ||
                "No fue posible guardar el proveedor."
            );

        } finally {

            setGuardando(false);

        }

    }


    async function manejarCambiarEstado(proveedor, estaActivo) {

        if (!estaActivo) {

            const confirmar = window.confirm(
                `¿Deseas desactivar a "${proveedor.nombre}"?`
            );

            if (!confirmar) return;

        }

        try {

            setError("");

            await cambiarEstadoProveedor(proveedor.id, estaActivo);

            await cargarProveedores();

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cambiar el estado del proveedor."
            );

        }

    }


    function renderTabla(items, inactivo) {

        return (

            <table className="inventario-tabla">
                <thead>
                    <tr>
                        <th>NOMBRE</th>
                        <th>CONTACTO</th>
                        <th>TELÉFONO</th>
                        <th>CORREO</th>
                        <th>DIRECCIÓN</th>
                        <th>ACCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((proveedor) => (
                        <tr key={proveedor.id}>
                            <td>
                                <strong>{proveedor.nombre}</strong>
                            </td>
                            <td>{proveedor.contacto || "—"}</td>
                            <td>{proveedor.telefono || "—"}</td>
                            <td>{proveedor.correo || "—"}</td>
                            <td>{proveedor.direccion || "—"}</td>
                            <td>
                                <div className="acciones-producto">
                                    {inactivo ? (
                                        <button
                                            type="button"
                                            className="accion activar"
                                            title="Reactivar proveedor"
                                            onClick={() =>
                                                manejarCambiarEstado(proveedor, true)
                                            }
                                        >
                                            <i className="fa-solid fa-rotate-left"></i>
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="accion editar"
                                                title="Editar proveedor"
                                                onClick={() =>
                                                    abrirEditar(proveedor)
                                                }
                                            >
                                                <i className="fa-solid fa-pen"></i>
                                            </button>
                                            <button
                                                type="button"
                                                className="accion desactivar"
                                                title="Desactivar proveedor"
                                                onClick={() =>
                                                    manejarCambiarEstado(proveedor, false)
                                                }
                                            >
                                                <i className="fa-solid fa-ban"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

        );

    }

    if (cargando) {

        return (

            <Layout>
                <div className="caja-cargando">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <p>Cargando proveedores...</p>
                </div>
            </Layout>

        );

    }


    return (

        <Layout>

            <div className="inventario-page">

                <div className="inventario-header">

                    <div>
                        <h1>Proveedores</h1>
                        <p>
                            Gestiona los proveedores asociados a tus
                            productos.
                        </p>
                    </div>

                    <div className="inventario-header-acciones">
                        <BotonActualizar onClick={actualizarProveedores} actualizando={actualizando} />

                        <button type="button" className="btn-nuevo-producto" onClick={abrirNuevo}>
                            <i className="fa-solid fa-plus"></i>
                            Nuevo proveedor
                        </button>
                    </div>

                </div>

                {error && (
                    <div className="caja-error">{error}</div>
                )}

                <div className="clientes-busqueda filtros-fila">

                    <div className="clientes-buscador">
                        <i className="fa-solid fa-magnifying-glass"></i>

                        <input
                            type="text"
                            placeholder="Buscar por nombre, contacto, teléfono, correo o dirección..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />

                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda("")}
                                title="Limpiar búsqueda"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        )}
                    </div>

                    <select
                        className="filtro-select"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="ACTIVOS">Activos</option>
                        <option value="INACTIVOS">Inactivos</option>
                    </select>

                </div>

                {hayFiltros && (
                    <div className="filtros-activos">
                        <span>Mostrando resultados filtrados</span>
                        <button type="button" onClick={limpiarFiltros}>
                            Limpiar filtros
                        </button>
                    </div>
                )}

                {mostrarActivos && (

                    <section className="inventario-seccion">

                        <div className="seccion-header">
                            <div>
                                <h2>
                                    <span className="titulo-verde">
                                        <i className="fa-solid fa-circle"></i>
                                        Proveedores activos
                                    </span>
                                </h2>
                                <p>
                                    Proveedores disponibles para asociar a
                                    tus productos.
                                </p>
                            </div>
                            <span className="contador verde">
                                {proveedoresActivos.length}
                            </span>
                        </div>

                        <SelectorRegistros paginacion={paginacion} />

                        <div className="inventario-tabla-wrapper proveedores-tabla-wrapper">

                            {proveedoresActivos.length === 0 ? (

                                <div className="inventario-vacio-standalone">
                                    <i className="fa-solid fa-truck"></i>

                                    {!proveedores.some((proveedor) => proveedor.estaActivo) ? (
                                        <>
                                            <strong>No hay proveedores activos</strong>
                                            <span>
                                                Crea tu primer proveedor para
                                                asociarlo a tus productos.
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <strong>No se encontraron proveedores</strong>
                                            <span>Prueba con otra búsqueda.</span>
                                        </>
                                    )}
                                </div>

                            ) : (

                                renderTabla(paginacion.items, false)

                            )}

                        </div>

                        <NavegacionPaginas paginacion={paginacion} />

                    </section>

                )}

                {mostrarInactivos && (

                    <section className="inventario-seccion">

                        <div className="seccion-header">
                            <div>
                                <h2>
                                    <span className="titulo-gris">
                                        <i className="fa-solid fa-circle"></i>
                                        Proveedores inactivos
                                    </span>
                                </h2>
                                <p>
                                    Proveedores que no están disponibles
                                    actualmente.
                                </p>
                            </div>
                            <span className="contador gris">
                                {proveedoresInactivos.length}
                            </span>
                        </div>

                        <SelectorRegistros paginacion={paginacionInactivos} />

                        <div className="inventario-tabla-wrapper proveedores-tabla-wrapper">

                            {proveedoresInactivos.length === 0 ? (

                                <div className="inventario-vacio-standalone">
                                    <i className="fa-solid fa-truck"></i>
                                    <strong>No hay proveedores inactivos</strong>
                                </div>

                            ) : (

                                renderTabla(paginacionInactivos.items, true)

                            )}

                        </div>

                        <NavegacionPaginas paginacion={paginacionInactivos} />

                    </section>

                )}

            </div>

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
                                    {proveedorEditar
                                        ? "Editar proveedor"
                                        : "Nuevo proveedor"}
                                </h2>
                                <p>
                                    Completa los datos del proveedor.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalAbierto(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form onSubmit={guardarProveedor}>

                            <div className="form-grid">

                                <div className="campo campo-completo">
                                    <label>Nombre</label>
                                    <input
                                        name="nombre"
                                        placeholder="Ej: Distribuidora ABC"
                                        defaultValue={
                                            proveedorEditar?.nombre || ""
                                        }
                                        required
                                        disabled={guardando}
                                    />
                                </div>

                                <div className="campo">
                                    <label>Persona de contacto</label>
                                    <input
                                        name="contacto"
                                        placeholder="Ej: Juan Pérez"
                                        defaultValue={
                                            proveedorEditar?.contacto || ""
                                        }
                                        disabled={guardando}
                                    />
                                </div>

                                <div className="campo">
                                    <label>Teléfono</label>
                                    <input
                                        name="telefono"
                                        placeholder="Ej: 3001234567"
                                        defaultValue={
                                            proveedorEditar?.telefono || ""
                                        }
                                        disabled={guardando}
                                    />
                                </div>

                                <div className="campo campo-completo">
                                    <label>Correo</label>
                                    <input
                                        name="correo"
                                        type="email"
                                        placeholder="Ej: contacto@distribuidora.com"
                                        defaultValue={
                                            proveedorEditar?.correo || ""
                                        }
                                        disabled={guardando}
                                    />
                                </div>

                                <div className="campo campo-completo">
                                    <label>Dirección</label>
                                    <input
                                        name="direccion"
                                        placeholder="Ej: Calle 123 #45-67, Bogotá"
                                        defaultValue={
                                            proveedorEditar?.direccion || ""
                                        }
                                        disabled={guardando}
                                    />
                                </div>

                            </div>

                            <div className="modal-acciones">
                                <button
                                    type="button"
                                    className="btn-cancelar"
                                    onClick={() => setModalAbierto(false)}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="btn-guardar"
                                    disabled={guardando}
                                >
                                    <i className="fa-solid fa-check"></i>
                                    {guardando
                                        ? "Guardando..."
                                        : proveedorEditar
                                        ? "Guardar cambios"
                                        : "Crear proveedor"}
                                </button>
                            </div>

                        </form>

                    </div>

                </div>

            )}

        </Layout>

    );

}

export default Proveedores;