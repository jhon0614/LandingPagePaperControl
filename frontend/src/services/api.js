const API_URL = import.meta.env.VITE_API_URL;


/*
=========================================================
TOKEN EN MEMORIA
=========================================================
*/

let tokenEnMemoria = null;


/*
=========================================================
GUARDAR TOKEN
=========================================================
*/

export function establecerToken(token) {
    tokenEnMemoria = token || null;
}


/*
=========================================================
OBTENER TOKEN
=========================================================
*/

export function obtenerToken() {
    return tokenEnMemoria;
}


/*
=========================================================
LIMPIAR TOKEN
=========================================================
*/

export function limpiarToken() {
    tokenEnMemoria = null;
}


/*
=========================================================
CLIENTE API
=========================================================
*/

export async function apiFetch(
    endpoint,
    opciones = {}
) {

    const headers = {
        ...opciones.headers,
    };


    /*
     * El token se obtiene únicamente
     * desde memoria.
     */

    if (tokenEnMemoria) {

        headers.Authorization =
            `Bearer ${tokenEnMemoria}`;

    }


    /*
     * Agregar Content-Type solamente
     * cuando existe un body.
     */

    if (opciones.body) {

        headers["Content-Type"] =
            "application/json";

    }


    const respuesta = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...opciones,
            headers,
            credentials: "include",
        }
    );


    /*
     * Respuesta sin contenido.
     */

    if (respuesta.status === 204) {

        return null;

    }


    let datos = null;


    try {

        datos = await respuesta.json();

    } catch {

        datos = null;

    }


    /*
     * Manejo uniforme de errores.
     */

    if (!respuesta.ok) {

        const error = new Error(
            datos?.error?.mensaje ||
            datos?.mensaje ||
            "Ocurrió un error en la petición."
        );


        error.status =
            respuesta.status;


        error.codigo =
            datos?.error?.codigo;


        error.detalles =
            datos?.error?.detalles;


        throw error;

    }


    return datos;
}