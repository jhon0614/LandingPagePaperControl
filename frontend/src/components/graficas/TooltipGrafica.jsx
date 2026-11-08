
function TooltipGrafica({ active, payload, label, formato, etiquetaDe }) {

    if (!active || !payload || payload.length === 0) return null;

    const titulo = etiquetaDe
        ? etiquetaDe(payload[0].payload)
        : label ?? payload[0].payload?.name;

    return (

        <div className="grafica-tooltip">

            {titulo && (
                <strong className="grafica-tooltip-titulo">
                    {titulo}
                </strong>
            )}

            {payload.map((item) => (

                <div
                    className="grafica-tooltip-fila"
                    key={item.dataKey ?? item.name}
                >

                    <span
                        className="grafica-punto"
                        style={{
                            background:
                                item.color ||
                                item.payload?.fill ||
                                item.fill,
                        }}
                    ></span>

                    <span>{item.name}</span>

                    <b>
                        {formato
                            ? formato(item.value)
                            : item.value}
                    </b>

                </div>

            ))}

        </div>

    );

}

export default TooltipGrafica;