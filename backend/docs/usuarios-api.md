# API de administración de usuarios y roles

## Estado

- Historia: HU-36 - Administración de usuarios y roles.
- Endpoints documentados: implementados.
- Acceso: exclusivo para usuarios con rol `ADMINISTRADOR`.
- URL local del backend: `http://localhost:3000`.

## Requisitos para frontend

Todas las peticiones de este documento deben enviar el token de acceso:

```http
Authorization: Bearer <tokenAcceso>
Content-Type: application/json
```

El token se obtiene en `POST /api/auth/login`. El frontend debe enviar solamente
el token de acceso en `Authorization`; el token de renovación se maneja mediante
una cookie HttpOnly.

Los roles utilizados por el sistema son:

- `ADMINISTRADOR`: administra usuarios y roles disponibles.
- `VENDEDOR`: no puede acceder a estos endpoints.
- `DUENO`: consulta dashboard, inventario, ventas y reportes, pero no administra usuarios.

## Formato común

Respuesta exitosa:

```json
{
  "exito": true,
  "datos": {}
}
```

Respuesta con error:

```json
{
  "exito": false,
  "error": {
    "codigo": "CODIGO_DEL_ERROR",
    "mensaje": "Descripción entendible del problema."
  }
}
```

Los errores de validación pueden incluir `error.detalles` con los campos que
deben corregirse.

## Representación de un usuario

```json
{
  "id": 2,
  "nombres": "Laura",
  "apellidos": "Gómez",
  "correo": "laura@papercontrol.local",
  "estaActivo": true,
  "debeCambiarContrasena": true,
  "creadoEn": "2026-08-07T12:00:00.000Z",
  "rol": {
    "id": 2,
    "nombre": "VENDEDOR"
  }
}
```

La API nunca devuelve contraseñas, hashes, tokens ni credenciales internas.

## Consultar roles disponibles

```http
GET /api/roles
```

Respuesta `200 OK`:

```json
{
  "exito": true,
  "datos": {
    "roles": [
      {
        "id": 1,
        "nombre": "ADMINISTRADOR",
        "descripcion": "Gestiona usuarios, inventario, configuración y reportes."
      },
      {
        "id": 2,
        "nombre": "VENDEDOR",
        "descripcion": "Registra ventas, clientes, caja y consulta productos."
      },
      {
        "id": 3,
        "nombre": "DUENO",
        "descripcion": "Consulta dashboard, inventario, ventas y reportes."
      }
    ]
  }
}
```

El frontend debe utilizar estos ID para construir el selector de roles; no debe
suponer que siempre tendrán un valor fijo.

## Listar usuarios

```http
GET /api/usuarios
```

Respuesta `200 OK`:

```json
{
  "exito": true,
  "datos": {
    "usuarios": []
  }
}
```

`usuarios` contiene objetos con la representación descrita anteriormente. Los
usuarios eliminados lógicamente no aparecen.

## Consultar un usuario

```http
GET /api/usuarios/:id
```

Ejemplo:

```http
GET /api/usuarios/2
```

Respuesta `200 OK`:

```json
{
  "exito": true,
  "datos": {
    "usuario": {}
  }
}
```

Errores particulares:

| Estado | Código | Motivo |
|---:|---|---|
| 400 | `ID_USUARIO_INVALIDO` | El ID no es un entero positivo. |
| 404 | `USUARIO_NO_ENCONTRADO` | El usuario no existe o fue eliminado. |

## Crear un usuario

```http
POST /api/usuarios
```

Cuerpo:

```json
{
  "nombres": "Laura",
  "apellidos": "Gómez",
  "correo": "laura@papercontrol.local",
  "contrasenaTemporal": "Temporal#1234",
  "rolId": 2
}
```

Reglas:

- `nombres` y `apellidos`: entre 1 y 80 caracteres.
- `correo`: formato válido, máximo 191 caracteres y valor único.
- `contrasenaTemporal`: entre 12 y 200 caracteres, con mayúscula, minúscula y número.
- `rolId`: entero positivo que debe existir en `GET /api/roles`.
- El usuario se crea activo y debe cambiar su contraseña temporal.

Respuesta `201 Created`:

```json
{
  "exito": true,
  "datos": {
    "usuario": {}
  }
}
```

Errores particulares:

| Estado | Código | Motivo |
|---:|---|---|
| 400 | `ERROR_VALIDACION` | Faltan campos o no cumplen las reglas. |
| 404 | `ROL_NO_ENCONTRADO` | El rol solicitado no existe. |
| 409 | `CORREO_EXISTENTE` | El correo pertenece a un usuario existente. |
| 409 | `USUARIO_ELIMINADO_EXISTENTE` | El correo pertenece a una cuenta eliminada recuperable. |

## Actualizar datos y rol

```http
PATCH /api/usuarios/:id
```

Todos los campos son opcionales, pero debe enviarse al menos uno:

```json
{
  "nombres": "Laura María",
  "apellidos": "Gómez",
  "correo": "laura.gomez@papercontrol.local",
  "rolId": 3
}
```

Respuesta `200 OK`:

```json
{
  "exito": true,
  "datos": {
    "usuario": {}
  }
}
```

Reglas y errores particulares:

