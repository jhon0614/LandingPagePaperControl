import { apiFetch } from "./api";

export async function obtenerProductosMasVendidos({ periodo, desde, hasta } = {}) {

    const parametros = new URLSearchParams();

    if (periodo) parametros.append("periodo", periodo);
    if (desde) parametros.append("desde", desde);
    if (hasta) parametros.append("hasta", hasta);

    const query = parametros.toString();

    const respuesta = await apiFetch(
        `/api/reportes/productos-mas-vendidos${query ? `?${query}` : ""}`
    );

    return respuesta.datos.productos;

}