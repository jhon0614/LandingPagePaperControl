import {useEffect, useState} from "react";
import Layout from "../components/Layout";
import "../styles/Dashboard.css";
import "../styles/Reportes.css";
import {
    obtenerReporteCaja,
    obtenerProductosMasVendidos,
} from "../services/reportes.service";
import { obtenerUsuarios } from "../services/usuarios.service";
import CampoFecha from "../components/CampoFecha";
import "../styles/Graficas.css";
import TarjetaGrafica from "../components/graficas/TarjetaGrafica";
import GraficaVentasGastos from "../components/graficas/GraficaVentasGastos";
import GraficaMetodosPago from "../components/graficas/GraficaMetodosPago";
import GraficaProductosMasVendidos from "../components/graficas/GraficaProductosMasVendidos";
import {
    exportarReporteCajaExcel,
    exportarReporteCajaPDF,
} from "../utils/exportarReporteCaja";

function formatoMoneda(valor) {
    const numero = Number(valor || 0);
    const texto = `$${Math.abs(numero).toLocaleString("es-CO")}`;

    return numero < 0 ? `-${texto}` : texto;
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

    const [periodoProductos, setPeriodoProductos] = useState("mes");

    const [productosMasVendidos, setProductosMasVendidos] = useState([]);

    const [cargandoProductos, setCargandoProductos] = useState(false);

    const [errorProductos, setErrorProductos] = useState("");

    const [consultadoProductos, setConsultadoProductos] = useState(false);
    
    const [exportando, setExportando] = useState("");

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

        async function consultarProductosMasVendidos() {

        setErrorProductos("");
        setConsultadoProductos(false);

        try {

            setCargandoProductos(true);

            const parametros = {
                periodo: periodoProductos,
            };

            if (periodoProductos === "rango") {

                if (!desde || !hasta) {

                    setErrorProductos(
                        "Selecciona la fecha de inicio y de fin para consultar el rango."
                    );

                    return;
                }

                if ((new Date(hasta) - new Date(desde)) / (1000 * 60 * 60 * 24) > 366) {

                    setErrorProductos(
                        "El rango máximo permitido es de 366 días."
                    );

                    return;
                }

                parametros.desde = desde;
                parametros.hasta = hasta;

            }

            const productos = await obtenerProductosMasVendidos(parametros);

            setProductosMasVendidos(productos || []);
            setConsultadoProductos(true);

        } catch (error) {

            setProductosMasVendidos([]);

            setErrorProductos(
                error.message ||
                "No fue posible consultar los productos más vendidos."
            );

        } finally {

            setCargandoProductos(false);

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

    async function exportarReporte(tipo) {

        if (!reporte) return;

        const usuario = usuarios.find((u) => String(u.id) === String(vendedorId));

        const filtros = {
            desde: reporte.desde || desde,
            hasta: reporte.hasta || hasta,
            vendedor: usuario
                ? `${usuario.nombres} ${usuario.apellidos}`
                : "Todos",
        };

        try {

            setExportando(tipo);

            if (tipo === "excel") {
                await exportarReporteCajaExcel(reporte, filtros);
            } else {
                await exportarReporteCajaPDF(reporte, filtros);
            }

        } catch {

            setError("No fue posible exportar el reporte.");

        } finally {

            setExportando("");

        }

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

                    <CampoFecha
                        id="reporte-desde"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        disabled={cargando}
                    />

                </div>

                <div className="reportes-filtro">

                    <label htmlFor="reporte-hasta">Hasta</label>

                    <CampoFecha
                        id="reporte-hasta"
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

            <section className="reportes-productos-panel">

                <div className="reportes-productos-cabecera">
                    <div>
                        <h2>Productos más vendidos</h2>
                        <p>
                            Consulta las unidades vendidas por producto según el período seleccionado.
                        </p>
                    </div>

                    <div className="reportes-productos-filtros">

                        <div className="reportes-filtro">
                            <label htmlFor="productos-periodo">Período</label>

                            <select
                                id="productos-periodo"
                                value={periodoProductos}
                                onChange={(e) => setPeriodoProductos(e.target.value)}
                                disabled={cargandoProductos}
                            >
                                <option value="semana">Esta semana</option>
                                <option value="mes">Este mes</option>
                                <option value="rango">Rango de fechas</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            className="btn-consultar-reporte"
                            onClick={consultarProductosMasVendidos}
                            disabled={cargandoProductos}
                        >
                            {cargandoProductos ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    Consultando...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-chart-column"></i>
                                    Consultar productos
                                </>
                            )}
                        </button>

                    </div>
                </div>

                {periodoProductos === "rango" && (
                    <div className="reportes-productos-rango">

                        <div className="reportes-filtro">
                            <label htmlFor="productos-desde">Desde</label>

                            <CampoFecha
                                id="productos-desde"
                                value={desde}
                                onChange={(e) => setDesde(e.target.value)}
                                disabled={cargandoProductos}
                            />
                        </div>

                        <div className="reportes-filtro">
                            <label htmlFor="productos-hasta">Hasta</label>

                            <CampoFecha
                                id="productos-hasta"
                                value={hasta}
                                onChange={(e) => setHasta(e.target.value)}
                                disabled={cargandoProductos}
                            />
                        </div>

                    </div>
                )}

                {errorProductos && (
                    <div className="caja-error">
                        {errorProductos}
                    </div>
                )}

                {!cargandoProductos &&
                    consultadoProductos &&
                    productosMasVendidos.length === 0 && (
                        <p className="caja-gastos-vacio">
                            No hay productos vendidos en el período seleccionado.
                        </p>
                    )}

                {!cargandoProductos &&
                    productosMasVendidos.length > 0 && (
                        <div className="reportes-productos-grafico">
                            <GraficaProductosMasVendidos
                                productos={productosMasVendidos}
                            />
                        </div>
                    )}

            </section>

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

                        <div className="graficas-fila graficas-fila-amplia">

                            <TarjetaGrafica
                                titulo="Ventas y gastos"
                                subtitulo="Movimiento diario del período consultado"
                            >
                                <GraficaVentasGastos
                                    dias={reporte.dias}
                                    desde={reporte.desde}
                                    hasta={reporte.hasta}
                                />
                            </TarjetaGrafica>

                            <TarjetaGrafica
                                titulo="Métodos de pago"
                                subtitulo="Ventas del período"
                            >
                                <GraficaMetodosPago
                                    ventasPorMetodo={reporte.resumen.ventasPorMetodo}
                                />
                            </TarjetaGrafica>

                        </div>
                        
                    {/* =============================================
                        TABLA DIARIA
                    ============================================= */}

                    <section className="reportes-tabla-panel">

                        <div className="reportes-tabla-encabezado">

                            <h2>Detalle diario</h2>

                            <div className="reportes-exportar">

                                <button
                                    type="button"
                                    className="btn-exportar"
                                    onClick={() => exportarReporte("excel")}
                                    disabled={exportando !== ""}
                                >
                                    <i className="fa-solid fa-file-excel"></i>
                                    {exportando === "excel" ? "Generando..." : "Exportar Excel"}
                                </button>

                                <button
                                    type="button"
                                    className="btn-exportar"
                                    onClick={() => exportarReporte("pdf")}
                                    disabled={exportando !== ""}
                                >
                                    <i className="fa-solid fa-file-pdf"></i>
                                    {exportando === "pdf" ? "Generando..." : "Exportar PDF"}
                                </button>

                            </div>

                        </div>

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