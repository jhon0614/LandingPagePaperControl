const API_URL = import.meta.env.VITE_API_URL;


let tokenEnMemoria = null;

let refrescoEnCurso = null;


export function establecerToken(token) {
    tokenEnMemoria = token || null;
}

export function obtenerToken() {
    return tokenEnMemoria;
}

export function limpiarToken() {
    tokenEnMemoria = null;
}


/*
=========================================================
RENOVAR SESIÓN USANDO LA COOKIE HTTPONLY
=========================================================
*/

async function renovarToken() {

    if (refrescoEnCurso) {

        return refrescoEnCurso;

    }

    refrescoEnCurso = (async () => {

        const respuesta = await fetch(
            `${API_URL}/api/auth/refresh`,
            {
                method: "POST",
                credentials: "include",
            }
        );

        if (!respuesta.ok) {

            throw new Error(
                "No fue posible renovar la sesión."
            );

        }

        const datos = await respuesta.json();

        const token = datos?.datos?.tokenAcceso;

        const usuario = datos?.datos?.usuario;

        if (!token) {

            throw new Error(
                "Respuesta de renovación inválida."
            );

        }

        establecerToken(token);

        if (usuario) {

            localStorage.setItem(
                "usuario",
                JSON.stringify(usuario)
            );

        }

        return token;

    })();

    try {

        return await refrescoEnCurso;

    } finally {

        refrescoEnCurso = null;

    }

}


/*
=========================================================
INTENTAR RESTAURAR LA SESIÓN AL CARGAR LA APP
=========================================================
*/

export async function restaurarSesion() {

    try {

        await renovarToken();

        return true;

    } catch (error) {

        limpiarToken();

        localStorage.removeItem("usuario");

        return false;

    }

}


/*
=========================================================
CLIENTE API
=========================================================
*/

export async function apiFetch(
    endpoint,
    opciones = {},
    reintentando = false
) {

    const headers = {
        ...opciones.headers,
    };

    if (tokenEnMemoria) {

        headers.Authorization =
            `Bearer ${tokenEnMemoria}`;

    }

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
     * Token vencido: intentamos renovar UNA vez
     * y repetir la petición original.
     */

    if (
        respuesta.status === 401 &&
        !reintentando &&
        endpoint !== "/api/auth/refresh"
    ) {

        try {

            await renovarToken();

            return apiFetch(endpoint, opciones, true);

        } catch (error) {

            limpiarToken();

            localStorage.removeItem("usuario");

            window.location.hash = "#/login";

            throw error;

        }

    }


    if (respuesta.status === 204) {

        return null;

    }


    let datos = null;

    try {

        datos = await respuesta.json();

    } catch {

        datos = null;

    }


    if (!respuesta.ok) {

        const error = new Error(
            datos?.error?.mensaje ||
            datos?.mensaje ||
            "Ocurrió un error en la petición."
        );

        error.status = respuesta.status;

        error.codigo = datos?.error?.codigo;

        error.detalles = datos?.error?.detalles;

        throw error;

    }

    return datos;

}