# Backend de PaperControl

API REST construida con Node.js, Express y MySQL para autenticación, usuarios,
inventario, ventas, caja y reportes. Sigue una separación MVC y utiliza un grupo
de conexiones Singleton.

El [índice de documentación](docs/README.md) organiza contratos de API, seguridad
y operación por función.

## Preparación

Antes de actualizar una base existente, identificar su esquema y migraciones
aplicadas mediante la [guía de compatibilidad](docs/operacion/migraciones-y-compatibilidad.md).
La [migración de seguridad de septiembre](../database/migrations/2026-09-09-seguridad-backend.sql)
cierra sesiones anteriores y no debe repetirse ni ejecutarse sobre el esquema nuevo.

1. Instalar MySQL 8 y preparar la base con los archivos de `../database`.
2. Crear un usuario de MySQL con permisos únicamente sobre `paper_control`.
3. Copiar `.env.example` como `.env` y reemplazar los valores sensibles.
4. Reproducir las dependencias del lockfile con `npm ci`.
5. Crear el primer administrador con `npm run create-admin`.
6. Iniciar la API con `npm run dev`.

## Estado del servidor

```http
GET /api/health
```

Respuesta:

```json
{
  "exito": true,
  "datos": {
    "estado": "activo"
  }
}
```

## Inicio de sesión

```http
POST /api/auth/login
Content-Type: application/json

{
  "correo": "admin@papercontrol.local",
  "contrasena": "contraseña-segura",
  "recordarme": false,
  "captchaToken": "<token de reCAPTCHA>"
}
```

Una respuesta exitosa devuelve el token de acceso y los datos mínimos del
usuario. El token de renovación se entrega en una cookie `HttpOnly` y se
almacena en MySQL únicamente mediante su hash SHA-256.

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

Posibles respuestas: `400` para datos inválidos, `401` para credenciales
incorrectas, `403` para cuenta inactiva y `423` para cuenta temporalmente
bloqueada.

La renovación, el cierre manual y el cierre automático para frontend están
documentados en [autenticación](docs/api/autenticacion.md).
Ese documento también contiene el cambio de contraseña y la recuperación por
correo. Las acciones administrativas de desbloqueo y restablecimiento están en
[usuarios y roles](docs/api/usuarios.md).

El inicio de sesión y la vinculación con Google, la variable `GOOGLE_CLIENT_ID`,
el requisito de `usuarios.google_sub` y los errores de ambos endpoints están en
[autenticación con Google](docs/api/autenticacion.md#autenticación-con-google).

## Estructura MVC

- `routes`: define las direcciones y validaciones de entrada.
- `controllers`: recibe solicitudes y devuelve respuestas HTTP.
- `services`: implementa autenticación y reglas de negocio.
- `models`: contiene las consultas parametrizadas a MySQL.
- `config/database.js`: administra las conexiones mediante Singleton.

Los nombres de carpetas permanecen en inglés porque siguen la convención común
de Express. Los nombres propios del código y el contrato JSON están en español.
Las propiedades exigidas por librerías externas, como `process.env`, `user-agent`,
`expiresIn`, `database`, `user` y `password`, conservan su nombre original.

## Pruebas

El alcance documentado y el antecedente de inventario/caja están en
[su guía funcional](docs/api/inventario-caja.md).
Los límites de solicitudes, controles de seguridad y consideraciones de despliegue
están en [controles de seguridad](docs/seguridad/controles.md).

```bash
npm test
```

Las pruebas unitarias usan dobles o fixtures locales. El script
`npm run test:integration` ya existe y requiere MySQL local, permisos para crear
una base temporal independiente y un entorno de pruebas separado. Consulta sus
[condiciones de operación](docs/operacion/migraciones-y-compatibilidad.md) antes
de usarlo; no debe ejecutarse contra datos reales. Esta reorganización documental
no ejecuta ninguno de esos comandos.
