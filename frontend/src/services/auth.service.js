import {
    apiFetch,
    establecerToken,
    limpiarToken,
} from "./api";

/*
=========================================================
LOGIN
=========================================================
*/

export async function login(
    correo,
    contrasena
) {

    /*
     * El login es una ruta pública.
     */

    const respuesta = await apiFetch(
        "/api/auth/login",
        {
            method: "POST",

            body: JSON.stringify({
                correo,
                contrasena,
            }),
        }
    );


    /*
     * El backend devuelve:
     *
     * respuesta.datos.usuario
     * respuesta.datos.tokenAcceso
     *
     * respuesta.datos.usuario.debeCambiarContrasena
     */

    const token =
        respuesta?.datos?.tokenAcceso;


    /*
     * El token se mantiene únicamente
     * en memoria.
     */

    if (token) {

        establecerToken(token);

    }


    return respuesta;
}


/*
=========================================================
CAMBIAR CONTRASEÑA
=========================================================
*/

export async function cambiarContrasena(
    datos
) {

    const respuesta = await apiFetch(
        "/api/auth/contrasena",
        {
            method: "PATCH",

            body: JSON.stringify({

                contrasenaActual:
                    datos.contrasenaActual,

                contrasenaNueva:
                    datos.contrasenaNueva,

            }),
        }
    );


    return respuesta;
}


/*
=========================================================
SOLICITAR RESTABLECIMIENTO
"OLVIDÉ MI CONTRASEÑA"
=========================================================
*/

export async function solicitarRestablecimiento(
    correo
) {

    const respuesta = await apiFetch(
        "/api/auth/olvide-contrasena",
        {
            method: "POST",

            body: JSON.stringify({
                correo,
            }),
        }
    );


    return respuesta;
}


/*
=========================================================
RESTABLECER CONTRASEÑA
DESDE EL ENLACE DEL CORREO
=========================================================
*/

export async function restablecerContrasena(
    token,
    contrasenaNueva
) {

    const respuesta = await apiFetch(
        "/api/auth/restablecer-contrasena",
        {
            method: "POST",

            body: JSON.stringify({

                token,

                contrasenaNueva,

            }),
        }
    );


    return respuesta;
}


/*
=========================================================
CERRAR SESIÓN
=========================================================
*/

export async function cerrarSesion() {

    try {

        await apiFetch(
            "/api/auth/logout",
            {
                method: "POST",
            }
        );

    } catch (error) {

        // Si el logout en backend falla, igual limpiamos
        // el estado local para no dejar la sesión "colgada".

    } finally {

        limpiarToken();

        localStorage.removeItem("usuario");

    }

}