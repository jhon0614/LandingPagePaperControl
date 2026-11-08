import { useMemo } from "react";
import {
    Bar,
    BarChart,
    Cell,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import GraficaDona from "./GraficaDona";
import TooltipGrafica from "./TooltipGrafica";
import { COLORES } from "../../utils/graficasUtils";


/*
 * Nivel de stock de los productos activos:
 * agotados (stock 0), stock bajo (hasta el mínimo) y stock normal.
 * Props: productos = lista de /api/productos (estaActivo, stock, stockMinimo)
 */

function GraficaNivelStock({ productos }) {

    const datos = useMemo(() => {

        const activos = (productos || []).filter((p) => p.estaActivo);

        const agotados = activos.filter(
            (p) => Number(p.stock) === 0
        ).length;

        const bajos = activos.filter(
            (p) =>
                Number(p.stock) > 0 &&
                Number(p.stock) <= Number(p.stockMinimo)
        ).length;

        return [
            { nombre: "Agotados", valor: agotados, color: COLORES.rojo },
            { nombre: "Stock bajo", valor: bajos, color: COLORES.naranja },
            {
                nombre: "Normal",
                valor: activos.length - agotados - bajos,
                color: COLORES.primario,
            },
        ];

    }, [productos]);

    const total = datos.reduce((suma, d) => suma + d.valor, 0);

    if (total === 0) {

        return (
            <p className="grafica-vacia">
                No hay productos activos para mostrar.
            </p>
        );

    }

    const datosBarras = datos.map((d) => ({
        name: d.nombre,
        value: d.valor,
        color: d.color,
    }));

    return (

        <div className="grafica-stock">

            <div className="grafica-stock-barras">

                <ResponsiveContainer width="100%" height={150}>

                    <BarChart
                        data={datosBarras}
                        margin={{ top: 18, right: 4, left: 4, bottom: 0 }}
                    >

                        <XAxis
                            dataKey="name"
                            interval={0}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: COLORES.texto }}
                        />

                        <YAxis hide allowDecimals={false} />

                        <Tooltip
                            cursor={{ fill: "rgba(5, 120, 138, 0.06)" }}
                            content={<TooltipGrafica />}
                        />

                        <Bar
                            dataKey="value"
                            name="Productos"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={44}
                            isAnimationActive={false}
                        >

                            {datosBarras.map((d) => (
                                <Cell key={d.name} fill={d.color} />
                            ))}

                            <LabelList
                                dataKey="value"
                                position="top"
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    fill: COLORES.oscuro,
                                }}
                            />

                        </Bar>

                    </BarChart>

                </ResponsiveContainer>

            </div>

            <GraficaDona
                datos={datos}
                centroTitulo={total}
                centroTexto="Productos"
                alto={130}
                horizontal
            />

        </div>

    );

}

export default GraficaNivelStock;