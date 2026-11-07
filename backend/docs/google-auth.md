# Acceso con Google sujeto a aprobación

Configurar `GOOGLE_CLIENT_ID` e instalar las dependencias del backend con `npm ci`.
La API verifica el ID token con `google-auth-library`, su audiencia, `sub`, correo y `email_verified === true`.

## Base de datos

Las instalaciones nuevas usan `database/schema.sql`. Para bases existentes aplicar,
en orden, `database/migrations/2026-11-06-google-sub.sql` (si falta `google_sub`)
y `database/migrations/2026-11-06-google-aprobacion.sql`.
Esta última añade `google_correo` y `google_estado` y conserva los accesos anteriores:
los registros con `google_sub` pasan a `APROBADO`, con `google_correo = correo`.
No volver a ejecutar el esquema completo sobre una base existente.

## Login

`POST /api/auth/google` recibe `{ "credential": "<ID token Google>", "recordarme": false }`.

Si el `sub` no existe, se busca el correo verificado normalizado en los usuarios locales.
Para una cuenta activa sin vinculación y con estado `NINGUNO`, se guarda el `sub`,
el correo y el estado `PENDIENTE`. No se crean usuarios ni sesiones.
Las solicitudes repetidas conservan el estado; un rechazo no se convierte automáticamente en pendiente.

- `403 GOOGLE_PENDIENTE`: “Solicitud enviada, espera la aprobación del administrador”.
- `403 GOOGLE_RECHAZADO`: “El administrador rechazó tu solicitud de acceso con Google.”
- `401 GOOGLE_NO_VINCULADO`: no existe una cuenta local disponible o tiene otro `sub`.
- `401 GOOGLE_CREDENCIAL_INVALIDA` / `GOOGLE_CUENTA_NO_VERIFICADA`: credencial inválida o identidad incompleta/no verificada.

Solo `APROBADO` permite crear una sesión. Se mantienen los controles de cuenta activa
y bloqueo, los tokens locales y la cookie HttpOnly de renovación. El rol siempre proviene de MySQL.
El endpoint anterior `POST /api/auth/google/vincular` exige coincidencia de correo y
también solicita aprobación (`403 GOOGLE_PENDIENTE`); no habilita Google por su cuenta.

## Administración

`PATCH /api/usuarios/:id/google`, autenticado como `ADMINISTRADOR` o `DUENO`:

```json
{ "accion": "aprobar" }
```

Acciones: `aprobar` → `APROBADO`, `rechazar` → `RECHAZADO`, `revocar` → `NINGUNO`.
Rechazar y revocar cierran las sesiones existentes. Revocar también elimina `google_sub`
y `google_correo`, permitiendo enviar posteriormente una nueva solicitud desde el login.
Se exige una solicitud/vinculación existente; de lo contrario se devuelve `409`.
Un VENDEDOR recibe `403`; una acción o ID inválidos, `400`; un usuario inexistente, `404`.
Las modificaciones y su auditoría se guardan en la misma transacción administrativa.

La respuesta `200` contiene `{ "exito": true, "datos": { "usuario": { ... } } }`.
El listado y detalle de usuarios incluyen `google_estado` y `google_correo` (nullable).

## Pruebas

Ejecutar `npm test` desde `backend/`. Las pruebas simulan la verificación de Google y
la persistencia; no requieren credenciales reales ni modifican una base de datos.
