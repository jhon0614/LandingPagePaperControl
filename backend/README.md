# Backend de PaperControl

API REST construida con Node.js, Express y MySQL. La primera entrega implementa
el inicio de sesión siguiendo MVC y utiliza un grupo de conexiones Singleton.

## Preparación

1. Instalar MySQL 8 y preparar la base con los archivos de `../database`.
2. Crear un usuario de MySQL con permisos únicamente sobre `paper_control`.
3. Copiar `.env.example` como `.env` y reemplazar los valores sensibles.
4. Instalar dependencias con `npm install`.
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
  "contrasena": "contraseña-segura"
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

```bash
npm test
```

Las pruebas unitarias no requieren una base de datos activa. Las pruebas de
integración con MySQL se incorporarán cuando exista una base exclusiva para
pruebas.
