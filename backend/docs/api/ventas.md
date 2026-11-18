# API de ventas

Todas las rutas requieren `Authorization: Bearer <token>`.

El módulo admite `VENDEDOR`, `ADMINISTRADOR` y `DUENO`, con las restricciones
por operación indicadas abajo. Ver [convenciones](convenciones.md) para respuestas
y paginación. Esta guía reúne ventas, historial, descuentos y comprobantes, antes
repartidos entre el contrato de API y las notas SCRUM-15/26/22.

## Métodos de pago

`GET /api/ventas/metodos-pago`

Devuelve el catálogo completo para que la interfaz pueda mostrar únicamente
los métodos activos al registrar una venta.

Respuesta `200`: `{ "exito": true, "datos": { "metodosPago": [ ... ] } }`.

`PATCH /api/ventas/metodos-pago/:id`

Solo `ADMINISTRADOR` y `DUENO`.

```json
{
  "estaActivo": false
}
```

El cambio queda persistido y se comparte entre todas las cajas.

Respuesta `200`: `{ "exito": true, "datos": { "metodoPago": { ... } } }`.

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

Las modalidades, el límite del 70 % y el redondeo se detallan en
[descuentos](#descuentos). No hay una segunda ruta para aplicar un descuento a
una venta ya confirmada.

Respuesta `201`: `{ "exito": true, "datos": { "venta": { ... } } }`.

### Reintentos e idempotencia

`POST /api/ventas` admite el encabezado opcional `Idempotency-Key`, de 16 a 128
caracteres alfanuméricos, `:`, `_` o `-`. La clave se asocia al usuario y al
contenido normalizado: repetir la misma clave y contenido devuelve la venta
original; cambiar el contenido devuelve `409 IDEMPOTENCIA_CONFLICTO`.

El cliente debe generar una clave por operación y reutilizarla en sus reintentos.
Sin ella, cada POST representa una venta nueva; no se deduplican ventas por
similitud. La reserva y la venta se confirman juntas.

## Descuentos

Se envían en el cuerpo de creación de la venta:

```json
{ "tipoDescuento": "PORCENTAJE", "valorDescuento": 12.5 }
```

```json
{ "tipoDescuento": "VALOR_FIJO", "valorDescuento": 2500 }
```

- Sin descuento: omitir ambos campos o usar tipo null y valor 0.
- Se aplica una modalidad al subtotal completo, con los precios de MySQL.
- Porcentaje entre 0 y 70; valor fijo no negativo y no superior al 70 % del subtotal.
- Máximo dos decimales. Servicio y modelo también validan llamadas internas:
  rechazan tipos desconocidos, negativos, cadenas, infinitos y fracciones de centavo.
- El cálculo usa centavos, redondeando medio centavo hacia arriba. El resultado
  redondeado tampoco puede superar el 70 % del subtotal.
- Un porcentaje mayor de 70 se rechaza en la entrada con "No puede superar 70.";
  un exceso calculado devuelve `400 DESCUENTO_INVALIDO` y
  "El descuento no puede superar el 70 % del subtotal.".
- Un valor fijo equivalente exactamente al 70 % se acepta; un descuento del 100 %
  se rechaza.

El descuento se refleja en venta, pago, cambio y comprobante. Un fallo revierte
venta, pago y stock. Los importes de detalle son anteriores al descuento global,
que aparece desglosado en el encabezado. No se modifican importes de ventas
confirmadas mediante otra ruta de descuentos.

## Ventas propias

`GET /api/ventas`

Solo devuelve las ventas cuyo vendedor es el usuario del token.

Respuesta `200`: `{ "exito": true, "datos": { "ventas": [ ... ] } }`.

## Historial administrativo

`GET /api/ventas/historial?fechaInicio=2026-08-01&fechaFin=2026-08-20&vendedorId=7&orden=fecha`

Solo `ADMINISTRADOR` y `DUENO`. Los filtros son opcionales. `orden` admite
`fecha`, `monto` o `vendedor` y por defecto es `fecha`.

## Historial de compras de un cliente

`GET /api/clientes/:id/compras`

Requiere Bearer token y rol `VENDEDOR`, `ADMINISTRADOR` o `DUENO`.
Administrador/dueño consultan todas las compras del cliente; el vendedor solo
las que él registró. El cliente puede estar inactivo; si no existe o fue
eliminado, se responde `404`.

| Parámetro opcional | Valores |
| --- | --- |
| `fechaInicio`, `fechaFin` | AAAA-MM-DD, inclusivas; máximo 366 días si se indican ambas. |
| `estado` | `TODAS` (predeterminado), `CONFIRMADA` o `ANULADA`. |
| `pagina`, `limite` | Página 1–10000; límite 1–500. |

Ejemplo: `/api/clientes/8/compras?estado=CONFIRMADA&pagina=1&limite=20`.

Respuesta: `{ exito: true, datos: { compras: [...], paginacion: { pagina, limite, hayMas } } }`.
Cada compra incluye número de venta, vendedor, fecha, estado, subtotal, descuento,
total, métodos de pago, `clienteId`, `items` y `comprobanteUrl`. Los items
conservan nombre, SKU, cantidad y precio registrados en la venta.

Se cargan por página sin truncamiento por GROUP_CONCAT ni una consulta por venta.
Un historial vacío responde `200` con arreglo vacío. Los filtros no sustituyen
el cliente de la ruta ni la identidad del vendedor autenticado.

## Comprobante

`GET /api/ventas/:id/comprobante`

El vendedor puede consultar sus ventas; administrador y dueño pueden consultar
cualquier venta.

| Solicitud | Resultado |
| --- | --- |
| Sin parámetros o `?formato=json` | HTTP 200 con `{ "exito": true, "datos": { "comprobante": { ... } } }`. |
| `?formato=html` | Documento HTML autónomo e imprimible generado por el backend. |
| `?formato=html&descargar=true` | Descarga `comprobante-ID.html`. |
| `?formato=json&descargar=true` | Descarga `comprobante-ID.json`. |

Ambos formatos exigen el mismo token y permiso sobre la venta. El consumidor
debe obtener la descarga mediante una petición autenticada: un enlace de
navegador sin token no omite la autorización. `Content-Disposition` está expuesto
por CORS para leer el nombre del archivo. `descargar` solo admite true/false.

Incluye número de venta, fecha en America/Bogota, vendedor, cliente o consumidor
final, productos, subtotal, descuento, impuesto almacenado, total, pagos, recibido
y cambio. Una venta anulada muestra su estado y motivo.

Los productos proceden del detalle histórico; nombre/documento del cliente y
nombre del vendedor se consultan de los registros actuales. El HTML no usa
scripts ni recursos externos, escapa los textos variables y lleva una política
CSP restringida en la respuesta. Consultarlo o descargarlo no altera venta,
pagos o inventario. El backend no genera PDF ni facturación electrónica en esta ruta.

## Anular venta

`DELETE /api/ventas/:id`

```json
{
  "confirmar": true,
  "motivo": "Venta registrada por error"
}
```

El cuerpo es opcional: `confirmar` admite únicamente `true` y su valor
predeterminado es `true`; `motivo` es opcional y, si se envía, tiene de 3 a 500
caracteres. Se conserva la compatibilidad con el cuerpo del ejemplo.

El vendedor solo puede anular su venta; administrador y dueño pueden anular las
de otros vendedores. La venta pasa a `ANULADA`, se restaura el inventario y se
registran movimientos de reversión. Solo puede anularse mientras su turno de
caja continúe abierto.

## Trazabilidad y cobertura documentada

| Referencia de backlog | Sección funcional |
| --- | --- |
| SCRUM-15: ver historial de compras | [Historial de compras de un cliente](#historial-de-compras-de-un-cliente). |
| SCRUM-26: aplicación de descuentos | [Descuentos](#descuentos). |
| SCRUM-22: generación de comprobante | [Comprobante](#comprobante). |

El antecedente de estas historias ampliaba rutas existentes, sin modificar el
frontend ni requerir una migración nueva, suponiendo el esquema y las migraciones
anteriores instalados.
Esa afirmación no sustituye la identificación del estado de una base concreta.

Las notas de implementación remiten a `npm test` para descuentos, filtros,
autorización, formatos y escape; y a `npm run test:integration` para persistencia,
rollback, historial, permisos y descargas con MySQL temporal. Los comandos son
referencias documentales: no se ejecutaron durante esta reorganización ni
acreditan un nuevo resultado. Ver los límites operativos en la
[guía de compatibilidad](../operacion/migraciones-y-compatibilidad.md).
