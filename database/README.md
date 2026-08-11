# Base de datos de PaperControl

Modelo relacional inicial para MySQL 8.0 o superior. Cubre autenticación,
usuarios, inventario, proveedores, clientes, ventas, pagos, caja y auditoría.

## Instalación

Desde MySQL Workbench se deben abrir y ejecutar, en este orden:

1. `schema.sql`
2. `seed.sql`

Estos archivos crean una base nueva completamente en español. No transforman
una estructura anterior ni eliminan información automáticamente. Si ya existe
una base llamada `paper_control`, debe respaldarse y eliminarse manualmente
antes de ejecutar el nuevo `schema.sql`.

Desde la terminal de MySQL se puede hacer lo mismo con:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

El esquema crea la base `paper_control` con `utf8mb4`. El seed únicamente
registra los roles, métodos de pago y parámetros iniciales; no contiene
credenciales.

## Actualizar una base que ya existe

No se debe volver a ejecutar `schema.sql` sobre una base con información. Las
actualizaciones dentro de `migrations` se ejecutan una sola vez y conservan los
registros existentes.

Para habilitar renovación de sesión y la opción "Recordarme" en una instalación
anterior, ejecutar:

```bash
mysql -u root -p < database/migrations/2026-08-10-sesion-persistente.sql
```

## Relaciones principales

- Un usuario pertenece a un rol.
- Un producto pertenece a una categoría y puede tener varios proveedores.
- Cada cambio de existencias genera un movimiento de inventario.
- Una alerta de stock referencia el producto y, cuando corresponda, el
  movimiento que la originó.
- Una venta pertenece a un turno de caja y a un vendedor; el cliente es
  opcional.
- Una venta contiene uno o más detalles y uno o más pagos.
- Los gastos pertenecen al turno de caja donde fueron registrados.

## Decisiones de diseño

### Autenticación

El acceso se realiza con correo electrónico y contraseña. `usuarios.hash_contrasena`
almacena únicamente un hash generado por el backend. Los tokens de renovación y
restablecimiento también se almacenan como hash.

`usuarios` conserva el estado actual del bloqueo para validar el login rápidamente;
`intentos_acceso` conserva el historial requerido para auditoría.

### Inventario y Observer

`productos.stock_actual` representa la existencia actual para búsquedas rápidas.
`movimientos_inventario` es el historial inmutable que explica cada cambio.

Después de registrar un movimiento, el servicio de inventario notifica al
Observer de bajo stock. Este compara `stock_actual` con `stock_minimo` y crea o
resuelve registros en `alertas_inventario`. No se utilizan triggers porque esta regla
pertenece a la lógica de la aplicación.

### Ventas y consistencia

La confirmación de una venta debe ejecutarse dentro de una transacción MySQL:

1. Bloquear los productos involucrados mediante `SELECT ... FOR UPDATE`.
2. Validar que exista stock suficiente.
3. Crear la venta, sus detalles y pagos.
4. Actualizar el stock y registrar los movimientos.
5. Confirmar la transacción.
6. Notificar a los observadores después del `COMMIT`.

Si alguna operación falla, debe ejecutarse `ROLLBACK`. La anulación crea
movimientos `SALE_REVERSAL`; no elimina la venta ni sus detalles.

### Historial

Los detalles de venta guardan el nombre, SKU y precio utilizados en ese momento.
Esto evita que un cambio posterior en el producto modifique los comprobantes o
el historial de ventas.

Las entidades importantes se desactivan o marcan con `eliminado_en` en lugar de
eliminarse físicamente cuando ya están relacionadas con operaciones.

## Responsabilidades fuera de MySQL

El backend debe garantizar reglas que no se expresan adecuadamente mediante una
restricción simple, entre ellas:

- que exista como máximo un turno de caja abierto;
- que una venta tenga al menos un detalle;
- que la suma de pagos coincida con el total de la venta;
- que no se desactiven todos los métodos de pago;
- que el stock y su movimiento se actualicen atómicamente;
- que no exista más de una alerta activa para un producto;
- que los totales de venta correspondan a sus detalles;
- que las contraseñas y tokens se almacenen como hash.

Estas validaciones deben ubicarse en los servicios del backend MVC y ejecutarse
mediante transacciones cuando afecten más de una tabla.
