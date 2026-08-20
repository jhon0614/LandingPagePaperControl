import { apiFetch } from "./api";

/*
=========================================================
TURNO ACTUAL
=========================================================

Devuelve el turno abierto (si existe) o null si no hay
ninguna caja abierta en este momento.
*/

export async function obtenerTurnoActual() {

    try {

        const respuesta = await apiFetch(
            "/api/turnos-caja/actual"
        );

        return respuesta?.datos?.turno || null;

    } catch (error) {

        // Si el backend responde 404 cuando no hay turno abierto,
        // lo tratamos como "no hay caja abierta" en vez de un error.
        if (error.status === 404) {

            return null;

        }

        throw error;

    }

}


/*
=========================================================
ABRIR CAJA
=========================================================
*/

export async function abrirCaja(montoInicial) {

    const respuesta = await apiFetch(
        "/api/turnos-caja/apertura",
        {
            method: "POST",

            body: JSON.stringify({
                montoInicial: Number(montoInicial),
            }),
        }
    );

    return respuesta.datos.turno;

}


/*
=========================================================
RESUMEN DEL TURNO
=========================================================

Ventas por método de pago, total de gastos y el monto
esperado en efectivo, calculados en vivo mientras
la caja sigue abierta.
*/

export async function obtenerResumenTurno() {

    const respuesta = await apiFetch(
        `/api/turnos-caja/resumen`
    );

    return respuesta.datos.resumen;

}


/*
=========================================================
GASTOS DE CAJA MENOR
=========================================================
*/

export async function obtenerGastosTurno() {

    const respuesta = await apiFetch(
        `/api/turnos-caja/gastos`
    );

    return respuesta.datos.gastos;

}

export async function registrarGasto(gasto) {

    const respuesta = await apiFetch(
        `/api/turnos-caja/gastos`,
        {
            method: "POST",

            body: JSON.stringify({
                descripcion: gasto.descripcion,
                monto: Number(gasto.monto),
            }),
        }
    );

    return respuesta.datos.gasto;

}

export async function eliminarGasto(idGasto) {

    await apiFetch(
        `/api/gastos-caja/${idGasto}`,
        {
            method: "DELETE",
        }
    );

}


/*
=========================================================
CIERRE DE CAJA
=========================================================
*/

export async function cerrarCaja(montoContado) {

    const respuesta = await apiFetch(
        `/api/turnos-caja/cierre`,
        {
            method: "POST",

            body: JSON.stringify({
                montoContado: Number(montoContado),
            }),
        }
    );

    return respuesta.datos.cuadre;

}


/*
=========================================================
HISTORIAL / REPORTES DE CAJA
=========================================================
*/

export async function obtenerHistorialTurnos({ desde, hasta } = {}) {

    const parametros = new URLSearchParams();

    if (desde) parametros.append("desde", desde);
    if (hasta) parametros.append("hasta", hasta);

    const query = parametros.toString();

    const respuesta = await apiFetch(
        `/api/turnos-caja${query ? `?${query}` : ""}`
    );

    return respuesta.datos.turnos;

}