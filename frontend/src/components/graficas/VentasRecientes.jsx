import { formatoPesos } from "../../utils/graficasUtils";


const NOMBRES_METODO = {
    EFECTIVO: "Efectivo",
    TARJETA: "Tarjeta",
    TRANSFERENCIA: "Transferencia",
};


function formatoFechaCorta(fecha) {

    if (!fecha) return "—";

    return new Date(fecha).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

}


function metodosTexto(metodos) {

    if (!metodos) return "—";

    return String(metodos)
        .split(",")
        .map((m) => NOMBRES_METODO[m] || m)
        .join(", ");

}


/*
 * Tabla de las últimas ventas.
 * Props: ventas = lista del historial de ventas (ya ordenada por fecha)
 */

function VentasRecientes({ ventas, limite = 6 }) {

    const filas = (ventas || []).slice(0, limite);

    if (filas.length === 0) {

        return (
            <p className="grafica-vacia">
                Aún no hay ventas registradas.
            </p>
        );

    }

    return (

        <div className="grafica-tabla">

            <table>

                <thead>

                    <tr>
                        <th>Venta</th>
                        <th>Fecha</th>
                        <th>Vendedor</th>
                        <th>Pago</th>
                        <th>Total</th>
                        <th>Estado</th>
                    </tr>

                </thead>

                <tbody>

                    {filas.map((venta) => (

                        <tr key={venta.id}>

                            <td>
                                <strong>{venta.numero_venta}</strong>
                            </td>

                            <td>{formatoFechaCorta(venta.confirmado_en)}</td>

                            <td>{venta.vendedor || "—"}</td>

                            <td>{metodosTexto(venta.metodos_pago)}</td>

                            <td>
                                <b>{formatoPesos(venta.monto_total)}</b>
                            </td>

                            <td>

                                <span
                                    className={`grafica-estado grafica-estado-${String(
                                        venta.estado || ""
                                    ).toLowerCase()}`}
                                >
                                    {venta.estado || "—"}
                                </span>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}

export default VentasRecientes;