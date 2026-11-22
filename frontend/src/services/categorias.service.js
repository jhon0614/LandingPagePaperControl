import { apiFetch } from "./api";

export async function obtenerCategorias({ refrescar = false } = {}) {

    const respuesta = await apiFetch(refrescar ? "/api/categorias?refrescar=true" : "/api/categorias");

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