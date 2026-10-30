# Autenticación con Google en el backend

Este documento describe la implementación de la rama `fixes`. Las rutas se
montan bajo `/api/auth`. No incluye reCAPTCHA ni endpoints presentes solamente
en otras ramas.

## Organización MVC

El proyecto mantiene MVC: React representa la vista; el controlador traduce
solicitudes y respuestas HTTP; los modelos consultan y actualizan MySQL.
Los servicios apoyan al modelo y al controlador con las reglas de negocio.
Separar servicios no sustituye MVC por una arquitectura diferente.

El flujo de Google está distribuido así:

- `src/routes/auth.routes.js`: valida los cuerpos y aplica autenticación y límites.
- `src/controllers/auth.controller.js`: recibe la credencial, devuelve JSON y,
  al iniciar sesión, establece la cookie de renovación.
- `src/services/auth.service.js`: verifica la credencial de Google, comprueba la
  cuenta local y abre la sesión de PaperControl.
- `src/models/user.model.js`: busca por `google_sub` y persiste la vinculación.
- `src/models/session.model.js`: persiste las sesiones locales.

## Configuración y base de datos

Instalar las dependencias del backend con `npm ci` desde `backend/`.
`google-auth-library` ya está declarada en `package.json`.

Configurar en `backend/.env` el identificador del cliente de Google utilizado
para obtener la credencial:

```dotenv
GOOGLE_CLIENT_ID=tu_id.apps.googleusercontent.com
```

La configuración actual exige esta variable al arrancar la API. El servicio la
usa como `audience` al llamar a `OAuth2Client.verifyIdToken`. Este flujo recibe
un ID token en `credential`; no recibe un código de autorización, un access
token de Google ni un secreto de cliente. La API emite sus propios tokens de
sesión después de verificar la identidad y la cuenta local.

La tabla `usuarios` debe incluir la columna definida en `database/schema.sql`:

```sql
google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE
```

`google_sub` guarda el identificador `sub` verificado por Google. No reemplaza
`usuarios.id`, no es un UUID de PaperControl y no cambia las relaciones de la BD.
La restricción `UNIQUE` impide vincular la misma identidad de Google a varios
usuarios locales.

Para instalaciones nuevas, el esquema ya incluye la columna. Para bases
existentes, revisar su estructura antes del despliegue: en esta rama todavía
no hay una migración versionada que agregue `google_sub`. No ejecutar de nuevo
todo `schema.sql` sobre una base con datos para incorporar esta columna.

## Vincular una cuenta existente

Primero se inicia sesión con la contraseña local y se completa cualquier cambio
obligatorio de contraseña. Después se envía una credencial de Google junto con
el token de acceso de PaperControl:

```http
POST /api/auth/google/vincular
Authorization: Bearer <tokenAccesoPaperControl>
Content-Type: application/json

{
  "credential": "<idTokenGoogle>"
}
```

Respuesta `200`:

```json
{
  "exito": true,
  "datos": {
    "mensaje": "Cuenta de Google vinculada correctamente."
  }
}
```

La vinculación usa el usuario identificado por el middleware, no un ID recibido
en el cuerpo. Solo actualiza cuentas activas, no eliminadas, sin cambio de
contraseña pendiente y sin una vinculación previa. Si la cuenta ya está
vinculada, incluso a la misma identidad, responde con conflicto. No abre una
sesión nueva ni devuelve tokens.

No se crean usuarios automáticamente ni se vinculan por coincidencia de correo.
La implementación actual tampoco ofrece un endpoint para desvincular Google.

## Iniciar sesión con Google

Una vez vinculada la cuenta:

```http
POST /api/auth/google
Content-Type: application/json

{
  "credential": "<idTokenGoogle>",
  "recordarme": false
}
```

`credential` es obligatorio, se recorta y admite de 1 a 10.000 caracteres.
`recordarme` es un booleano opcional con valor predeterminado `false`.

El servicio verifica el ID token, exige `sub` y `email_verified === true`, y
busca una cuenta local no eliminada por `google_sub`. Rechaza cuentas inactivas
o bloqueadas. El rol y los datos de usuario provienen de MySQL, no del token de
Google.

Respuesta `200`:

```json
{
  "exito": true,
  "datos": {
    "tokenAcceso": "<jwtPaperControl>",
    "usuario": {
      "id": 7,
      "nombres": "Ana",
      "apellidos": "Perez",
      "correo": "ana@example.com",
      "rol": "VENDEDOR",
      "debeCambiarContrasena": false
    }
  }
}
```

También establece `tokenRenovacion` mediante una cookie HttpOnly, con las
mismas opciones del login con contraseña. El navegador debe permitir el envío
y recepción de cookies mediante `credentials: "include"`. El token de
renovación no se devuelve en el JSON y solo se guarda su hash en MySQL.

Con `recordarme: false`, la cookie no lleva fecha explícita de expiración; con
`true`, usa la expiración configurada. La vigencia de la sesión también se
comprueba en el servidor. En producción la cookie es `Secure` y `SameSite=None`;
en desarrollo es `SameSite=Strict`. Su ruta es `/api/auth`.

La renovación y el cierre siguen usando `POST /api/auth/refresh` y
`POST /api/auth/logout`. Las peticiones a los módulos protegidos utilizan el
JWT de PaperControl. El cambio obligatorio de contraseña sigue aplicándose
mediante el middleware aunque el acceso se haya realizado con Google.

## Errores y límites

Los errores controlados conservan el formato general:

```json
{
  "exito": false,
  "error": {
    "codigo": "GOOGLE_NO_VINCULADO",
    "mensaje": "Primero inicia sesión con tu contraseña y vincula Google."
  }
}
```

| HTTP | Código o situación | Alcance |
| --- | --- | --- |
| 400 | Cuerpo inválido | Ambos endpoints. |
| 401 | `GOOGLE_CREDENCIAL_INVALIDA` | No se pudo verificar el ID token. |
| 401 | `GOOGLE_CUENTA_NO_VERIFICADA` | Falta `sub` o el correo no está verificado. |
| 401 | `GOOGLE_NO_VINCULADO` | Login sin cuenta local vinculada disponible. |
| 403 | `CUENTA_INACTIVA` | Login con cuenta local desactivada. |
| 423 | `CUENTA_BLOQUEADA` | Login durante un bloqueo vigente. |
| 409 | `GOOGLE_VINCULACION_NO_DISPONIBLE` | Vinculación rechazada o identidad ya utilizada. |
| 401/403 | Error del middleware de autenticación | Vinculación sin sesión válida o con cambio obligatorio pendiente. |
| 429 | Límite de solicitudes | Exceso de peticiones. |

`/google` comparte con `/login` el limitador de 20 solicitudes por 15 minutos.
`/google/vincular` comparte con el cambio de contraseña el de 5 por 15 minutos.
Además se aplican el límite general de la API y los controles de origen.

## Verificación

Desde `backend/`:

```sh
node --test --test-isolation=none test/auth.service.test.js
npm test
```

Las pruebas de Google del servicio simulan `verifyIdToken`: comprueban la
creación de la sesión local, cuentas sin vincular, inactivas y bloqueadas,
conflictos de vinculación y credenciales rechazadas antes de consultar usuarios.
No verifican una credencial real contra Google ni la persistencia en MySQL.

Antes de entregar, comprobar con una base de pruebas y credenciales reales:
vinculación de una cuenta existente, rechazo de una identidad ya vinculada,
login, recepción de la cookie, renovación, cierre y restricciones por rol.
Un ID de cliente incorrecto, una credencial expirada o una columna `google_sub`
ausente deben investigarse por separado; no registrar tokens completos en logs.
