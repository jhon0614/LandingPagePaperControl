import {useState} from "react";

import Layout from "../components/Layout";
import "../styles/Dashboard.css";
import "../styles/Reportes.css";

import { obtenerReporteCaja } from "../services/reportes.service";
import { obtenerUsuarios } from "../services/usuarios.service";

import { useEffect } from "react";


function formatoMoneda(valor) {

    return `$${Number(valor || 0).toLocaleString("es-CO")}`;

}


/*
=========================================================
FORMATEAR FECHA CALENDARIO
=========================================================

"fecha" viene como AAAA-MM-DD y representa un día
calendario, no un instante. Si se le pasa directo a
new Date("AAAA-MM-DD"), JS lo interpreta como
medianoche UTC, y al mostrarlo en hora de Colombia
(UTC-5) puede aparecer el día anterior.

Por eso se arman los componentes de la fecha a mano,
sin pasar por conversión de zona horaria.
*/

function formatoFechaCalendario(fechaTexto) {

    if (!fechaTexto) return "—";

    const [anio, mes, dia] = fechaTexto.split("-");

    return `${dia}/${mes}/${anio}`;

}


function obtenerFechaHoyTexto() {

    const hoy = new Date();

    const anio = hoy.getFullYear();

    const mes = String(hoy.getMonth() + 1).padStart(2, "0");

    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;

}


