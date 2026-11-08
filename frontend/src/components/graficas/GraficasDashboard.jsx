import { useEffect, useState } from "react";

import { obtenerReporteCaja } from "../../services/reportes.service";
import { obtenerProductos } from "../../services/productos.service";
import { obtenerHistorialVentas } from "../../services/ventas.service";

import TarjetaGrafica from "./TarjetaGrafica";
import GraficaVentasGastos from "./GraficaVentasGastos";
import GraficaNivelStock from "./GraficaNivelStock";
import GraficaMetodosPago from "./GraficaMetodosPago";
import VentasRecientes from "./VentasRecientes";
import { hoyTexto } from "../../utils/graficasUtils";

import "../../styles/Graficas.css";


/*
 * Bloque de gráficas del dashboard de Administrador y Dueño.
 */

function GraficasDashboard() {

    const [dias, setDias] = useState(30);

    // Resultado del reporte: guarda para qué período se pidió, así
    // "cargando" se deduce comparando con el período elegido.
    const [resultado, setResultado] = useState(null);

    const [productos, setProductos] = useState([]);

    const [ventas, setVentas] = useState([]);


    useEffect(() => {

        let vigente = true;

        const desde = hoyTexto(dias - 1);
        const hasta = hoyTexto();

        obtenerReporteCaja({ desde, hasta })
            .then((reporte) => {
                if (vigente) setResultado({ dias, reporte });
            })
            .catch(() => {
                if (vigente) setResultado({ dias, reporte: null });
            });

        return () => {
            vigente = false;
        };

    }, [dias]);


    useEffect(() => {

        let vigente = true;

        obtenerProductos()
            .then((lista) => {
                if (vigente) setProductos(lista || []);
            })
            .catch(() => {});

        obtenerHistorialVentas({ orden: "fecha" })
            .then((lista) => {
                if (vigente) setVentas(lista || []);
            })
            .catch(() => {});

        return () => {
            vigente = false;
        };

    }, []);


    const cargando = resultado?.dias !== dias;

    const reporte = cargando ? null : resultado.reporte;


    const selectorPeriodo = (

        <select
            className="grafica-select"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            aria-label="Período de las ventas"
        >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
        </select>

    );


    return (

        <>

            <div className="graficas-fila graficas-fila-amplia">

                <TarjetaGrafica
                    titulo="Ventas y gastos"
                    subtitulo="Movimiento diario de caja"
                    acciones={selectorPeriodo}
                >

                    {cargando ? (

                        <p className="grafica-vacia">Cargando...</p>

                    ) : reporte ? (

                        <GraficaVentasGastos
                            dias={reporte.dias}
                            desde={reporte.desde}
                            hasta={reporte.hasta}
                        />

                    ) : (

                        <p className="grafica-vacia">
                            No fue posible cargar las ventas.
                        </p>

                    )}

                </TarjetaGrafica>

                <TarjetaGrafica
                    titulo="Nivel de stock"
                    subtitulo="Productos activos"
                >

                    <GraficaNivelStock productos={productos} />

                </TarjetaGrafica>

            </div>

            <div className="graficas-fila graficas-fila-amplia">

                <TarjetaGrafica
                    titulo="Ventas recientes"
                    subtitulo="Últimas ventas registradas"
                >

                    <VentasRecientes ventas={ventas} />

                </TarjetaGrafica>

                <TarjetaGrafica
                    titulo="Métodos de pago"
                    subtitulo={`Últimos ${dias} días`}
                >

                    {cargando || !reporte ? (

                        <p className="grafica-vacia">
                            {cargando ? "Cargando..." : "Sin datos."}
                        </p>

                    ) : (

                        <GraficaMetodosPago
                            ventasPorMetodo={reporte.resumen.ventasPorMetodo}
                        />

                    )}

                </TarjetaGrafica>

            </div>

        </>

    );

}

export default GraficasDashboard;