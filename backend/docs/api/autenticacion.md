# API de autenticación para frontend

Ver [convenciones de la API](convenciones.md) y
[administración de usuarios](usuarios.md) para los contratos comunes y las
acciones administrativas. Esta guía reúne autenticación local y Google; no
representa una nueva ejecución de pruebas.

## Configuración común

URL local del backend:

```text
http://localhost:3000
```

Las peticiones que reciben o envían la cookie de sesión deben usar `credentials: "include"` para
que el navegador pueda recibir y enviar la cookie HttpOnly. El frontend nunca
debe intentar leer `tokenRenovacion`.

## Autenticación con Google

El backend admite `POST /api/auth/google` y
`POST /api/auth/google/vincular`. No crea usuarios automáticamente: una identidad
Google válida puede solicitar acceso para una cuenta local existente, pero no
habilita una sesión hasta obtener aprobación administrativa.

### Configuración y base de datos

Configurar `GOOGLE_CLIENT_ID` y disponer de las dependencias del backend. La API
verifica el ID token con `google-auth-library`, su audiencia, `sub`, correo y
`email_verified === true`.

Las instalaciones nuevas usan `database/schema.sql`. Para bases existentes,
aplicar en orden `database/migrations/2026-11-06-google-sub.sql` si falta
`google_sub`, y `database/migrations/2026-11-06-google-aprobacion.sql`.
La segunda añade `google_correo` y `google_estado`; los registros con `google_sub`
previo pasan a `APROBADO`, con `google_correo = correo`. No volver a ejecutar el
esquema completo sobre una base existente. Ver la
[guía de migraciones](../operacion/migraciones-y-compatibilidad.md).

### Login con Google

```http
POST /api/auth/google
Content-Type: application/json
```

```json
{
  "credential": "<ID token Google>",
  "recordarme": false
}
```

Si el `sub` no existe, se busca el correo verificado normalizado en las cuentas
locales. Para una cuenta activa sin vinculación y con estado `NINGUNO`, se guardan
el `sub`, el correo y el estado `PENDIENTE`, sin crear usuario ni sesión. Las
solicitudes repetidas conservan el estado; un rechazo no se convierte
automáticamente en pendiente.

| Estado HTTP | Código | Significado |
| --- | --- | --- |
| 403 | `GOOGLE_PENDIENTE` | Solicitud enviada; espera aprobación administrativa. |
| 403 | `GOOGLE_RECHAZADO` | La solicitud de acceso fue rechazada. |
| 401 | `GOOGLE_NO_VINCULADO` | No existe una cuenta local disponible o tiene otro `sub`. |
| 401 | `GOOGLE_CREDENCIAL_INVALIDA` / `GOOGLE_CUENTA_NO_VERIFICADA` | Credencial inválida o identidad incompleta/no verificada. |

Solo `APROBADO` permite crear la sesión. Se mantienen los controles de cuenta
activa y bloqueo; el rol procede de MySQL. La respuesta exitosa contiene el mismo
`datos.tokenAcceso` y `datos.usuario` del login local, además de la cookie HttpOnly.
Login local y Google comparten el límite de 20 solicitudes por IP cada 15 minutos,
además del límite global.

### Solicitar vinculación desde una sesión existente

`POST /api/auth/google/vincular` exige Bearer token y recibe
`{ "credential": "<ID token Google>" }`. El correo verificado debe coincidir con
el del usuario autenticado. También solicita aprobación mediante
`403 GOOGLE_PENDIENTE`; no habilita Google por su cuenta.

La aprobación, el rechazo, la revocación y la reapertura se documentan en
[gestión del acceso con Google](usuarios.md#gestionar-acceso-con-google).

## Iniciar sesión

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "correo": "admin@papercontrol.local",
  "contrasena": "contraseña-segura",
  "recordarme": false,
  "captchaToken": "<token de reCAPTCHA>"
}
```

`recordarme` es opcional y por defecto vale `false`:

- `false`: se crea una cookie de sesión, sin fecha de expiración persistente;
  su conservación depende del ciclo de sesión y de las opciones del navegador.
- `true`: la cookie permanece hasta la fecha de expiración configurada.

Respuesta `200`:

```json
{
  "exito": true,
  "datos": {
    "tokenAcceso": "...",
    "usuario": {
      "id": 1,
      "nombres": "Administrador",
      "apellidos": "PaperControl",
      "correo": "admin@papercontrol.local",
      "rol": "ADMINISTRADOR",
      "debeCambiarContrasena": false
    }
  }
}
```

El token de acceso debe mantenerse en la memoria de React. No debe guardarse en
`localStorage`. La cookie de renovación la administra automáticamente el
navegador.

Si `debeCambiarContrasena` es `true`, el frontend debe enviar al usuario a la
pantalla de cambio de contraseña. El backend responderá
`403 CAMBIO_CONTRASENA_REQUERIDO` en las demás rutas protegidas hasta que haga
el cambio.

## Renovar la sesión

```http
POST /api/auth/refresh
```

No lleva body ni encabezado `Authorization`. Debe enviarse con
`credentials: "include"`.

Respuesta `200`: tiene el mismo objeto `datos` del login, con un token de acceso
nuevo. El backend también reemplaza el refresh token anterior por uno nuevo en
la cookie; el anterior deja de ser válido.

Respuesta `401`:

```json
{
  "exito": false,
  "error": {
    "codigo": "SESION_NO_VALIDA",
    "mensaje": "La sesión no es válida o ha expirado."
  }
}
```

Al cargar la aplicación, el frontend puede llamar este endpoint para recuperar
la sesión sin usar `localStorage`. Si responde `401`, debe mostrar el login.

Cuando una petición protegida responda `401` porque venció el token de acceso,
el cliente puede intentar una sola renovación, guardar el token nuevo en memoria
y repetir una sola vez la petición original. Debe evitar ciclos de reintentos y
varias renovaciones simultáneas.

## Cerrar sesión

```http
POST /api/auth/logout
```

No lleva body ni necesita token de acceso. Debe enviarse con
`credentials: "include"`.

Respuesta exitosa:

```http
204 No Content
```

El backend marca la sesión como revocada en MySQL y elimina la cookie. La
operación también responde `204` si la cookie ya no existe, por lo que puede
ejecutarse más de una vez sin causar errores.

El JWT no se almacena como tal en MySQL, pero incluye `sid`: cada petición
protegida comprueba que esa sesión siga vigente y no esté revocada. Una sesión
revocada debe rechazarse aunque el JWT todavía no haya expirado. Esto no cancela
peticiones que ya fueron autorizadas. El frontend también debe limpiar su token
de memoria; esa limpieza no sustituye la revocación del backend.

Para el cierre manual, el botón debe llamar `/logout`, borrar el token de acceso
y el usuario de la memoria de React, y redirigir al login.

Para el cierre automático por inactividad, el frontend controla el tiempo. Al
cumplirse el límite debe llamar al mismo `/logout`, limpiar la memoria y
redirigir al login. El backend no puede detectar por sí solo que una persona dejó
de usar una pestaña.

`recordarme: false` no asigna expiración persistente a la cookie, pero cerrar una
pestaña o un navegador no equivale a confirmar una revocación en MySQL. El registro
del servidor permanece hasta expirar, revocarse o ser retirado por limpieza.

## Ejemplo de llamadas

```js
const respuestaLogin = await fetch(`${API_URL}/api/auth/login`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ correo, contrasena, recordarme, captchaToken }),
});

