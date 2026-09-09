import { apiFetch } from "./api";

export async function obtenerCategorias() {

    const respuesta = await apiFetch("/api/categorias");

    return respuesta.datos.categorias;

}

export async function crearCategoria(nombre) {

    const respuesta = await apiFetch(
        "/api/categorias",
        {
            method: "POST",

            body: JSON.stringify({ nombre }),
        }
    );

    return respuesta.datos.categoria;

}

export async function actualizarCategoria(id, nombre) {

    const respuesta = await apiFetch(
        `/api/categorias/${id}`,
        {
            method: "PATCH",

            body: JSON.stringify({ nombre }),
        }
    );

    return respuesta.datos.categoria;

}

export async function eliminarCategoria(id) {

    await apiFetch(
        `/api/categorias/${id}`,
        {
            method: "DELETE",
        }
    );

}