# Correcciones de backend — 2026-09-09

No se modificó frontend ni `.env`. Esta actualización sustituye los pendientes
de sesiones, concurrencia y paginación de la revisión anterior.

## Migración antes del arranque

- Instalación nueva: `database/schema.sql` y `database/seed.sql`.
- Base existente: detener la API y ejecutar **una sola vez**
  `database/migrations/2026-09-09-seguridad-backend.sql` en la base seleccionada.
  No ejecutar esta migración después del esquema nuevo.
- Agrega `limites_solicitudes`, `cola_recuperacion` y `solicitudes_venta`.
  Revoca sesiones y enlaces anteriores: hay que iniciar sesión o solicitar
  otro enlace. Así se descartan expiraciones antiguas con UTC/hora local mezclados.
- No modifica fechas comerciales históricas. Autenticación escribe UTC explícito
  y lee ISO UTC; ventas, caja e inventario conservan `DB_TIMEZONE`.
- El arranque verifica las tablas y falla con un mensaje claro si faltan.
  **Ni el arranque ni las pruebas aplican la migración a la base de la aplicación.**

## Sesiones y recuperación

- JWT HS256 con `sid`: cada petición comprueba sesión vigente, pertenencia y
  revocación, además de usuario activo y rol actual. Logout, cambio/reset de
  contraseña y revocación administrativa invalidan las siguientes peticiones
  aunque el JWT no haya expirado. No cancela peticiones ya autorizadas en curso.
- Los JWT antiguos sin `sid` no se aceptan. El refresh conserva el cambio
  obligatorio de contraseña y su expiración original.
- Login/cambio verifican que el hash autenticado no haya cambiado mientras
  se calculaba bcrypt. Crear y consumir enlaces bloquean primero al usuario;
  contraseña, invalidación de enlaces y revocación se confirman juntas.
- Recuperación pública encola tanto cuentas conocidas como desconocidas sin
  consultar usuarios ni esperar a SMTP en la petición. La cola no guarda tokens.
  El trabajador genera el enlace y guarda solo su SHA-256.
- `npm start` inicia el trabajador. Reservas de cinco minutos, hasta tres
  intentos y limpieza posterior; varias instancias usan `SKIP LOCKED`.
  Fallos SMTP no cambian la respuesta HTTP. Se registran sin correo/token/SQL.
- Cambios administrativos, desbloqueos y solicitudes administrativas incluyen
  auditoría en la misma transacción. Se revalida al responsable después del
  bloqueo. El conteo del último administrador se serializa usando filas de roles.
- Se conservan bcrypt costo 12, máximo 72 bytes UTF-8, cookies HttpOnly,
  SameSite=Strict y Secure en producción.

## Ventas, stock, caja y dinero

- `POST /api/ventas` admite `Idempotency-Key`: entre 16 y 128 caracteres
  alfanuméricos, `:`, `_` o `-`. Se asocia al usuario y contenido normalizado.
  Misma clave/contenido devuelve la venta original; otro contenido devuelve
  409 `IDEMPOTENCIA_CONFLICTO`. La reserva y venta se confirman juntas.
- **El frontend actual no envía esta clave.** Es opcional para conservar
  compatibilidad. Sin ella cada POST sigue siendo una venta nueva. Para obtener
  la garantía de reintento, el cliente debe generar una clave por operación y
  reutilizarla en los reintentos. No se deduplican ventas por similitud.
- La edición general no cambia existencias. Un `stock` distinto del actual
  devuelve 409 `STOCK_EDICION_CONFLICTO`: recargar y usar la ruta existente
  `/api/productos/:id/movimientos` para ajustes.
- Crear/eliminar gastos bloquea el turno durante comprobación, escritura y
  auditoría. Cerrar usa el mismo bloqueo. Los gastos borrados conservan los
  datos anteriores en auditoría. Aperturas simultáneas se serializan.
- Dinero calculado en centavos BigInt y enviado a SQL como decimal exacto.
  Validación de fracciones de centavo y límites DECIMAL(12,2). Reportes suman
  centavos; el contrato final mantiene números JSON.

## Paginación y HTTP

- Productos, ventas propias/historial, usuarios, proveedores e historial de
  caja aceptan `pagina` (1–10000) y `limite` (1–500).
- Conservan el arreglo en `datos` y agregan `datos.paginacion` con
  `{ pagina, limite, hayMas }`. Ejemplo: `/api/ventas?pagina=1&limite=50`.
- Sin parámetros se admiten hasta 500 filas. Si hay más, devuelve
  422 `PAGINACION_REQUERIDA`, sin presentar datos truncados como completos.
  El frontend necesitará paginación para esos volúmenes. Clientes conserva
  su búsqueda limitada existente.
- Fechas reales y hasta 366 días inclusivos en rangos explícitos de ventas,
  caja y ranking. Los listados sin rango quedan acotados por paginación.
- CORS precede al límite global y expone `Retry-After`, `RateLimit` y
  `RateLimit-Policy`; los 429 se pueden leer desde el origen autorizado.
- Límites compartidos en MySQL: global 300/minuto; login 20/15 min;
  refresh 60/15 min; recuperación/reset 5/15 min; cambio 5/15 min.
  Solicitar recuperación añade 3/15 min por correo normalizado.
- Los contadores usan SHA-256 con un ámbito por limitador. Si falla MySQL
  no se omite la protección. Solo los dobles de pruebas usan memoria;
  el arranque normal habilita siempre almacenamiento compartido.
- Conflictos/deadlocks conocidos producen 409; saturación y tiempos de espera
  conocidos, 503 con `Retry-After`. Los logs no imprimen SQL ni parámetros.

## Operación y pruebas

Variables nuevas: `DB_QUEUE_LIMIT=50`, `DB_CONNECT_TIMEOUT_MS=10000`,
`DB_QUERY_TIMEOUT_MS=10000` (SELECT), `DB_LOCK_WAIT_SECONDS=5`,
`DB_TLS=false` y `DB_TLS_CA_FILE` opcional. TLS valida el certificado.
`DB_TIMEZONE` admite desplazamiento fijo o `Z`, aplicado al driver y a la sesión
MySQL. La URL de recuperación debe pertenecer a `FRONTEND_ORIGIN`.

El usuario de ejecución requiere DML sobre las nuevas tablas; reservar DDL
para migraciones. HTTPS, proxy, TLS remoto y permisos mínimos se deben comprobar
en el despliegue. No se cambian infraestructura, certificados ni credenciales.
La inactividad sigue dependiendo del cliente; no se añade un reloj persistido.

- `npm test`: pruebas unitarias y HTTP.
- `npm run test:integration`: MySQL 8 real; concurrencia, UTC−5, revocación,
  idempotencia, rollback, cola, límites, paginación, pool y migración.
- Integración acepta `TEST_DB_HOST/PORT/USER/PASSWORD` o credenciales locales de
  `.env`, pero **nunca usa DB_NAME**. Solo permite MySQL local. Crea una base
  nueva `papercontrol_test_<aleatorio>` y la elimina al terminar. Requiere
  permisos para crear/eliminar esa base. La migración se prueba solo allí.
