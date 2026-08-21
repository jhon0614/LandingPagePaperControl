import { useEffect, useState } from "react";
import { obtenerAlertasStock } from "../services/productos.service";
import "../styles/AlertaStockBajo.css";

function AlertaStockBajo() {

    const [alertas, setAlertas] = useState([]);

    const [cargando, setCargando] = useState(true);

    const [error, setError] = useState("");

    useEffect(() => {

        async function cargar() {

            try {

                const datos = await obtenerAlertasStock();

                setAlertas(datos);

            } catch (error) {

                setError(
                    "No fue posible cargar las alertas de stock."
                );

            } finally {

                setCargando(false);

            }

        }

        cargar();

    }, []);

    if (cargando) {

        return (

            <div className="alerta-stock-panel">

                <h2>Alertas de stock bajo</h2>

                <p className="alerta-stock-cargando">
                    Cargando...
                </p>

            </div>

        );

    }

    return (

        <div className="alerta-stock-panel">

            <h2>

                <i className="fa-solid fa-triangle-exclamation"></i>

                Alertas de stock bajo

            </h2>

            {error && (
                <p className="alerta-stock-error">{error}</p>
            )}

            {alertas.length === 0 ? (

                <p className="alerta-stock-vacio">
                    No hay productos con stock bajo por ahora.
                </p>

            ) : (

                <div className="alerta-stock-lista">

                    {alertas.map((producto) => (

                        <div
                            className="alerta-stock-item"
                            key={producto.id}
                        >

                            <div className="alerta-stock-info">

                                <strong>{producto.nombre}</strong>

                                <span>
                                    Stock: {producto.stock} / mín.{" "}
                                    {producto.stockMinimo}
                                </span>

                            </div>

                            <div className="alerta-stock-proveedores">

                                {producto.proveedores?.length > 0 ? (

                                    producto.proveedores.map(
                                        (proveedor) => (

                                            <span
                                                className="alerta-stock-proveedor-chip"
                                                key={proveedor.id}
                                            >
                                                <i className="fa-solid fa-truck"></i>
                                                {proveedor.nombre}
                                            </span>

                                        )
                                    )

                                ) : (

                                    <span className="alerta-stock-sin-proveedor">
                                        Sin proveedor asociado
                                    </span>

                                )}

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}

export default AlertaStockBajo;