function Reportes() {

    const usuarioActual = JSON.parse(
        localStorage.getItem("usuario")
    );

    const rolActual = usuarioActual?.rol || "";

    const tieneAcceso =
        rolActual === "ADMINISTRADOR" ||
        rolActual === "DUENO";


    const [desde, setDesde] = useState(obtenerFechaHoyTexto());

    const [hasta, setHasta] = useState(obtenerFechaHoyTexto());

    const [vendedorId, setVendedorId] = useState("");

    const [usuarios, setUsuarios] = useState([]);

    const [reporte, setReporte] = useState(null);

    const [cargando, setCargando] = useState(false);

    const [error, setError] = useState("");

    const [consultado, setConsultado] = useState(false);


    useEffect(() => {

        if (!tieneAcceso) return;

        async function cargarUsuarios() {

            try {

                const lista = await obtenerUsuarios();

                setUsuarios(lista || []);

            } catch {

                setUsuarios([]);

            }

        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarUsuarios();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    async function consultarReporte(e) {

        e?.preventDefault();

        setError("");

        if (!desde || !hasta) {

            setError("Selecciona la fecha de inicio y de fin.");

            return;

        }

        if (new Date(hasta) < new Date(desde)) {

            setError("La fecha final no puede ser anterior a la inicial.");

            return;

        }

        const diferenciaDias =
            (new Date(hasta) - new Date(desde)) /
            (1000 * 60 * 60 * 24);

        if (diferenciaDias > 366) {

            setError("El rango máximo permitido es de 366 días.");

            return;

        }

        try {

            setCargando(true);

            const datos = await obtenerReporteCaja({
                desde,
                hasta,
                vendedorId: vendedorId || undefined,
            });

            setReporte(datos);

            setConsultado(true);

        } catch (error) {

            setError(
                error.message ||
                "No fue posible generar el reporte."
            );

            setReporte(null);

        } finally {

            setCargando(false);

        }

    }


    if (!tieneAcceso) {

        return (

            <Layout>

                <h1>Reportes</h1>

                <p className="dashboard-subtitle">
                    No tienes permisos para consultar esta sección.
                </p>

            </Layout>

        );

    }


    return (

        <Layout>

            <h1>Reportes</h1>

            <p className="dashboard-subtitle">
                Consulta el reporte diario de caja: ingresos, gastos
                y flujo neto por rango de fechas.
            </p>

            <form
                className="reportes-filtros"
                onSubmit={consultarReporte}
            >

                <div className="reportes-filtro">

                    <label htmlFor="reporte-desde">Desde</label>

                    <input
                        id="reporte-desde"
                        type="date"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        disabled={cargando}
                    />

                </div>

                <div className="reportes-filtro">

                    <label htmlFor="reporte-hasta">Hasta</label>

                    <input
                        id="reporte-hasta"
                        type="date"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        disabled={cargando}
                    />

                </div>

                <div className="reportes-filtro">

                    <label htmlFor="reporte-vendedor">Vendedor</label>

                    <select
                        id="reporte-vendedor"
                        value={vendedorId}
                        onChange={(e) => setVendedorId(e.target.value)}
                        disabled={cargando}
                    >

                        <option value="">Todos</option>

                        {usuarios.map((usuario) => (

                            <option key={usuario.id} value={usuario.id}>
                                {usuario.nombres} {usuario.apellidos}
                                {usuario.rol?.nombre
                                    ? ` (${usuario.rol.nombre})`
                                    : ""}
                            </option>

                        ))}

                    </select>

                </div>

                <button
                    type="submit"
                    className="btn-consultar-reporte"
                    disabled={cargando}
                >

                    {cargando ? (

                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            Consultando...
                        </>

                    ) : (

                        <>
                            <i className="fa-solid fa-magnifying-glass"></i>
                            Consultar
                        </>

                    )}

                </button>

            </form>

            {error && (
                <div className="caja-error">{error}</div>
            )}

            {!cargando && consultado && reporte && (

                <>

                    {/* =============================================
                        RESUMEN
                    ============================================= */}

                    <section className="reportes-resumen-cards">

                        <div className="reportes-resumen-card">
                            <span>Total ventas</span>
                            <strong>
                                {formatoMoneda(reporte.resumen.totalVentas)}
                            </strong>
                        </div>

                        <div className="reportes-resumen-card">
                            <span>Efectivo</span>
                            <strong>
                                {formatoMoneda(
                                    reporte.resumen.ventasPorMetodo?.efectivo
                                )}
                            </strong>
                        </div>

                        <div className="reportes-resumen-card">
                            <span>Tarjeta</span>
                            <strong>
                                {formatoMoneda(
                                    reporte.resumen.ventasPorMetodo?.tarjeta
                                )}
                            </strong>
                        </div>

                        <div className="reportes-resumen-card">
                            <span>Transferencia</span>
                            <strong>
                                {formatoMoneda(
                                    reporte.resumen.ventasPorMetodo
                                        ?.transferencia
                                )}
                            </strong>
                        </div>

                        <div className="reportes-resumen-card">
                            <span>Total gastos</span>
                            <strong className="caja-resumen-negativo">
                                -{formatoMoneda(reporte.resumen.totalGastos)}
                            </strong>
                        </div>

                        <div className="reportes-resumen-card reportes-resumen-destacado">
                            <span>Flujo neto</span>
                            <strong>
                                {formatoMoneda(reporte.resumen.flujoNeto)}
                            </strong>
                        </div>

                    </section>

                    {/* =============================================
                        TABLA DIARIA
                    ============================================= */}

                    <section className="reportes-tabla-panel">

                        <h2>Detalle diario</h2>

                        {(!reporte.dias || reporte.dias.length === 0) ? (

                            <p className="caja-gastos-vacio">
                                No hay actividad registrada en este rango.
                            </p>

                        ) : (

                            <div className="caja-gastos-tabla">

                                <table>

                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Total ventas</th>
                                            <th>Efectivo</th>
                                            <th>Tarjeta</th>
                                            <th>Transferencia</th>
                                            <th>Gastos</th>
                                            <th>Flujo neto</th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {reporte.dias.map((dia) => (

                                            <tr key={dia.fecha}>

                                                <td>
                                                    {formatoFechaCalendario(
                                                        dia.fecha
                                                    )}
                                                </td>

                                                <td>
                                                    {formatoMoneda(
                                                        dia.totalVentas
                                                    )}
                                                </td>

                                                <td>
                                                    {formatoMoneda(
                                                        dia.ventasPorMetodo
                                                            ?.efectivo
                                                    )}
                                                </td>

                                                <td>
                                                    {formatoMoneda(
                                                        dia.ventasPorMetodo
                                                            ?.tarjeta
                                                    )}
                                                </td>

                                                <td>
                                                    {formatoMoneda(
                                                        dia.ventasPorMetodo
                                                            ?.transferencia
                                                    )}
                                                </td>

                                                <td className="caja-resumen-negativo">
                                                    -{formatoMoneda(
                                                        dia.totalGastos
                                                    )}
                                                </td>

                                                <td>
                                                    <strong>
                                                        {formatoMoneda(
                                                            dia.flujoNeto
                                                        )}
                                                    </strong>
                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </section>

                </>

            )}

        </Layout>

    );

}

export default Reportes;