import { apiFetch } from "./api";
import { obtenerHistorialTurnos, obtenerGastosDeTurno } from "./caja.service";

export async function obtenerProductosMasVendidos({ periodo, desde, hasta } = {}) {

    const parametros = new URLSearchParams();

    if (periodo) parametros.append("periodo", periodo);
    if (desde) parametros.append("desde", desde);
    if (hasta) parametros.append("hasta", hasta);

    const query = parametros.toString();

    const respuesta = await apiFetch(
        `/api/reportes/productos-mas-vendidos${query ? `?${query}` : ""}`
    );

    return respuesta.datos.productos;

}

export async function obtenerReporteCaja({ desde, hasta, vendedorId } = {}) {

    const parametros = new URLSearchParams();

    parametros.append("desde", desde);
    parametros.append("hasta", hasta);

    if (vendedorId) {

        parametros.append("vendedorId", vendedorId);

    }

    const respuesta = await apiFetch(
        `/api/reportes/caja?${parametros.toString()}`
    );

    return respuesta.datos.reporte;

}

/*
=========================================================
DETALLE DE GASTOS DEL REPORTE
=========================================================

El reporte de caja solo trae el total de gastos por día.
Aquí se reúne el detalle usando los mismos servicios del
historial de turnos de Caja.

- Se consultan los turnos desde un día antes, porque un
  turno puede abrir un día y registrar gastos al siguiente.
- Solo se piden los gastos de turnos con totalGastos > 0.
- Se descartan los gastos fuera del rango y, si hay
  vendedor, los que registró otra persona.
- "cuadra" indica si el detalle suma lo mismo que el total
  de gastos de cada día del reporte.
*/

function fechaBogota(valor) {

    return new Date(valor).toLocaleDateString("en-CA", {
        timeZone: "America/Bogota",
    });

}

function restarDias(fechaTexto, cantidad) {

    const [anio, mes, dia] = fechaTexto.split("-").map(Number);

    return new Date(Date.UTC(anio, mes - 1, dia - cantidad))
        .toISOString()
        .slice(0, 10);

}

export async function obtenerDetalleGastos({
    desde,
    hasta,
    vendedorId,
    dias = [],
}) {

    const turnos = await obtenerHistorialTurnos({
        desde: restarDias(desde, 31),
        hasta,
    });

    const conGastos = turnos.filter(
        (turno) => Number(turno.totalGastos) > 0
    );

    const todos = [];

    // De 5 en 5 para no saturar el servidor con rangos largos
    for (let i = 0; i < conGastos.length; i += 5) {

        const grupo = conGastos.slice(i, i + 5);

        const listas = await Promise.all(
            grupo.map((turno) => obtenerGastosDeTurno(turno.id))
        );

        listas.forEach((lista) => todos.push(...lista));

    }

    const gastos = todos
        .map((gasto) => {

            const momento = gasto.ocurridoEn || gasto.creadoEn;

            return {
                id: gasto.id,
                usuarioId: gasto.usuarioId,
                momento,
                fecha: fechaBogota(momento),
                descripcion: gasto.descripcion || "",
                registradoPor: gasto.usuarioNombre || gasto.usuario || "—",
                monto: Number(gasto.monto || 0),
            };

        })
        .filter((gasto) => gasto.fecha >= desde && gasto.fecha <= hasta)
        .filter(
            (gasto) =>
                !vendedorId ||
                String(gasto.usuarioId) === String(vendedorId)
        )
        .sort((a, b) => new Date(a.momento) - new Date(b.momento));

    const centavosPorDia = {};

    gastos.forEach((gasto) => {
        centavosPorDia[gasto.fecha] =
            (centavosPorDia[gasto.fecha] || 0) +
            Math.round(gasto.monto * 100);
    });

    const cuadra =
        dias.every(
            (dia) =>
                (centavosPorDia[dia.fecha] || 0) ===
                Math.round(Number(dia.totalGastos || 0) * 100)
        ) &&
        Object.keys(centavosPorDia).every((fecha) =>
            dias.some((dia) => dia.fecha === fecha)
        );

    return { gastos, cuadra };

}