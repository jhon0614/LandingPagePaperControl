import { apiFetch } from "./api";


export async function obtenerClientes({ incluirInactivos = false } = {}) {

    const query = incluirInactivos
        ? "?incluirInactivos=true"
        : "";

    const respuesta = await apiFetch(`/api/clientes${query}`);

    return respuesta.datos.clientes;

}


export async function obtenerCliente(id) {

    const respuesta = await apiFetch(
        `/api/clientes/${id}`
    );

    return respuesta.datos.cliente;

}


export async function crearCliente(cliente) {

    const respuesta = await apiFetch(
        "/api/clientes",
        {
            method: "POST",

            body: JSON.stringify({
                nombres: cliente.nombres,
                apellidos: cliente.apellidos,
                documento: cliente.documento,
                telefono: cliente.telefono,
                correo: cliente.correo,
            }),
        }
    );

    return respuesta.datos.cliente;

}


export async function actualizarCliente(
    id,
    cliente
) {

    const cuerpo = {};


    if (cliente.nombres !== undefined) {
        cuerpo.nombres = cliente.nombres;
    }

    if (cliente.apellidos !== undefined) {
        cuerpo.apellidos = cliente.apellidos;
    }

    if (cliente.documento !== undefined) {
        cuerpo.documento = cliente.documento;
    }

    if (cliente.telefono !== undefined) {
        cuerpo.telefono = cliente.telefono;
    }

    if (cliente.correo !== undefined) {
        cuerpo.correo = cliente.correo;
    }


    const respuesta = await apiFetch(
        `/api/clientes/${id}`,
        {
            method: "PATCH",

            body: JSON.stringify(cuerpo),
        }
    );

    return respuesta.datos.cliente;

}


export async function cambiarEstadoCliente(
    id,
    estaActivo
) {

    const respuesta = await apiFetch(
        `/api/clientes/${id}/estado`,
        {
            method: "PATCH",

            body: JSON.stringify({
                estaActivo: Boolean(estaActivo),
            }),
        }
    );

    return respuesta.datos.cliente;

}


export async function eliminarCliente(id) {

    await apiFetch(
        `/api/clientes/${id}`,
        {
            method: "DELETE",
        }
    );

}