const respuestaRefresh = await fetch(`${API_URL}/api/auth/refresh`, {
  method: "POST",
  credentials: "include",
});

await fetch(`${API_URL}/api/auth/logout`, {
  method: "POST",
  credentials: "include",
});
```

## Cambiar la contraseña autenticada

```http
PATCH /api/auth/contrasena
Authorization: Bearer <tokenAcceso>
Content-Type: application/json
```

```json
{
  "contrasenaActual": "Actual#123456",
  "contrasenaNueva": "Nueva#1234567"
}
```

La contraseña nueva debe tener entre 12 y 200 caracteres, no superar 72 bytes UTF-8 (límite de bcrypt) e incluir mayúscula,
minúscula y número. No puede ser igual a la actual.

Después de una respuesta `200`, todas las sesiones renovables quedan revocadas.
El frontend debe limpiar su sesión en memoria y enviar al usuario al login.

Errores particulares:

| Estado | Código | Motivo |
|---:|---|---|
| 400 | `CONTRASENA_ACTUAL_INCORRECTA` | La contraseña actual no coincide. |
| 400 | `CONTRASENA_SIN_CAMBIOS` | La contraseña nueva es igual a la actual. |
| 400 | `ERROR_VALIDACION` | La contraseña nueva no cumple las reglas. |
| 401 | `NO_AUTENTICADO` | Falta un token de acceso válido. |

## Solicitar recuperación por correo

```http
POST /api/auth/olvide-contrasena
Content-Type: application/json
```

```json
{
  "correo": "usuario@papercontrol.local"
}
```

La respuesta siempre es `200` y utiliza el mismo mensaje exista o no el correo:

```json
{
  "exito": true,
  "datos": {
    "mensaje": "Si el correo pertenece a una cuenta disponible, recibirás las instrucciones."
  }
}
```

Esto evita revelar qué correos están registrados. El endpoint admite cinco
solicitudes por dirección IP cada 15 minutos; al superar el límite responde
`429 DEMASIADAS_SOLICITUDES`.

El enlace enviado contiene un token aleatorio. MySQL almacena únicamente su hash,
solo funciona el token más reciente y su duración se configura mediante
`PASSWORD_RESET_MINUTES`.

## Restablecer mediante el enlace

```http
POST /api/auth/restablecer-contrasena
Content-Type: application/json
```

```json
{
  "token": "token-recibido-en-el-enlace",
  "contrasenaNueva": "Nueva#1234567"
}
```

Una respuesta `200` confirma el cambio. El token queda consumido, se limpian el
bloqueo y los intentos fallidos, y se revocan todas las sesiones existentes.
Estas operaciones se realizan juntas dentro de una transacción MySQL.

Un token inexistente, vencido o ya utilizado responde:

```json
{
  "exito": false,
  "error": {
    "codigo": "TOKEN_RESTABLECIMIENTO_INVALIDO",
    "mensaje": "El enlace no es válido o ya expiró."
  }
}
```

La pantalla del frontend debe leer `token` desde la URL, pedir y confirmar la
nueva contraseña y, al finalizar, redirigir al login.

## Referencias de cobertura

`backend/test/auth.service.test.js`, `auth.controller.test.js`,
`auth.middleware.test.js`, `password.service.test.js`, `google-admin.test.js` y
`recaptcha.service.test.js` contienen pruebas relacionadas. Las verificaciones de
Google se simulan en esas pruebas; no requieren credenciales Google reales.
Esta reorganización no ejecuta esos comandos ni acredita un resultado nuevo.
