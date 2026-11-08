import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

import TooltipGrafica from "./TooltipGrafica";


/*
 * Dona genérica con total al centro y leyenda con porcentajes.
 * Props:
 *  - datos: [{ nombre, valor, color }]
 *  - formato: función para mostrar los valores (por defecto, número)
 *  - centroTitulo / centroTexto: texto dentro de la dona
 *  - horizontal: dona a la izquierda y leyenda a la derecha (más compacta)
 */

function GraficaDona({
    datos,
    formato = (valor) => valor,
    centroTitulo,
    centroTexto,
    alto = 190,
    horizontal = false,
}) {

    const total = datos.reduce((suma, d) => suma + d.valor, 0);

    const datosGrafica = datos.map((d) => ({
        name: d.nombre,
        value: d.valor,
        color: d.color,
    }));

    return (

        <div
            className={`grafica-dona ${horizontal ? "grafica-dona-horizontal" : ""}`}
        >

            <div
                className="grafica-dona-lienzo"
                style={{ height: alto }}
            >

                <ResponsiveContainer width="100%" height="100%">

                    <PieChart>

                        <Tooltip
                            content={<TooltipGrafica formato={formato} />}
                        />

                        <Pie
                            data={datosGrafica}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="68%"
                            outerRadius="94%"
                            paddingAngle={total > 0 ? 3 : 0}
                            cornerRadius={6}
                            stroke="none"
                            isAnimationActive={false}
                        >

                            {datosGrafica.map((d) => (
                                <Cell key={d.name} fill={d.color} />
                            ))}

                        </Pie>

                    </PieChart>

                </ResponsiveContainer>

                <div className="grafica-dona-centro">

                    <strong>{centroTitulo}</strong>

                    {centroTexto && <span>{centroTexto}</span>}

                </div>

            </div>

            <ul className="grafica-dona-leyenda">

                {datos.map((d) => (

                    <li key={d.nombre}>

                        <span
                            className="grafica-punto"
                            style={{ background: d.color }}
                        ></span>

                        <span className="grafica-dona-nombre">
                            {d.nombre}
                        </span>

                        <b>{formato(d.valor)}</b>

                        <small>
                            {total > 0
                                ? `${Math.round((d.valor / total) * 100)} %`
                                : "0 %"}
                        </small>

                    </li>

                ))}

            </ul>

        </div>

    );

}

export default GraficaDona;