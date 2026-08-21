import { apiFetch } from "./api";

export async function obtenerProductos() {

    const respuesta = await apiFetch("/api/productos");

    return respuesta.datos.productos;

}

export async function crearProducto(producto) {

    const respuesta = await apiFetch(
        "/api/productos",
        {
            method: "POST",

            body: JSON.stringify(producto),
        }
    );

    return respuesta.datos.producto;

}

export async function actualizarProducto(id, producto) {

    const respuesta = await apiFetch(
        `/api/productos/${id}`,
        {
            method: "PATCH",

            body: JSON.stringify(producto),
        }
    );

    return respuesta.datos.producto;

}

export async function cambiarEstadoProducto(id, estaActivo) {

    const respuesta = await apiFetch(
        `/api/productos/${id}/estado`,
        {
            method: "PATCH",

            body: JSON.stringify({
                estaActivo: Boolean(estaActivo),
            }),
        }
    );

    return respuesta.datos.producto;

}

/*
=========================================================
ELIMINAR PRODUCTO
=========================================================

El backend debe rechazar la eliminación física si el
producto tiene ventas registradas (protegido), y en su
lugar debe desactivarlo. Aquí solo propagamos el mensaje
de error del backend para que el frontend lo muestre.
*/

export async function eliminarProducto(id) {

    await apiFetch(
        `/api/productos/${id}`,
        {
            method: "DELETE",
        }
    );

}

/*
=========================================================
MOVIMIENTOS DE INVENTARIO
=========================================================
*/

export async function obtenerMovimientosProducto(idProducto) {

    const respuesta = await apiFetch(
        `/api/productos/${idProducto}/movimientos`
    );

    return respuesta.datos.movimientos;

}

export async function registrarMovimiento(idProducto, movimiento) {

    const respuesta = await apiFetch(
        `/api/productos/${idProducto}/movimientos`,
        {
            method: "POST",

            body: JSON.stringify({
                tipo: movimiento.tipo,
                cantidad: Number(movimiento.cantidad),
                nota: movimiento.nota || "",
            }),
        }
    );

    return respuesta.datos.movimiento;

}

/*
=========================================================
ALERTAS DE BAJO STOCK
=========================================================

Usado tanto en Inventario como en los dashboards
(Admin, Dueño).
*/

export async function obtenerAlertasStock() {

    const respuesta = await apiFetch(
        "/api/productos/alertas-stock"
    );

    return respuesta.datos.alertas;

}