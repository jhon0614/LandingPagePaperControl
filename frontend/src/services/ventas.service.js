import { apiFetch } from "./api";

/* =====================================================
   REGISTRAR VENTAS DEL VENDEDOR
===================================================== */
export async function registrarVenta(venta) {

    const respuesta = await apiFetch(
        "/api/ventas",
        {
            method: "POST",

            body: JSON.stringify(venta),
        }
    );

    return respuesta.datos.venta;

}

/* =====================================================
   OBTENER VENTAS DEL VENDEDOR
===================================================== */

export async function obtenerVentas() {
  const respuesta = await apiFetch("/api/ventas", {
    method: "GET",
  });

  return respuesta?.datos?.ventas || [];
}

/* =====================================================
   HISTORIAL COMPLETO (ADMIN / DUEÑO)
===================================================== */

export async function obtenerHistorialVentas(filtros = {}) {
  const params = new URLSearchParams();

  if (filtros.fechaInicio) {
    params.append("fechaInicio", filtros.fechaInicio);
  }

  if (filtros.fechaFin) {
    params.append("fechaFin", filtros.fechaFin);
  }

  if (filtros.vendedorId) {
    params.append("vendedorId", filtros.vendedorId);
  }

  if (filtros.orden) {
    params.append("orden", filtros.orden);
  }

  const query = params.toString();

  const respuesta = await apiFetch(
    `/api/ventas/historial${query ? `?${query}` : ""}`,
    {
      method: "GET",
    }
  );

  return respuesta?.datos?.ventas || [];
}

/* =====================================================
   CREAR VENTA
===================================================== */

export async function crearVenta(datos) {
  const respuesta = await apiFetch("/api/ventas", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  return respuesta?.datos;
}

/* =====================================================
   OBTENER COMPROBANTE
===================================================== */

export async function obtenerComprobante(id) {
  const respuesta = await apiFetch(
    `/api/ventas/${id}/comprobante`,
    {
      method: "GET",
    }
  );

  return respuesta?.datos;
}

/* =====================================================
   ELIMINAR / ANULAR VENTA
===================================================== */

export async function eliminarVenta(id) {
  const respuesta = await apiFetch(`/api/ventas/${id}`, {
    method: "DELETE",
  });

  return respuesta;
}