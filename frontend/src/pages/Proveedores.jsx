import { useEffect, useState } from "react";

import Layout from "../components/Layout";

import "../styles/Dashboard.css";
import "../styles/Proveedores.css";

import {
    obtenerProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
} from "../services/proveedores.service";


function Proveedores() {

    const [proveedores, setProveedores] = useState([]);

    const [cargando, setCargando] = useState(true);

    const [error, setError] = useState("");

    const [modalAbierto, setModalAbierto] = useState(false);

    const [proveedorEditar, setProveedorEditar] = useState(null);

    const [guardando, setGuardando] = useState(false);


    async function cargarProveedores() {

        try {

            setError("");

            const lista = await obtenerProveedores();

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


    async function manejarEliminar(proveedor) {

        const confirmar = window.confirm(
            `¿Deseas eliminar a "${proveedor.nombre}"?`
        );

        if (!confirmar) return;

        try {

            await eliminarProveedor(proveedor.id);

            await cargarProveedores();

        } catch (error) {

            setError(
                error.message ||
                "No fue posible eliminar el proveedor."
            );

        }

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

            <div className="proveedores-header">

                <div>
                    <h1>Proveedores</h1>
                    <p className="dashboard-subtitle">
                        Gestiona los proveedores asociados a tus
                        productos.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn-nuevo-producto"
                    onClick={abrirNuevo}
                >
                    <i className="fa-solid fa-plus"></i>
                    Nuevo proveedor
                </button>

            </div>

            {error && (
                <div className="caja-error">{error}</div>
            )}

            <div className="proveedores-tabla-wrapper">

                {proveedores.length === 0 ? (

                    <div className="inventario-vacio-standalone">
                        <i className="fa-solid fa-truck"></i>
                        <strong>No hay proveedores registrados</strong>
                        <span>
                            Crea tu primer proveedor para asociarlo a
                            tus productos.
                        </span>
                    </div>

                ) : (

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
                            {proveedores.map((proveedor) => (
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
                                                className="accion eliminar"
                                                title="Eliminar proveedor"
                                                onClick={() =>
                                                    manejarEliminar(
                                                        proveedor
                                                    )
                                                }
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

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