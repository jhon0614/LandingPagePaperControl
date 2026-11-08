import { useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import TooltipGrafica from "./TooltipGrafica";
import {
    COLORES,
    completarDias,
    formatoPesos,
    formatoPesosCorto,
} from "../../utils/graficasUtils";


/*
 * Área de ventas y gastos por día.
 * Props: dias (reporte.dias), desde y hasta (AAAA-MM-DD), alto.
 */

function GraficaVentasGastos({ dias, desde, hasta, alto = 290 }) {

    const datos = useMemo(
        () => completarDias(dias, desde, hasta),
        [dias, desde, hasta]
    );

    const hayMovimiento = datos.some(
        (d) => d.ventas > 0 || d.gastos > 0
    );

    if (!hayMovimiento) {

        return (
            <p className="grafica-vacia">
                No hay ventas ni gastos registrados en este período.
            </p>
        );

    }

    return (

        <div>

            <ul className="grafica-leyenda">
                <li>
                    <span
                        className="grafica-punto"
                        style={{ background: COLORES.primario }}
                    ></span>
                    Ventas
                </li>
                <li>
                    <span
                        className="grafica-punto"
                        style={{ background: COLORES.celadon }}
                    ></span>
                    Gastos
                </li>
            </ul>

            <ResponsiveContainer width="100%" height={alto}>

                <AreaChart
                    data={datos}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >

                    <defs>

                        <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORES.primario} stopOpacity={0.55} />
                            <stop offset="100%" stopColor={COLORES.primario} stopOpacity={0.04} />
                        </linearGradient>

                        <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORES.celadon} stopOpacity={0.75} />
                            <stop offset="100%" stopColor={COLORES.celadon} stopOpacity={0.05} />
                        </linearGradient>

                    </defs>

                    <CartesianGrid
                        vertical={false}
                        stroke={COLORES.rejilla}
                    />

                    <XAxis
                        dataKey="etiqueta"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: COLORES.texto }}
                        interval="preserveStartEnd"
                        minTickGap={28}
                    />

                    <YAxis
                        width={74}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: COLORES.texto }}
                        tickFormatter={formatoPesosCorto}
                    />

                    <Tooltip
                        cursor={{ stroke: COLORES.primario, strokeDasharray: 4 }}
                        content={
                            <TooltipGrafica
                                formato={formatoPesos}
                                etiquetaDe={(fila) => fila.etiquetaLarga}
                            />
                        }
                    />

                    <Area
                        type="monotone"
                        dataKey="gastos"
                        name="Gastos"
                        stroke={COLORES.celadon}
                        strokeWidth={2.5}
                        fill="url(#gradGastos)"
                    />

                    <Area
                        type="monotone"
                        dataKey="ventas"
                        name="Ventas"
                        stroke={COLORES.primario}
                        strokeWidth={2.5}
                        fill="url(#gradVentas)"
                    />

                </AreaChart>

            </ResponsiveContainer>

        </div>

    );

}

export default GraficaVentasGastos;