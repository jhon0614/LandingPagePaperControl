# API de autenticación para frontend

## Configuración común

URL local del backend:

```text
http://localhost:3000
```

Las tres peticiones de autenticación deben usar `credentials: "include"` para
que el navegador pueda recibir y enviar la cookie HttpOnly. El frontend nunca
debe intentar leer `tokenRenovacion`.

## Iniciar sesión

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "correo": "admin@papercontrol.local",
  "contrasena": "contraseña-segura",
  "recordarme": false
}
```

`recordarme` es opcional y por defecto vale `false`:

- `false`: la cookie de renovación desaparece al cerrar el navegador.
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

El token de acceso que ya había sido emitido es un JWT de corta duración y no se
guarda en MySQL. Por eso el frontend debe eliminarlo de memoria al cerrar sesión;
si existiera una copia fuera del navegador, vencerá como máximo al cumplirse los
minutos configurados en `JWT_ACCESS_MINUTES`.

Para el cierre manual, el botón debe llamar `/logout`, borrar el token de acceso
y el usuario de la memoria de React, y redirigir al login.

Para el cierre automático por inactividad, el frontend controla el tiempo. Al
cumplirse el límite debe llamar al mismo `/logout`, limpiar la memoria y
redirigir al login. El backend no puede detectar por sí solo que una persona dejó
de usar una pestaña.

Cerrar el navegador con `recordarme: false` elimina la cookie de sesión, aunque
el registro de MySQL permanecerá hasta expirar o hasta una limpieza posterior.

## Ejemplo de llamadas

```js
const respuestaLogin = await fetch(`${API_URL}/api/auth/login`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ correo, contrasena, recordarme }),
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
