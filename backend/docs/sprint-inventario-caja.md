# Sprint de inventario y caja — backend

## Criterios y cobertura — 2026-09-02

Fuente: documento `PAPER CONTROL (1).docx` de la carpeta Documentación, historias
HU-19, HU-20 y HU-32 y caso CU-09. La correspondencia con SCRUM-44, SCRUM-46 y
SCRUM-32 se infiere por título, módulo y estimación; no se consultó Jira.

| Historia | Criterios cubiertos en backend |
| --- | --- |
| SCRUM-46 / HU-20 | Descuento automático; rechazo por stock insuficiente antes del commit; historial de movimientos. CU-09: transacción conjunta, rollback, stock no negativo y restitución al anular. |
| SCRUM-44 / HU-19 | Crear, editar y eliminar categorías; asignar categoría a productos; filtrar inventario por categoría. |
| SCRUM-32 / HU-32 | Ingresos y pagos por día; rango de fechas y vendedor; gastos de caja menor según fecha real del período. |

## Categorías

| Método y ruta | Resultado |
| --- | --- |
| GET /api/categorias | Lista de categorías activas, ordenadas por nombre. |
| POST /api/categorias | Crea con `{ "nombre": "Papelería" }`; HTTP 201. |
| PATCH /api/categorias/:id | Renombra con el mismo cuerpo; HTTP 200. |
| DELETE /api/categorias/:id | Elimina una categoría sin productos; HTTP 204. |

Las consultas admiten VENDEDOR, ADMINISTRADOR y DUENO. Las mutaciones solo
ADMINISTRADOR y DUENO. Todas requieren token Bearer.
Las respuestas de lectura usan `{ exito: true, datos: { categorias } }`;
crear/editar usan `datos.categoria` con `{ id, nombre }`.

El nombre se recorta y admite 1–100 caracteres. Campos desconocidos y datos
inválidos devuelven 400; ID inexistente 404; nombre duplicado 409
`CATEGORIA_EXISTENTE`. La unicidad usa la intercalación de MySQL existente.

Decisión de negocio: una categoría asociada a cualquier producto, incluso uno
inactivo o eliminado lógicamente, no puede borrarse. La FK protege referencias
concurrentes; se devuelve 409 `CATEGORIA_CON_PRODUCTOS`. Se deben reasignar los
productos antes. Renombrar conserva el ID y actualiza el nombre consultado por
los productos asociados.

Se conserva `GET /api/productos/categorias` y
`GET /api/productos?categoriaId=3&incluirInactivos=true`. Crear/editar un producto
sigue aceptando `categoria` por nombre y puede crearla implícitamente.

## Reporte diario de caja

`GET /api/reportes/caja?desde=2026-09-01&hasta=2026-09-02&vendedorId=7`

Solo ADMINISTRADOR y DUENO. Fechas obligatorias, válidas, inclusivas y en orden;
máximo 366 días. `vendedorId` es opcional y debe ser un entero positivo seguro.
Los filtros inválidos responden 400; un vendedor sin actividad devuelve lista
vacía y totales cero.

```json
{
  "exito": true,
  "datos": {
    "reporte": {
      "desde": "2026-09-01",
      "hasta": "2026-09-02",
      "vendedorId": 7,
      "dias": [{
        "fecha": "2026-09-01",
        "totalVentas": 120,
        "ventasPorMetodo": { "efectivo": 70, "tarjeta": 30, "transferencia": 20 },
        "totalGastos": 15,
        "flujoNeto": 105
      }],
      "resumen": {
        "totalVentas": 120,
        "ventasPorMetodo": { "efectivo": 70, "tarjeta": 30, "transferencia": 20 },
        "totalGastos": 15,
        "flujoNeto": 105
      }
    }
  }
}
```

Se agrupan ventas confirmadas por `confirmado_en` y gastos por `ocurrido_en`,
independientemente de cuándo abrió o cerró el turno. El límite superior es el
inicio del día siguiente. Los DATETIME siguen la convención horaria existente
(hora de Colombia). No se incluyen ventas anuladas ni montos iniciales de caja.
Los días sin actividad se omiten; sí aparecen días que solo tienen gastos.

Decisión de negocio: al filtrar vendedor se seleccionan ventas de `vendido_por`
y gastos de `registrado_por`. Sin vendedor se incluyen todos. El flujo neto
es ingresos menos gastos; no representa utilidad ni efectivo físico esperado.
Una sola consulta con UNION ALL evita multiplicar importes por varios pagos o
gastos y devuelve ambos agregados desde una misma vista de la base.

El contrato provisional de este endpoint cambia de `turnos` a `dias` para cumplir
la historia. El historial y cierre de `/api/turnos-caja` mantienen su contrato.
No se modifica el frontend.

## Validación

`npm test` ejecuta pruebas unitarias y HTTP con Express real y conexiones
simuladas. Cubren permisos, CRUD, duplicados, referencias, fechas, filtro de
vendedor, día solo con gastos, totales, rollback de venta y anulación repetida.
No se necesita migración. Sigue pendiente la prueba de SQL y concurrencia con
MySQL real en una base exclusiva de pruebas y la aceptación visual del usuario.

Ver [revisión de seguridad](seguridad-backend.md) para controles y límites.
