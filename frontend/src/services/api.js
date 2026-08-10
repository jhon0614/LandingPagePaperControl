const API_URL = import.meta.env.VITE_API_URL;


    export async function apiFetch(
    endpoint,
    opciones = {}
    ) {

    const token = localStorage.getItem("token");


    const headers = {
        ...opciones.headers,
    };


    if (token) {

        headers.Authorization =
        `Bearer ${token}`;

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