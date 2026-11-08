import GraficaDona from "./GraficaDona";
import { COLORES, formatoPesos } from "../../utils/graficasUtils";


/*
 * Ventas por método de pago (efectivo, tarjeta, transferencia).
 * Props: ventasPorMetodo = reporte.resumen.ventasPorMetodo
 */

function GraficaMetodosPago({ ventasPorMetodo }) {

    const datos = [
        {
            nombre: "Efectivo",
            valor: Number(ventasPorMetodo?.efectivo || 0),
            color: COLORES.primario,
        },
        {
            nombre: "Tarjeta",
            valor: Number(ventasPorMetodo?.tarjeta || 0),
            color: COLORES.celadon,
        },
        {
            nombre: "Transferencia",
            valor: Number(ventasPorMetodo?.transferencia || 0),
            color: COLORES.oscuro,
        },
    ];

    const total = datos.reduce((suma, d) => suma + d.valor, 0);

    if (total === 0) {

        return (
            <p className="grafica-vacia">
                No hay ventas registradas en este período.
            </p>
        );

    }

    return (

        <GraficaDona
            datos={datos}
            formato={formatoPesos}
            centroTitulo={formatoPesos(total)}
            centroTexto="Total ventas"
        />

    );

}

export default GraficaMetodosPago;