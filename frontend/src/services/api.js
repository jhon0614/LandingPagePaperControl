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
RUTAS PÚBLICAS DE AUTENTICACIÓN
=========================================================

Un 401 en estas rutas significa credenciales inválidas o
token inválido, no una sesión vencida. Intentar renovar la
sesión en estos casos no tiene sentido (login incorrecto no
debe disparar un refresh).
*/

const RUTAS_PUBLICAS_AUTH = [
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/olvide-contrasena",
    "/api/auth/restablecer-contrasena",
];

function esRutaPublicaAuth(endpoint) {

    return RUTAS_PUBLICAS_AUTH.some(
        (ruta) => endpoint.startsWith(ruta)
    );

}


/*
=========================================================
LIMITACIÓN CONOCIDA — CORS Y Retry-After
=========================================================

El CORS actual del backend no expone el header Retry-After,
y el limitador de tasa (rate limiter) global se ejecuta antes
que CORS. Esto significa que, en solicitudes entre distintos
orígenes, algunos 429 pueden llegar al navegador como errores
de red genéricos en vez de una respuesta 429 legible (el
navegador bloquea la respuesta por falta de cabeceras CORS).

Por eso, más abajo, los errores de red se tratan como fallos
temporales (esFalloTemporal = true), igual que un 429 real:
no podemos distinguir uno del otro desde el frontend con la
configuración actual del backend. Esto es una dependencia
pendiente de resolver del lado del backend, no del frontend.
*/


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

        let respuesta;

        try {

            respuesta = await fetch(
                `${API_URL}/api/auth/refresh`,
                {
                    method: "POST",
                    credentials: "include",
                }
            );

        } catch {

            const error = new Error(
                "No fue posible conectar con el servidor para renovar la sesión."
            );

            error.status = null;
            error.codigo = null;
            error.detalles = null;
            error.esFalloTemporal = true;

            throw error;

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
                "No fue posible renovar la sesión."
            );

            error.status = respuesta.status;

            error.codigo = datos?.error?.codigo;

            error.detalles = datos?.error?.detalles;

            const retryAfterHeader =
                respuesta.headers.get("Retry-After");

            error.retryAfter = retryAfterHeader
                ? Number(retryAfterHeader)
                : null;

            /*
             * 429 y 5xx son fallos temporales del servidor:
             * la sesión podría seguir siendo válida.
             *
             * 401/403 significan que el refresh token en sí
             * es inválido, venció, o fue revocado: ahí sí la
             * sesión no es válida.
             */

            error.esFalloTemporal =
                respuesta.status === 429 ||
                respuesta.status >= 500;

            throw error;

        }

        const token = datos?.datos?.tokenAcceso;

        const usuario = datos?.datos?.usuario;

        if (!token) {

            const error = new Error(
                "Respuesta de renovación inválida."
            );

            error.esFalloTemporal = false;

            throw error;

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

Devuelve un objeto con tres posibles estados:

- { estado: "ok" }
  La sesión se renovó correctamente.

- { estado: "invalida" }
  El refresh token no existe, venció, o fue revocado.
  Se limpia el estado local: el usuario debe iniciar sesión.

- { estado: "temporal", mensaje, retryAfter }
  Fallo pasajero (429, red, 5xx). NO se borra la sesión local:
  el usuario podría seguir autenticado, solo no se pudo
  confirmar en este momento. Se debe ofrecer reintentar.
*/

export async function restaurarSesion() {

    try {

        await renovarToken();

        return { estado: "ok" };

    } catch (error) {

        if (error?.esFalloTemporal) {

            return {
                estado: "temporal",
                mensaje: error.message,
                retryAfter: error.retryAfter ?? null,
            };

        }

        limpiarToken();

        localStorage.removeItem("usuario");

        return { estado: "invalida" };

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

    let respuesta;

    try {

        respuesta = await fetch(
            `${API_URL}${endpoint}`,
            {
                ...opciones,
                headers,
                credentials: "include",
            }
        );

    } catch {

        const error = new Error(
            "No fue posible conectar con el servidor. Verifica tu conexión e intenta de nuevo."
        );

        error.status = null;
        error.codigo = null;
        error.detalles = null;
        error.esFalloTemporal = true;

        throw error;

    }


    /*
     * Token vencido: intentamos renovar UNA vez y repetir
     * la petición original — excepto en rutas públicas de
     * autenticación, donde un 401 significa credenciales
     * inválidas, no sesión vencida.
     */

    if (
        respuesta.status === 401 &&
        !reintentando &&
        !esRutaPublicaAuth(endpoint)
    ) {

        try {

            await renovarToken();

            return apiFetch(endpoint, opciones, true);

        } catch (error) {

            if (!error?.esFalloTemporal) {

                /*
                 * El refresh token realmente es inválido:
                 * la sesión no es recuperable, hay que cerrarla.
                 */

                limpiarToken();

                localStorage.removeItem("usuario");

                window.location.hash = "#/login";

            }

            /*
             * Si es un fallo temporal (429, red, 5xx), NO
             * cerramos sesión: dejamos que la pantalla que
             * hizo la petición original muestre el error y
             * permita reintentar.
             */

            throw error;

        }

    }


    if (respuesta.status === 429) {

        let datos = null;

        try {

            datos = await respuesta.json();

        } catch {

            datos = null;

        }

        const error = new Error(
            datos?.error?.mensaje ||
            datos?.mensaje ||
            "Demasiadas solicitudes. Intenta de nuevo en un momento."
        );

        error.status = 429;

        error.codigo = datos?.error?.codigo;

        error.detalles = datos?.error?.detalles;

        const retryAfterHeader =
            respuesta.headers.get("Retry-After");

        error.retryAfter = retryAfterHeader
            ? Number(retryAfterHeader)
            : null;

        error.esFalloTemporal = true;

        throw error;

    }


    if (respuesta.status === 204) {

        return null;

    }


    let datos;

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

        error.esFalloTemporal = respuesta.status >= 500;

        throw error;

    }

    return datos;

}