import { apiFetch } from "./api";

export async function obtenerResumenDashboard() {
    const respuesta = await apiFetch("/api/dashboard/resumen");
    return respuesta.datos.resumen;
}