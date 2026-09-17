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

## Nota para el frontend

Crear `src/services/dashboard.service.js`:

```js
import { apiFetch } from "./api";

export async function obtenerResumenDashboard() {
  const respuesta = await apiFetch("/api/dashboard/resumen");
  return respuesta.datos.resumen;
}
```

En `Admin.jsx` y `Dueno.jsx`, importar `obtenerResumenDashboard`, cargarlo en
el `useEffect` y usar un estado inicial con las cuatro propiedades:

```js
const [totales, setTotales] = useState({
  productos: 0,
  ventas: 0,
  usuarios: 0,
  stockBajo: 0,
});
```

Reemplazar los valores fijos:

```jsx
<span>{totales.ventas}</span>
<span>{totales.usuarios}</span>
```

La llamada anterior a `obtenerProductos()` deja de ser necesaria en esos dos
dashboards, porque el nuevo endpoint ya calcula productos y stock bajo.
