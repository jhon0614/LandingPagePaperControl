# PaperControl

Aplicación web para gestionar el inventario, las ventas y la caja de una papelería. Integra una página de presentación y un sistema de gestión para vendedores, administradores y dueños.

El proyecto está organizado en una interfaz React, una API REST con Express y una base de datos MySQL.

## Funcionalidades

- **Autenticación:** inicio y cierre de sesión, opción «Recordarme», cambio de contraseña y recuperación por correo.
- **Usuarios:** creación, edición, roles, activación, desactivación y desbloqueo de cuentas.
- **Inventario:** productos, categorías, entradas y ajustes de existencias, movimientos y alertas de stock bajo.
- **Proveedores:** gestión de datos y asociación con productos.
- **Clientes:** registro, consulta, actualización e historial de compras según los permisos del usuario.
- **Ventas:** productos, descuentos, pagos en efectivo, tarjeta o transferencia, comprobantes e historial. La anulación revierte las existencias dentro de una transacción.
- **Caja:** apertura de turno, gastos, resumen y cierre con monto contado.
- **Reportes:** resumen del negocio, reporte de caja y productos más vendidos.

Los roles disponibles son `VENDEDOR`, `ADMINISTRADOR` y `DUENO`. El backend comprueba la autenticación y los permisos de las rutas protegidas.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Interfaz | React 19, React Router, Vite, CSS, Recharts y SweetAlert2 |
| API | Node.js, Express 5 y Zod |
| Datos | MySQL 8 y mysql2 |
| Autenticación | JWT, bcryptjs y cookies HttpOnly para renovación de sesión |
| Correo | Nodemailer y cola de recuperación en MySQL |
| Validación del proyecto | Node Test Runner y ESLint |

## Estructura

```text
frontend/
  src/
    components/    Componentes compartidos
    pages/         Pantallas y página de presentación
    routes/        Protección de rutas del frontend
    services/      Comunicación con la API
    styles/        Estilos de las pantallas
    utils/         Utilidades de formato y validación
backend/
  src/
    config/        Configuración y conexiones a MySQL
    routes/        Endpoints y validación de entradas
    controllers/   Solicitudes y respuestas HTTP
    services/      Reglas de negocio
    models/        Consultas y persistencia
    middleware/    Autenticación, permisos y errores
  scripts/         Creación del administrador inicial
  test/            Pruebas automatizadas
  integration/     Pruebas con MySQL local
  docs/            Documentación de la API
database/
  schema.sql       Esquema para una instalación nueva
  seed.sql         Roles, métodos de pago y parámetros iniciales
  migrations/      Actualizaciones para bases existentes
  pruebas/         Datos y scripts de prueba de inventario
```

## Instalación local

### 1. Preparar el entorno

Entorno de referencia: **Node.js 24.12**, npm y **MySQL 8.0 o superior**. Para enviar enlaces de recuperación necesitas acceso a un servidor SMTP.

Desde la raíz del repositorio, instala las dependencias de ambas aplicaciones:

```sh
npm --prefix backend ci
npm --prefix frontend ci
```

### 2. Crear la base de datos

Para una instalación nueva, abre y ejecuta en MySQL Workbench, en este orden:

1. `database/schema.sql`
2. `database/seed.sql`

Se creará la base `paper_control`. El seed carga roles, métodos de pago y parámetros iniciales; no crea usuarios con credenciales predeterminadas.

Configura un usuario MySQL para la aplicación con permisos sobre esa base. Si ya tienes una base con información, consulta las migraciones correspondientes en lugar de volver a ejecutar el esquema inicial. El esquema nuevo ya incorpora cambios presentes en las migraciones; no las ejecutes todas sobre una instalación nueva.

### 3. Configurar el backend

Copia `backend/.env.example` como `backend/.env`. En PowerShell, desde la raíz:

```powershell
Copy-Item backend/.env.example backend/.env
```

Completa los valores del archivo:

| Variables | Uso |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a MySQL |
| `JWT_ACCESS_SECRET` | Secreto aleatorio de al menos 32 bytes para firmar tokens |
| `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Datos del primer administrador |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | Envío de correos de recuperación |
| `FRONTEND_ORIGIN` | Origen autorizado; localmente `http://localhost:5173` |
| `FRONTEND_RESET_PASSWORD_URL` | Recuperación; localmente `http://localhost:5173/#/restablecer-contrasena` |

