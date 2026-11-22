import { apiFetch } from "./api";

export async function obtenerResumenDashboard({ refrescar = false } = {}) {
    const respuesta = await apiFetch(refrescar ? "/api/dashboard/resumen?refrescar=true" : "/api/dashboard/resumen");
    return respuesta.datos.resumen;
}