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

export async function obtenerReporteCaja({ desde, hasta, vendedorId } = {}) {

    const parametros = new URLSearchParams();

    parametros.append("desde", desde);
    parametros.append("hasta", hasta);

    if (vendedorId) {

        parametros.append("vendedorId", vendedorId);

    }

    const respuesta = await apiFetch(
        `/api/reportes/caja?${parametros.toString()}`
    );

    return respuesta.datos.reporte;

}