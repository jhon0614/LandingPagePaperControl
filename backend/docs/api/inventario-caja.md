# Inventario y caja

Esta guía reúne los contratos de categorías y reporte diario de caja que estaban
documentados en las notas de sprint. Conserva al final la trazabilidad y los
límites de aquel antecedente. No es un catálogo completo del CRUD de productos,
movimientos, proveedores, turnos y gastos.

Ver [ventas](ventas.md) para salida/restitución de existencias por venta o
anulación, y [convenciones](convenciones.md) para búsqueda y paginación.

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

La respuesta del reporte utiliza `dias`. El antecedente de implementación cambió
su contrato provisional de `turnos` a `dias` para cumplir la historia, sin cambiar
el contrato de historial/cierre de `/api/turnos-caja` ni modificar el frontend en
aquella entrega.

## Antecedente de cobertura — 2026-09-02

Fuente: documento `PAPER CONTROL (1).docx` de la carpeta Documentación, historias
HU-19, HU-20 y HU-32 y caso CU-09. La correspondencia con SCRUM-44, SCRUM-46 y
SCRUM-32 se infiere por título, módulo y estimación; no se consultó Jira.

| Historia | Criterios documentados en el antecedente |
| --- | --- |
| SCRUM-46 / HU-20 | Descuento automático de existencias; rechazo por stock insuficiente antes del commit; historial de movimientos. CU-09: transacción conjunta, rollback, stock no negativo y restitución al anular. |
| SCRUM-44 / HU-19 | Crear, editar y eliminar categorías; asignar categoría a productos; filtrar inventario por categoría. |
| SCRUM-32 / HU-32 | Ingresos y pagos por día; rango de fechas y vendedor; gastos de caja menor según fecha real del período. |

## Validación documentada en el antecedente

La nota del 02/09/2026 remitía a `npm test`: pruebas unitarias y HTTP con Express
y conexiones simuladas para permisos, CRUD, duplicados, referencias, fechas,
filtro de vendedor, días solo con gastos, totales, rollback y anulación repetida.
Indicaba que la entrega no necesitaba migración y dejaba pendientes SQL y
concurrencia en una base MySQL exclusiva, además de aceptación visual.

Esos son los límites de la referencia histórica, no un resultado nuevo ni una
declaración del estado actual de toda la validación. La reorganización documental
no ejecutó pruebas.

Ver [seguridad](../seguridad/controles.md) y
[compatibilidad](../operacion/migraciones-y-compatibilidad.md) para controles,
cambios posteriores y límites.
