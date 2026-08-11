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
      "rol": "ADMINISTRADOR"
    }
  }
}
```

El token de acceso debe mantenerse en la memoria de React. No debe guardarse en
`localStorage`. La cookie de renovación la administra automáticamente el
navegador.

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