Puedes generar un secreto desde la terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copia el resultado en `JWT_ACCESS_SECRET`. Sustituye también los demás valores de ejemplo: el backend valida la configuración al arrancar, incluida la configuración de correo. Conserva las credenciales únicamente en tu entorno y no las publiques en el repositorio.

### 4. Configurar el frontend

Crea `frontend/.env` con este contenido:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Incluye `/api`, sin una barra final. Las variables con prefijo `VITE_` se incorporan al frontend y son públicas: no coloques contraseñas ni secretos en ellas.

### 5. Crear el administrador e iniciar la API

En una terminal, desde la raíz:

```sh
cd backend
npm run create-admin
npm run dev
```

Ejecuta `create-admin` una sola vez para el correo configurado. La API inicia en `http://localhost:3000` y requiere que MySQL esté disponible y el esquema esté preparado.

Comprueba su estado en [GET /api/health](http://localhost:3000/api/health):

```json
{
  "exito": true,
  "datos": { "estado": "activo" }
}
```

### 6. Iniciar la interfaz

En otra terminal, desde la raíz:

```sh
cd frontend
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) e inicia sesión con el administrador creado. Si Vite utiliza otro puerto, ajusta `FRONTEND_ORIGIN` y `FRONTEND_RESET_PASSWORD_URL` en el backend y reinícialo.

## Comandos disponibles

Ejecuta cada comando dentro de la carpeta indicada.

| Carpeta | Comando | Descripción |
| --- | --- | --- |
| `frontend` | `npm run dev` | Inicia Vite en desarrollo |
| `frontend` | `npm run build` | Genera la interfaz en `frontend/dist` |
| `frontend` | `npm run preview` | Sirve una vista previa local de la compilación |
| `frontend` | `npm run lint` | Ejecuta ESLint |
| `frontend` | `npm run deploy` | Compila y publica el frontend con gh-pages |
| `backend` | `npm run dev` | Inicia la API con recarga al cambiar archivos |
| `backend` | `npm start` | Inicia la API sin modo de observación |
| `backend` | `npm run create-admin` | Crea el administrador definido en el entorno |
| `backend` | `npm test` | Ejecuta las pruebas de `test`, sin MySQL activo |
| `backend` | `npm run test:integration` | Ejecuta las pruebas de integración con MySQL local |

Las pruebas de integración aceptan `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER` y `TEST_DB_PASSWORD`; si faltan, utilizan las variables `DB_*` correspondientes. Crean y eliminan una base temporal con prefijo `papercontrol_test_`, por lo que necesitan una cuenta local con permisos para esas operaciones. No utilizan `DB_NAME` como base de pruebas.

## Compilación y despliegue

El frontend y el backend se despliegan por separado. GitHub Pages sirve la interfaz estática; la API y MySQL requieren sus propios servicios.

Para preparar la interfaz, configura `VITE_API_URL` con la dirección de la API y ejecuta `npm run build` dentro de `frontend`. Si publicas bajo una subruta, ajusta `base` en `frontend/vite.config.js`. La aplicación utiliza `HashRouter` para las rutas del navegador.

En el backend, configura `NODE_ENV=production`, el origen HTTPS del frontend y la URL de recuperación del mismo origen. Ajusta `TRUST_PROXY` a la topología real del servicio y configura `DB_TLS` cuando corresponda. Las variables del frontend se resuelven durante la compilación; cambiarlas requiere generar nuevamente el build.

## Documentación del proyecto

- [Preparación del backend](backend/README.md)
- [Esquema y relaciones de la base de datos](database/README.md)
- [Autenticación y recuperación de contraseña](backend/docs/autenticacion-api.md)
- [Administración de usuarios](backend/docs/usuarios-api.md)
- [Ventas y comprobantes](backend/docs/ventas-api.md)
- [Inventario y caja](backend/docs/sprint-inventario-caja.md)
- [Dashboard](backend/docs/dashboard-api.md)
- [Controles de seguridad y despliegue](backend/docs/seguridad-backend.md)
- [Cambios del backend y compatibilidad de migraciones](backend/docs/correcciones-backend-2026-09-09.md)
