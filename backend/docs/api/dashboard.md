# Resumen del dashboard

## Endpoint

```http
GET /api/dashboard/resumen
Authorization: Bearer <token-de-acceso>
```

Solo admite los roles `ADMINISTRADOR` y `DUENO`.

```json
{
  "exito": true,
  "datos": {
    "resumen": {
      "productos": 7,
      "ventas": 12,
      "usuarios": 3,
      "stockBajo": 2
    }
  }
}
```

Los valores representan productos activos no eliminados, ventas confirmadas,
usuarios activos no eliminados y productos activos con existencias mayores que
cero cuyo stock actual es menor o igual al mínimo.

## Ejemplo de consumo desde el frontend

El siguiente patrón ilustra el consumo mediante `src/services/dashboard.service.js`;
no representa una funcionalidad pendiente ni una nueva validación de las pantallas:

```js
import { apiFetch } from "./api";

export async function obtenerResumenDashboard() {
  const respuesta = await apiFetch("/api/dashboard/resumen");
  return respuesta.datos.resumen;
}
```

En `Admin.jsx` y `Dueno.jsx`, el consumidor puede importar `obtenerResumenDashboard`,
cargarlo en el `useEffect` y usar un estado inicial con las cuatro propiedades:

```js
const [totales, setTotales] = useState({
  productos: 0,
  ventas: 0,
  usuarios: 0,
  stockBajo: 0,
});
```

El renderizado utiliza los valores devueltos:

```jsx
<span>{totales.ventas}</span>
<span>{totales.usuarios}</span>
```

Para esas cuatro cifras no hace falta obtener el listado completo de productos:
el endpoint ya calcula productos y stock bajo. Ver
[convenciones](convenciones.md) para el formato común y
[controles de seguridad](../seguridad/controles.md) para el alcance de los permisos.
