function TarjetaGrafica({
    titulo,
    subtitulo,
    acciones,
    className = "",
    children,
}) {

    return (

        <section className={`grafica-tarjeta ${className}`}>

            <header className="grafica-tarjeta-header">

                <div>

                    <h3>{titulo}</h3>

                    {subtitulo && <p>{subtitulo}</p>}

                </div>

                {acciones && (
                    <div className="grafica-tarjeta-acciones">
                        {acciones}
                    </div>
                )}

            </header>

            {children}

        </section>

    );

}

export default TarjetaGrafica;