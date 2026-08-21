import { apiFetch } from "./api";

export async function obtenerProveedores() {

    const respuesta = await apiFetch("/api/proveedores");

    return respuesta.datos.proveedores;

}

export async function crearProveedor(proveedor) {

    const respuesta = await apiFetch(
        "/api/proveedores",
        {
            method: "POST",

            body: JSON.stringify({
                nombre: proveedor.nombre,
                contacto: proveedor.contacto,
                telefono: proveedor.telefono,
                correo: proveedor.correo,
                direccion: proveedor.direccion,
            }),
        }
    );

    return respuesta.datos.proveedor;

}

export async function actualizarProveedor(id, proveedor) {

    const respuesta = await apiFetch(
        `/api/proveedores/${id}`,
        {
            method: "PATCH",

            body: JSON.stringify(proveedor),
        }
    );

    return respuesta.datos.proveedor;

}

export async function eliminarProveedor(id) {

    await apiFetch(
        `/api/proveedores/${id}`,
        {
            method: "DELETE",
        }
    );

}

/*
=========================================================
ASOCIAR / DESASOCIAR PROVEEDOR A UN PRODUCTO
=========================================================
*/

export async function obtenerProveedoresDeProducto(idProducto) {

    const respuesta = await apiFetch(
        `/api/productos/${idProducto}/proveedores`
    );

    return respuesta.datos.proveedores;

}

export async function asociarProveedor(idProducto, idProveedor) {

    const respuesta = await apiFetch(
        `/api/productos/${idProducto}/proveedores`,
        {
            method: "POST",

            body: JSON.stringify({
                proveedorId: Number(idProveedor),
            }),
        }
    );

    return respuesta.datos;

}

export async function quitarProveedor(idProducto, idProveedor) {

    await apiFetch(
        `/api/productos/${idProducto}/proveedores/${idProveedor}`,
        {
            method: "DELETE",
        }
    );

}