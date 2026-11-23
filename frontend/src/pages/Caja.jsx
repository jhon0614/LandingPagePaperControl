import { Fragment, useEffect, useState, useCallback } from "react";

import Layout from "../components/Layout";

import "../styles/Dashboard.css";
import "../styles/Caja.css";
import { formatoFechaHora, formatoHora } from "../utils/fecha";
import { aNumeroMonto, formatearMontoEntrada, limpiarMontoEntrada } from "../utils/moneda";
import {
    obtenerTurnoActual,
    abrirCaja,
    obtenerResumenTurno,
    obtenerGastosTurno,
    registrarGasto,
    eliminarGasto,
    cerrarCaja,
    obtenerHistorialTurnos,
    obtenerGastosDeTurno,
} from "../services/caja.service";
import CampoFecha from "../components/CampoFecha";
import AvisoTurnoLargo from "../components/AvisoTurnoLargo";

function formatoMoneda(valor) {

    return `$${Number(valor || 0).toLocaleString("es-CO")}`;

}

function formatoFechaCorta(fecha) {

    if (!fecha) return "—";

    return new Date(fecha).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "2-digit",
        hour: "numeric",
        minute: "2-digit",
    });

}

const MONTO_MINIMO_APERTURA = 300000;
function Caja() {

    /*
     * =====================================================
     * ESTADO GENERAL
     * =====================================================
     */

    const [turno, setTurno] = useState(null);

    const [resumen, setResumen] = useState(null);

    const [gastos, setGastos] = useState([]);

    const [cargandoInicial, setCargandoInicial] = useState(true);

    const [error, setError] = useState("");

        const usuarioActual = JSON.parse(
        localStorage.getItem("usuario")
    );

    const puedeVerHistorial =
        usuarioActual?.rol === "ADMINISTRADOR" ||
        usuarioActual?.rol === "DUENO";


    const [mostrarHistorial, setMostrarHistorial] = useState(false);

    const [historialTurnos, setHistorialTurnos] = useState([]);

    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const [fechaDesdeHistorial, setFechaDesdeHistorial] = useState("");

    const [fechaHastaHistorial, setFechaHastaHistorial] = useState("");

    const [turnoExpandido, setTurnoExpandido] = useState(null);

    const [gastosPorTurno, setGastosPorTurno] = useState({});

    const [cargandoGastosTurno, setCargandoGastosTurno] = useState(null);

    /*
     * =====================================================
     * APERTURA
     * =====================================================
     */

    const [montoInicial, setMontoInicial] = useState("");

    const [abriendo, setAbriendo] = useState(false);


    /*
     * =====================================================
     * GASTOS
     * =====================================================
     */

    const [descripcionGasto, setDescripcionGasto] = useState("");

    const [montoGasto, setMontoGasto] = useState("");

    const [guardandoGasto, setGuardandoGasto] = useState(false);

    const [mostrarDetallesGastos, setMostrarDetallesGastos] = useState(false);


    /*
     * =====================================================
     * CIERRE
     * =====================================================
     */

    const [modalCierre, setModalCierre] = useState(false);

    const [montoContado, setMontoContado] = useState("");

    const [cerrando, setCerrando] = useState(false);

    const [cuadreFinal, setCuadreFinal] = useState(null);


    /*
     * =====================================================
     * CARGAR TURNO ACTUAL + RESUMEN + GASTOS
     * =====================================================
     */

    const cargarCajaActual = useCallback(async () => {

        try {

            setError("");

            const turnoActual = await obtenerTurnoActual();

            setTurno(turnoActual);

            if (turnoActual) {

                const [resumenTurno, gastosTurno] = await Promise.all([

                    obtenerResumenTurno(),

                    obtenerGastosTurno(),

                ]);

                setResumen(resumenTurno);

                setGastos(gastosTurno);

            } else {

                setResumen(null);

                setGastos([]);

            }

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cargar la información de caja."
            );

        } finally {

            setCargandoInicial(false);

        }

    }, []);


    useEffect(() => {

        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarCajaActual();

    }, [cargarCajaActual]);


    /*
     * =====================================================
     * ABRIR CAJA
     * =====================================================
     */

    async function manejarAbrirCaja(e) {

        e.preventDefault();

        setError("");

        if (
            montoInicial === "" ||
            aNumeroMonto(montoInicial) < MONTO_MINIMO_APERTURA
        ) {

            setError(
                `El monto mínimo para abrir la caja es ${formatoMoneda(MONTO_MINIMO_APERTURA)}.`
            );

            return;

        }

        try {

            setAbriendo(true);

            await abrirCaja(montoInicial);

            setMontoInicial("");

            await cargarCajaActual();

        } catch (error) {

            setError(
                error.message ||
                "No fue posible abrir la caja."
            );

        } finally {

            setAbriendo(false);

        }

    }


    /*
     * =====================================================
     * REGISTRAR GASTO
     * =====================================================
     */

    async function manejarRegistrarGasto(e) {

        e.preventDefault();

        setError("");

        if (!descripcionGasto.trim()) {

            setError(
                "Ingresa una descripción para el gasto."
            );

            return;

        }

        if (
            montoGasto === "" ||
            aNumeroMonto(montoGasto) <= 0
        ) {

            setError(
                "Ingresa un monto válido para el gasto."
            );

            return;

        }

        try {

            setGuardandoGasto(true);

            await registrarGasto({
                descripcion: descripcionGasto.trim(),
                monto: aNumeroMonto(montoGasto),
            });

            setDescripcionGasto("");

            setMontoGasto("");

            const [resumenTurno, gastosTurno] = await Promise.all([

                obtenerResumenTurno(),

                obtenerGastosTurno(),

            ]);

            setResumen(resumenTurno);

            setGastos(gastosTurno);

        } catch (error) {

            setError(
                error.message ||
                "No fue posible registrar el gasto."
            );

        } finally {

            setGuardandoGasto(false);

        }

    }


    async function manejarEliminarGasto(idGasto) {

        try {

            await eliminarGasto(idGasto);

            const [resumenTurno, gastosTurno] = await Promise.all([

                obtenerResumenTurno(),

                obtenerGastosTurno(),

            ]);

            setResumen(resumenTurno);

            setGastos(gastosTurno);

        } catch (error) {

            setError(
                error.message ||
                "No fue posible eliminar el gasto."
            );

        }

    }


    /*
     * =====================================================
     * CIERRE DE CAJA
     * =====================================================
     */

    async function manejarCerrarCaja(e) {

        e.preventDefault();

        setError("");

        if (montoContado === "") {

            setError(
                "Ingresa el monto contado en caja."
            );

            return;

        }

        try {

            setCerrando(true);

            const cuadre = await cerrarCaja(
                montoContado
            );

            setCuadreFinal(cuadre);

            setMontoContado("");

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cerrar la caja."
            );

        } finally {

            setCerrando(false);

        }

    }


    function cerrarModalCuadre() {

        setModalCierre(false);

        setCuadreFinal(null);

        cargarCajaActual();

    }

    async function cargarHistorialTurnos() {

        try {

            setCargandoHistorial(true);

            const lista = await obtenerHistorialTurnos({
                desde: fechaDesdeHistorial || undefined,
                hasta: fechaHastaHistorial || undefined,
            });

            setHistorialTurnos(lista);

            setTurnoExpandido(null);

            setGastosPorTurno({});

        } catch {

            setHistorialTurnos([]);

        } finally {

            setCargandoHistorial(false);

        }

    }
    
    async function alternarGastosTurno(turnoHistorial) {

        const idTurno = turnoHistorial.id;

        if (turnoExpandido === idTurno) {

            setTurnoExpandido(null);

            return;

        }

        setTurnoExpandido(idTurno);

        if (
            gastosPorTurno[idTurno] ||
            Number(turnoHistorial.totalGastos) === 0
        ) return;

        try {

            setCargandoGastosTurno(idTurno);

            const lista = await obtenerGastosDeTurno(idTurno);

            setGastosPorTurno((actual) => ({ ...actual, [idTurno]: lista }));

        } catch (error) {

            setError(
                error.message ||
                "No fue posible cargar los gastos del turno."
            );

            setTurnoExpandido(null);

        } finally {

            setCargandoGastosTurno(null);

        }

    }

    useEffect(() => {

        if (mostrarHistorial) {

            // eslint-disable-next-line react-hooks/set-state-in-effect
            cargarHistorialTurnos();

        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mostrarHistorial, fechaDesdeHistorial, fechaHastaHistorial]);

    /*
     * =====================================================
     * RENDER — CARGANDO
     * =====================================================
     */

    if (cargandoInicial) {

        return (

            <Layout>

                <div className="caja-cargando">

                    <i className="fa-solid fa-spinner fa-spin"></i>

                    <p>Cargando información de caja...</p>

                </div>

            </Layout>

        );

    }


    /*
     * =====================================================
     * RENDER — SIN CAJA ABIERTA
     * =====================================================
     */

    if (!turno) {

        return (

            <Layout>

                <div className="caja-header">

                    <h1>Caja</h1>

                    <p className="dashboard-subtitle">
                        Abre la caja para comenzar a registrar ventas y gastos del día.
                    </p>

                </div>

                <div className="caja-apertura-card">

                    <i className="fa-solid fa-cash-register"></i>

                    <h2>No hay una caja abierta</h2>

                    <p>
                        Ingresa el monto inicial de efectivo con el que
                        comienzas el turno (mínimo {formatoMoneda(MONTO_MINIMO_APERTURA)}).
                    </p>

                    {error && (

                        <div className="caja-error">
                            {error}
                        </div>

                    )}

                    <form
                        className="caja-apertura-form"
                        onSubmit={manejarAbrirCaja}
                    >

                        <label>Monto inicial de efectivo</label>

                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 300.000"
                        value={formatearMontoEntrada(montoInicial)}
                        onChange={(e) =>
                            setMontoInicial(limpiarMontoEntrada(e.target.value))
                            }
                            disabled={abriendo}
                        />

                        <button
                            type="submit"
                            className="auth-button"
                            disabled={abriendo}
                        >

                            {abriendo ? (

                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    Abriendo caja...
                                </>

                            ) : (

                                <>
                                    <i className="fa-solid fa-door-open"></i>
                                    Abrir caja
                                </>

                            )}

                        </button>

                    </form>

                </div>

            </Layout>

        );

    }


    /*
     * =====================================================
     * RENDER — CAJA ABIERTA
     * =====================================================
     */

    return (

        <Layout>

            <div className="caja-header">

                <div>

                    <h1>Caja</h1>

                    <p className="dashboard-subtitle">
                        Turno abierto por {turno.usuarioNombre} el{" "}
                        {formatoFechaHora(turno.abiertoEn)}
                    </p>

                </div>

                <button
                    type="button"
                    className="btn-cerrar-caja"
                    onClick={() => setModalCierre(true)}
                >
                    <i className="fa-solid fa-lock"></i>
                    Cerrar caja
                </button>

            </div>

            {error && (

                <div className="caja-error">
                    {error}
                </div>

            )}
            
            <AvisoTurnoLargo turno={turno} />

            {/* =================================================
                RESUMEN
            ================================================= */}

            <section className="caja-resumen-cards">

                <div className="caja-resumen-card">
                    <span>Monto inicial</span>
                    <strong>{formatoMoneda(resumen?.montoInicial)}</strong>
                </div>

                <div className="caja-resumen-card">
                    <span>Total ventas</span>
                    <strong>{formatoMoneda(resumen?.totalVentas)}</strong>
                </div>

                <div className="caja-resumen-card">
                    <span>Efectivo</span>
                    <strong>
                        {formatoMoneda(resumen?.ventasPorMetodo?.EFECTIVO)}
                    </strong>
                </div>

                <div className="caja-resumen-card">
                    <span>Tarjeta</span>
                    <strong>
                        {formatoMoneda(resumen?.ventasPorMetodo?.TARJETA)}
                    </strong>
                </div>

                <div className="caja-resumen-card">
                    <span>Transferencia</span>
                    <strong>
                        {formatoMoneda(resumen?.ventasPorMetodo?.TRANSFERENCIA)}
                    </strong>
                </div>

                <div className="caja-resumen-card">
                    <span>Total gastos</span>
                    <strong
                        className={
                            Number(resumen?.totalGastos) > 0
                                ? "caja-resumen-negativo"
                                : "caja-gasto-cero"
                        }
                    >
                        {Number(resumen?.totalGastos) > 0
                            ? `-${formatoMoneda(resumen?.totalGastos)}`
                            : formatoMoneda(0)}
                    </strong>
                </div>

                <div className="caja-resumen-card caja-resumen-destacado">
                    <span>Esperado en efectivo</span>
                    <strong>
                        {formatoMoneda(resumen?.montoEsperadoEfectivo)}
                    </strong>
                </div>

            </section>

            {/* =================================================
                GASTOS
            ================================================= */}

            <section className="caja-gastos-panel">

                <h2>Gastos de caja menor</h2>

                <form
                    className="caja-gasto-form"
                    onSubmit={manejarRegistrarGasto}
                >

                    <input
                        type="text"
                        placeholder="Descripción del gasto"
                        value={descripcionGasto}
                        onChange={(e) =>
                            setDescripcionGasto(e.target.value)
                        }
                        disabled={guardandoGasto}
                    />

                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Monto"
                        value={formatearMontoEntrada(montoGasto)}
                        onChange={(e) =>
                            setMontoGasto(limpiarMontoEntrada(e.target.value))
                        }
                        disabled={guardandoGasto}
                    />

                    <button
                        type="submit"
                        className="btn-agregar-gasto"
                        disabled={guardandoGasto}
                    >

                        {guardandoGasto ? (

                            <i className="fa-solid fa-spinner fa-spin"></i>

                        ) : (

                            <>
                                <i className="fa-solid fa-plus"></i>
                                Agregar
                            </>

                        )}

                    </button>

                </form>

                <div className="caja-gastos-acciones">
                    <button
                        type="button"
                        className="btn-ver-detalles-gastos"
                        onClick={() => setMostrarDetallesGastos((actual) => !actual)}
                        aria-expanded={mostrarDetallesGastos}
                    >
                        <i className={`fa-solid ${mostrarDetallesGastos ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
                        {mostrarDetallesGastos ? "Ocultar detalles de gastos" : "Ver detalles de gastos"}
                    </button>
                </div>

                {mostrarDetallesGastos && (
                <div className="caja-gastos-tabla" aria-live="polite">

                    {gastos.length === 0 ? (

                        <p className="caja-gastos-vacio">
                            No se han registrado gastos en este turno.
                        </p>

                    ) : (

                        <table>

                            <thead>

                                <tr>
                                    <th>Descripción</th>
                                    <th>Monto</th>
                                    <th>Usuario</th>
                                    <th>Hora</th>
                                    <th></th>
                                </tr>

                            </thead>

                            <tbody>

                                {gastos.map((gasto) => (

                                    <tr key={gasto.id}>

                                        <td>{gasto.descripcion}</td>

                                        <td>{formatoMoneda(gasto.monto)}</td>

                                        <td>{gasto.usuarioNombre}</td>

                                        <td>
                                            {formatoHora(gasto.creadoEn)}
                                        </td>

                                        <td>

                                            <button
                                                type="button"
                                                className="caja-gasto-eliminar"
                                                onClick={() =>
                                                    manejarEliminarGasto(
                                                        gasto.id
                                                    )
                                                }
                                                title="Eliminar gasto"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    )}

                </div>
                )}

            </section>

                        {/* =================================================
                HISTORIAL DE TURNOS (SOLO ADMIN / DUEÑO)
            ================================================= */}

            {puedeVerHistorial && (

                <section className="caja-gastos-panel">

                    <div
                        className="caja-historial-header"
                        onClick={() =>
                            setMostrarHistorial(!mostrarHistorial)
                        }
                    >

                        <h2>Historial de turnos de caja</h2>

                        <i
                            className={
                                mostrarHistorial
                                    ? "fa-solid fa-chevron-up"
                                    : "fa-solid fa-chevron-down"
                            }
                        ></i>

                    </div>

                    {mostrarHistorial && (

                        <>

                            <div className="historial-ventas-filtros caja-historial-filtros">

                                <div className="historial-filtro">
                                    <label htmlFor="fechaDesdeHistorial">Desde</label>
                                    <CampoFecha
                                        id="fechaDesdeHistorial"
                                        value={fechaDesdeHistorial}
                                        onChange={(e) =>
                                            setFechaDesdeHistorial(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="historial-filtro">
                                    <label htmlFor="fechaHastaHistorial">Hasta</label>
                                    <CampoFecha
                                        id="fechaHastaHistorial"
                                        value={fechaHastaHistorial}
                                        onChange={(e) =>
                                            setFechaHastaHistorial(e.target.value)
                                        }
                                    />
                                </div>

                            </div>

                            {cargandoHistorial ? (

                                <p className="caja-gastos-vacio">
                                    Cargando historial...
                                </p>

                            ) : historialTurnos.length === 0 ? (

                                <p className="caja-gastos-vacio">
                                    No hay turnos registrados en este rango.
                                </p>

                            ) : (

                                <div className="historial-ventas-tabla caja-historial-tabla">

                                    <table>

                                        <thead>
                                            <tr>
                                                <th></th>
                                                <th>Usuario</th>
                                                <th>Apertura</th>
                                                <th>Cierre</th>
                                                <th>Esperado</th>
                                                <th>Contado</th>
                                                <th>Diferencia</th>
                                                <th>Gastos</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {historialTurnos.map((turno) => (
                                                <Fragment key={turno.id}>
                                                    <tr
                                                        className={
                                                            turnoExpandido === turno.id
                                                                ? "caja-turno-abierto"
                                                                : undefined
                                                        }
                                                    >
                                                        <td className="caja-historial-toggle-celda">
                                                            <button
                                                                type="button"
                                                                className="caja-historial-toggle"
                                                                onClick={() => alternarGastosTurno(turno)}
                                                                aria-expanded={turnoExpandido === turno.id}
                                                                title="Ver detalle de los gastos"
                                                            >
                                                                <i
                                                                    className={`fa-solid ${
                                                                        turnoExpandido === turno.id
                                                                            ? "fa-chevron-down"
                                                                            : "fa-chevron-right"
                                                                    }`}
                                                                ></i>
                                                            </button>
                                                        </td>
                                                        <td className="caja-historial-usuario">{turno.usuarioNombre}</td>
                                                        <td>{formatoFechaHora(turno.abiertoEn)}</td>
                                                        <td>{formatoFechaHora(turno.cerradoEn)}</td>
                                                        <td>{formatoMoneda(turno.montoEsperado)}</td>
                                                        <td>{formatoMoneda(turno.montoContado)}</td>
                                                        <td>
                                                            <span
                                                                className={
                                                                    Number(turno.diferencia) < 0
                                                                        ? "caja-resumen-negativo"
                                                                        : ""
                                                                }
                                                            >
                                                                {formatoMoneda(turno.diferencia)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {Number(turno.totalGastos) > 0 ? (
                                                                <span className="caja-gastos-pill">
                                                                    {formatoMoneda(turno.totalGastos)}
                                                                </span>
                                                            ) : (
                                                                formatoMoneda(0)
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {turnoExpandido === turno.id && (
                                                        <tr className="caja-turno-abierto">
                                                            <td
                                                                colSpan={8}
                                                                className="caja-historial-detalle-celda"
                                                            >
                                                                <div className="caja-gastos-detalle">

                                                                    <h3>Gastos de este turno</h3>

                                                                    {cargandoGastosTurno === turno.id ? (

                                                                        <p className="caja-gastos-vacio">
                                                                            Cargando gastos...
                                                                        </p>

                                                                    ) : (gastosPorTurno[turno.id] || []).length === 0 ? (

                                                                        <p className="caja-gastos-vacio">
                                                                            Este turno no tiene gastos registrados.
                                                                        </p>

                                                                    ) : (

                                                                        <div className="caja-gastos-detalle-tabla">

                                                                            <div className="caja-gastos-detalle-fila caja-gastos-detalle-cabecera">
                                                                                <span>Hora</span>
                                                                                <span>Descripción</span>
                                                                                <span>Registrado por</span>
                                                                                <span>Monto</span>
                                                                            </div>

                                                                            {gastosPorTurno[turno.id].map((gasto) => (
                                                                                <div className="caja-gastos-detalle-fila" key={gasto.id}>
                                                                                    <span>{formatoFechaCorta(gasto.ocurridoEn || gasto.creadoEn)}</span>
                                                                                    <span>{gasto.descripcion}</span>
                                                                                    <span>{gasto.usuarioNombre || "—"}</span>
                                                                                    <span>{formatoMoneda(gasto.monto)}</span>
                                                                                </div>
                                                                            ))}

                                                                            <div className="caja-gastos-detalle-fila caja-gastos-detalle-total">
                                                                                <span></span>
                                                                                <span></span>
                                                                                <span>Total gastos</span>
                                                                                <span>{formatoMoneda(turno.totalGastos)}</span>
                                                                            </div>

                                                                        </div>

                                                                    )}

                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            ))}
                                        </tbody>

                                    </table>

                                </div>

                            )}

                        </>

                    )}

                </section>

            )}

            {/* =================================================
                MODAL DE CIERRE
            ================================================= */}

            {modalCierre && (

                <div
                    className="caja-modal-overlay"
                    onMouseDown={(e) => {

                        if (e.target === e.currentTarget && !cuadreFinal) {

                            setModalCierre(false);

                        }

                    }}
                >

                    <div className="caja-modal">

                        {!cuadreFinal ? (

                            <>

                                <div className="caja-modal-header">

                                    <h2>Cerrar caja</h2>

                                    <p>
                                        Cuenta el efectivo físico en caja e
                                        ingresa el monto real contado.
                                    </p>

                                </div>

                                <div className="caja-modal-resumen">

                                    <div>
                                        <span>Esperado en efectivo</span>
                                        <strong>
                                            {formatoMoneda(
                                                resumen?.montoEsperadoEfectivo
                                            )}
                                        </strong>
                                    </div>

                                </div>

                                <form
                                    className="caja-cierre-form"
                                    onSubmit={manejarCerrarCaja}
                                >

                                    <label>Monto contado</label>

                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Ej: 200.000"
                        value={formatearMontoEntrada(montoContado)}
                        onChange={(e) =>
                            setMontoContado(limpiarMontoEntrada(e.target.value))
                                        }
                                        disabled={cerrando}
                                    />

                                    <div className="caja-modal-acciones">

                                        <button
                                            type="button"
                                            className="btn-cancelar-cierre"
                                            onClick={() =>
                                                setModalCierre(false)
                                            }
                                            disabled={cerrando}
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            className="auth-button"
                                            disabled={cerrando}
                                        >

                                            {cerrando
                                                ? "Cerrando..."
                                                : "Confirmar cierre"}

                                        </button>

                                    </div>

                                </form>

                            </>

                        ) : (

                            <>

                                <div className="caja-modal-header">

                                    <h2>Cuadre del turno</h2>

                                    <p>
                                        Cerrado el{" "}
                                        {formatoFechaHora(cuadreFinal.cerradoEn)}
                                    </p>

                                </div>

                                <div className="caja-cuadre-detalle">

                                    <div>
                                        <span>Monto inicial</span>
                                        <strong>
                                            {formatoMoneda(cuadreFinal.montoInicial)}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Total ventas</span>
                                        <strong>
                                            {formatoMoneda(cuadreFinal.totalVentas)}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Total gastos</span>
                                        <strong>
                                            {Number(cuadreFinal.totalGastos) > 0
                                                ? `-${formatoMoneda(cuadreFinal.totalGastos)}`
                                                : formatoMoneda(0)}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Monto esperado</span>
                                        <strong>
                                            {formatoMoneda(cuadreFinal.montoEsperado)}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Monto contado</span>
                                        <strong>
                                            {formatoMoneda(cuadreFinal.montoContado)}
                                        </strong>
                                    </div>

                                    <div
                                        className={
                                            cuadreFinal.diferencia < 0
                                                ? "caja-cuadre-diferencia negativa"
                                                : cuadreFinal.diferencia > 0
                                                ? "caja-cuadre-diferencia positiva"
                                                : "caja-cuadre-diferencia"
                                        }
                                    >
                                        <span>Diferencia</span>
                                        <strong>
                                            {cuadreFinal.diferencia > 0 && "+"}
                                            {formatoMoneda(cuadreFinal.diferencia)}
                                        </strong>
                                    </div>

                                </div>

                                <div className="caja-modal-acciones">

                                    <button
                                        type="button"
                                        className="auth-button"
                                        onClick={cerrarModalCuadre}
                                    >
                                        Entendido
                                    </button>

                                </div>

                            </>

                        )}

                    </div>

                </div>

            )}

        </Layout>

    );

}


export default Caja;
