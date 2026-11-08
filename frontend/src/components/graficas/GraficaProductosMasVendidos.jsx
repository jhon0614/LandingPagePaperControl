import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import TooltipGrafica from "./TooltipGrafica";
import { COLORES } from "../../utils/graficasUtils";


function acortar(texto, maximo = 17) {

    const limpio = String(texto || "");

    return limpio.length > maximo
        ? `${limpio.slice(0, maximo - 1)}…`
        : limpio;

}


/*
 * Barras horizontales de unidades vendidas por producto.
 * Props: productos = [{ nombre, cantidadVendida }]
 */

function GraficaProductosMasVendidos({ productos }) {

    const datos = (productos || []).map((p) => ({
        nombre: p.nombre,
        cantidadVendida: Number(p.cantidadVendida || 0),
    }));

    const alto = Math.max(160, datos.length * 46 + 30);

    return (

        <ResponsiveContainer width="100%" height={alto}>

            <BarChart
                data={datos}
                layout="vertical"
                margin={{ top: 4, right: 36, left: 4, bottom: 0 }}
            >

                <CartesianGrid
                    horizontal={false}
                    stroke={COLORES.rejilla}
                />

                <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: COLORES.texto }}
                />

                <YAxis
                    type="category"
                    dataKey="nombre"
                    width={160}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: COLORES.oscuro }}
                    tickFormatter={(nombre) => acortar(nombre)}
                />

                <Tooltip
                    cursor={{ fill: "rgba(5, 120, 138, 0.06)" }}
                    content={
                        <TooltipGrafica
                            etiquetaDe={(fila) => fila.nombre}
                        />
                    }
                />

                <Bar
                    dataKey="cantidadVendida"
                    name="Unidades vendidas"
                    fill={COLORES.primario}
                    radius={[0, 8, 8, 0]}
                    barSize={22}
                    isAnimationActive={false}
                >

                    <LabelList
                        dataKey="cantidadVendida"
                        position="right"
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            fill: COLORES.oscuro,
                        }}
                    />

                </Bar>

            </BarChart>

        </ResponsiveContainer>

    );

}

export default GraficaProductosMasVendidos;