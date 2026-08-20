# API de ventas

Todas las rutas requieren `Authorization: Bearer <token>`.

## Crear venta

`POST /api/ventas`

```json
{
  "clienteId": 12,
  "productos": [
    { "productoId": 4, "cantidad": 2 }
  ],
  "metodoPago": "EFECTIVO",
  "tipoDescuento": "PORCENTAJE",
  "valorDescuento": 10,
  "referencia": null,
  "montoRecibido": 50000
}
```

`clienteId`, `tipoDescuento`, `referencia` y `montoRecibido` son opcionales.
Si no hay descuento, omitir `tipoDescuento` y enviar u omitir
`valorDescuento: 0`. Los métodos admitidos son `EFECTIVO`, `TARJETA` y
`TRANSFERENCIA`. El servidor obtiene precios y calcula todos los totales.

Respuesta `201`: `{ "exito": true, "datos": { "venta": { ... } } }`.

## Ventas propias

`GET /api/ventas`

Solo devuelve las ventas cuyo vendedor es el usuario del token.

Respuesta `200`: `{ "exito": true, "datos": { "ventas": [ ... ] } }`.

## Historial administrativo

`GET /api/ventas/historial?fechaInicio=2026-08-01&fechaFin=2026-08-20&vendedorId=7&orden=fecha`

Solo `ADMINISTRADOR` y `DUENO`. Los filtros son opcionales. `orden` admite
`fecha`, `monto` o `vendedor` y por defecto es `fecha`.

## Comprobante

`GET /api/ventas/:id/comprobante`

El vendedor puede consultar sus ventas; administrador y dueño pueden consultar
cualquier venta.

Respuesta `200`: `{ "exito": true, "datos": { "comprobante": { ... } } }`.

## Anular venta

`DELETE /api/ventas/:id`

```json
{
  "confirmar": true,
  "motivo": "Venta registrada por error"
}
```

`confirmar: true` es obligatorio y `motivo` es opcional. La venta cambia a
`ANULADA`, se restaura el inventario y se registran movimientos de reversión.
Solo puede anularse mientras su turno de caja continúe abierto.
