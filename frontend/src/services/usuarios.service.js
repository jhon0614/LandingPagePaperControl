import { apiFetch } from "./api";

    export async function obtenerRoles() {

    const respuesta = await apiFetch("/api/roles");

    return respuesta.datos.roles;
    }


    export async function obtenerUsuarios() {

    const respuesta = await apiFetch("/api/usuarios");

    return respuesta.datos.usuarios;
    }


    export async function obtenerUsuario(id) {

    const respuesta = await apiFetch(
        `/api/usuarios/${id}`
    );

    return respuesta.datos.usuario;
    }


    export async function crearUsuario(usuario) {

    const respuesta = await apiFetch(
        "/api/usuarios",
        {
        method: "POST",

        body: JSON.stringify({
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            correo: usuario.correo,
            contrasenaTemporal:
            usuario.contrasenaTemporal,
            rolId: Number(usuario.rolId),
        }),
        }
    );

    return respuesta.datos.usuario;
    }


    export async function actualizarUsuario(
    id,
    usuario
    ) {

    const cuerpo = {};


    if (usuario.nombres !== undefined) {
        cuerpo.nombres = usuario.nombres;
    }


    if (usuario.apellidos !== undefined) {
        cuerpo.apellidos = usuario.apellidos;
    }


    if (usuario.correo !== undefined) {
        cuerpo.correo = usuario.correo;
    }


    if (usuario.rolId !== undefined) {
        cuerpo.rolId = Number(usuario.rolId);
    }


    const respuesta = await apiFetch(
        `/api/usuarios/${id}`,
        {
        method: "PATCH",

        body: JSON.stringify(cuerpo),
        }
    );


    return respuesta.datos.usuario;
    }


    export async function cambiarEstadoUsuario(
    id,
    estaActivo
    ) {

    const respuesta = await apiFetch(
        `/api/usuarios/${id}/estado`,
        {
        method: "PATCH",

        body: JSON.stringify({
            estaActivo: Boolean(estaActivo),
        }),
        }
    );


    return respuesta.datos.usuario;
    }


    export async function eliminarUsuario(id) {

    await apiFetch(
        `/api/usuarios/${id}`,
        {
        method: "DELETE",
        }
    );

}