| Estado | Código | Motivo |
|---:|---|---|
| 400 | `ERROR_VALIDACION` | El cuerpo está vacío o contiene datos inválidos. |
| 400 | `ID_USUARIO_INVALIDO` | El ID no es válido. |
| 403 | `CAMBIO_ROL_PROPIO_PROHIBIDO` | El administrador intentó cambiar su propio rol. |
| 404 | `USUARIO_NO_ENCONTRADO` | El usuario no existe. |
| 404 | `ROL_NO_ENCONTRADO` | El rol solicitado no existe. |
| 409 | `CORREO_EXISTENTE` | El correo pertenece a otro usuario. |
| 409 | `USUARIO_ELIMINADO_EXISTENTE` | El correo pertenece a un usuario eliminado. |
| 409 | `ULTIMO_ADMINISTRADOR` | El cambio dejaría al sistema sin administrador activo. |

La contraseña y el estado no se modifican mediante este endpoint.

## Activar o desactivar un usuario

```http
PATCH /api/usuarios/:id/estado
```

Desactivar:

```json
{
  "estaActivo": false
}
```

Activar:

```json
{
  "estaActivo": true
}
```

Respuesta `200 OK`:

```json
{
  "exito": true,
  "datos": {
    "usuario": {}
  }
}
```

Reglas:

- `estaActivo` debe ser un booleano real, no el texto `"true"` o `"false"`.
- Un administrador no puede desactivarse a sí mismo.
- Siempre debe permanecer al menos un administrador activo.
- Al desactivar se revocan las sesiones renovables del usuario.
- Reactivar no recupera las sesiones revocadas.

Errores particulares:

| Estado | Código | Motivo |
|---:|---|---|
| 400 | `ERROR_VALIDACION` | `estaActivo` no es booleano. |
| 400 | `ID_USUARIO_INVALIDO` | El ID no es válido. |
| 403 | `AUTO_DESACTIVACION_PROHIBIDA` | El administrador intentó desactivarse. |
| 404 | `USUARIO_NO_ENCONTRADO` | El usuario no existe. |
| 409 | `ULTIMO_ADMINISTRADOR` | Se intentó desactivar al último administrador activo. |

## Eliminar lógicamente un usuario

```http
DELETE /api/usuarios/:id
```

La operación no borra la fila de MySQL. El backend asigna la fecha actual a
`eliminado_en`, deja al usuario inactivo, revoca sus sesiones y registra la
acción en auditoría.

Respuesta exitosa:

```text
204 No Content
```

Una respuesta `204` no contiene JSON. El frontend puede retirar al usuario del
listado cuando reciba ese estado.

Reglas:

- Solo un `ADMINISTRADOR` puede eliminar usuarios.
- Un administrador no puede eliminarse a sí mismo.
- No se puede eliminar al último administrador activo.
- Un usuario eliminado no aparece en los listados ni puede autenticarse.
- Su correo queda reservado para permitir una recuperación controlada futura.
- Repetir la eliminación devuelve `404`, porque el usuario ya no está disponible.

Errores particulares:

| Estado | Código | Motivo |
|---:|---|---|
| 400 | `ID_USUARIO_INVALIDO` | El ID no es válido. |
| 403 | `AUTO_ELIMINACION_PROHIBIDA` | El administrador intentó eliminarse. |
| 404 | `USUARIO_NO_ENCONTRADO` | El usuario no existe o ya fue eliminado. |
| 409 | `ULTIMO_ADMINISTRADOR` | Se intentó eliminar al último administrador activo. |

## Errores comunes de autenticación y permisos

Estos códigos pueden aparecer en cualquiera de los endpoints anteriores:

| Estado | Código | Motivo |
|---:|---|---|
| 401 | `NO_AUTENTICADO` | No se envió el encabezado de autorización. |
| 401 | `TOKEN_MAL_FORMADO` | El encabezado no tiene el formato `Bearer token`. |
| 401 | `TOKEN_INVALIDO` | La firma o el contenido del token no es válido. |
| 401 | `TOKEN_EXPIRADO` | El token de acceso venció. |
| 401 | `USUARIO_NO_DISPONIBLE` | El usuario no existe, fue eliminado o está inactivo. |
| 403 | `ACCESO_DENEGADO` | El rol autenticado no puede administrar usuarios. |

Ante un `401`, el frontend debe intentar el flujo de renovación cuando esté
implementado o enviar al usuario al inicio de sesión. Ante un `403`, debe
ocultar la acción administrativa y mostrar un mensaje de permisos insuficientes.

## Auditoría

La API registra automáticamente:

- `CREAR_USUARIO`
- `ACTUALIZAR_USUARIO`
- `CAMBIAR_ROL_USUARIO`
- `ACTIVAR_USUARIO`
- `DESACTIVAR_USUARIO`
- `ELIMINAR_USUARIO`

La auditoría guarda el administrador responsable, el usuario afectado, la IP,
la fecha y detalles no sensibles. No existe todavía un endpoint para consultar
este historial desde frontend.

## Nota sobre reactivación

La reactivación de usuarios inactivos se realiza mediante
`PATCH /api/usuarios/:id/estado`. Las cuentas eliminadas lógicamente todavía no
cuentan con un endpoint de recuperación; intentar crear nuevamente su correo
devuelve `409 USUARIO_ELIMINADO_EXISTENTE`.
