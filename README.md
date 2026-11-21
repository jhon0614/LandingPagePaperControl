# PaperControl

Aplicación web para gestionar el inventario, las ventas y la caja de una papelería. Integra una página de presentación y un sistema de gestión para vendedores, administradores y dueños.

El proyecto está organizado en una interfaz React, una API REST con Express y una base de datos MySQL.

## Estado y versión de referencia

Proyecto formativo ADSO del SENA, en desarrollo y validación para entrega. Revisión documental: **13/11/2026**, sobre el código de referencia **`50fc6bf`** (12/11/2026). Esta referencia no acredita por sí sola el commit publicado en los proveedores.

Los manifiestos declaran `0.0.0` para frontend y `0.1.0` para backend; no representan una versión unificada de entrega. La etiqueta final del producto está pendiente de definir. Para identificar la revisión de una copia local, ejecuta `git rev-parse HEAD`.

## Problema y solución

PaperControl centraliza el registro de productos, existencias, ventas y turnos de caja de una papelería. Relaciona estas operaciones para actualizar el inventario con cada venta, conservar su historial y facilitar las consultas del negocio según el rol del usuario.

## Funcionalidades

- **Autenticación:** inicio y cierre de sesión, opción «Recordarme», cambio de contraseña y recuperación por correo.
- **Usuarios:** creación, edición, roles, activación, desactivación y desbloqueo de cuentas.
- **Inventario:** productos, categorías, entradas y ajustes de existencias, movimientos y alertas de stock bajo.
- **Proveedores:** gestión de datos y asociación con productos.
- **Clientes:** registro, consulta, actualización e historial de compras según los permisos del usuario.
- **Ventas:** productos, descuentos, pagos en efectivo, tarjeta o transferencia, comprobantes e historial. La anulación revierte las existencias dentro de una transacción.
- **Caja:** apertura de turno, gastos, resumen y cierre con monto contado.
- **Reportes:** resumen del negocio, reporte de caja y productos más vendidos.
- **Acceso con Google:** solicitud para una cuenta local habilitada y aprobación por Administrador o Dueño; no crea usuarios automáticamente.
- **Exportación:** descarga del reporte de caja consultado en Excel o PDF, generada en el frontend.
- **Presentación y consultas:** tema claro/oscuro, paginación en listados y detalle de productos contraíble en el comprobante.
- **Contacto:** formulario público con envío real por Resend; la aceptación del proveedor no demuestra recepción o lectura del mensaje.

Los roles disponibles son `VENDEDOR`, `ADMINISTRADOR` y `DUENO`. El backend comprueba la autenticación y los permisos de las rutas protegidas.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Interfaz | React ^19.2.6, React Router ^7.17.0 (HashRouter), Vite ^8.0.12, CSS, Recharts ^3.10.1 y SweetAlert2 ^11.26.25 |
| Exportación de caja | ExcelJS ^4.4.0, jsPDF ^4.2.1 y jsPDF-AutoTable ^5.0.9 |
| API | Node.js, Express 5 y Zod |
| Datos | MySQL 8 y mysql2 |
| Autenticación | JWT, bcryptjs y cookies HttpOnly para renovación de sesión |
| Correo | API HTTPS de Resend y cola de recuperación en MySQL |
| Validación del proyecto | Node Test Runner y ESLint |

Los rangos corresponden a los manifiestos `frontend/package.json` y `backend/package.json`; las versiones resueltas están en sus respectivos `package-lock.json`. Usa `npm ci` para reproducirlas.

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
  docs/            Índice y guías de API, seguridad y operación
database/
  schema.sql       Esquema para una instalación nueva
  seed.sql         Roles, métodos de pago y parámetros iniciales
  migrations/      Actualizaciones para bases existentes
  pruebas/         Datos y scripts de prueba de inventario
```

## Instalación local

### 1. Preparar el entorno

Entorno de referencia: **Node.js 24.12**, npm y **MySQL 8.0 o superior**. Para enviar enlaces de recuperación necesitas un dominio verificado y una API key de Resend.

También necesitas Git, un cliente MySQL (por ejemplo, Workbench), un cliente OAuth de Google y claves de reCAPTCHA v2 autorizadas para el ambiente. Los puertos locales de referencia son 5173 (frontend), 3000 (backend) y 3306 (MySQL); verifica que estén disponibles. Docker Desktop con Compose es opcional para el entorno con contenedores.

Clona el repositorio y entra en su directorio:

```powershell
git clone https://github.com/jhon0614/LandingPagePaperControl.git
Set-Location LandingPagePaperControl
```

Para reproducir la referencia de esta revisión, en una copia limpia puedes ejecutar `git switch --detach 50fc6bf`. Para trabajar con otra revisión, registra su hash junto con los resultados de validación.

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
| `RESEND_API_KEY`, `MAIL_FROM` | Envío de correos de recuperación |
| `CONTACT_TO` | Destinatario de contacto; predeterminado `notificaciones@papercontrol.online` |
| `GOOGLE_CLIENT_ID` | Cliente OAuth de Google; debe coincidir con el del frontend |
| `RECAPTCHA_SECRET_KEY` | Clave privada del sitio reCAPTCHA v2 usado en el login |
| `FRONTEND_ORIGIN` | Origen autorizado; localmente `http://localhost:5173` |
| `FRONTEND_RESET_PASSWORD_URL` | Recuperación; localmente `http://localhost:5173/#/restablecer-contrasena` |
| `NODE_ENV`, `PORT`, `TRUST_PROXY` | Entorno, puerto HTTP y proxies confiables; localmente `development`, `3000` y vacío |
| `JWT_ACCESS_MINUTES`, `REFRESH_TOKEN_DAYS`, `PASSWORD_RESET_MINUTES` | Duraciones; valores predeterminados: 15 minutos, 7 días y 30 minutos |
| `DB_TLS`, `DB_TLS_CA_FILE` | TLS y ruta al certificado CA cuando lo requiera la conexión MySQL |
| `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, `DB_CONNECT_TIMEOUT_MS`, `DB_QUERY_TIMEOUT_MS`, `DB_LOCK_WAIT_SECONDS`, `DB_TIMEZONE` | Límites del pool, tiempos de espera y zona horaria; consultar los valores de referencia en `backend/.env.example` |

Puedes generar un secreto desde la terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copia el resultado en `JWT_ACCESS_SECRET`. Sustituye también los demás valores de ejemplo: el backend valida la configuración al arrancar, incluida la configuración de correo. Conserva las credenciales únicamente en tu entorno y no las publiques en el repositorio.

### 4. Configurar el frontend

Crea `frontend/.env` con este contenido:

```dotenv
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=tu_id.apps.googleusercontent.com
VITE_RECAPTCHA_SITE_KEY=tu_clave_del_sitio
```

Utiliza el origen del backend, sin `/api` y sin barra final: los servicios del frontend ya agregan `/api` a las rutas. `VITE_GOOGLE_CLIENT_ID` debe coincidir con `GOOGLE_CLIENT_ID` del backend. Las variables con prefijo `VITE_` se incorporan al frontend y son públicas: no coloques contraseñas ni secretos en ellas. Este ejemplo se crea manualmente; actualmente no hay un `frontend/.env.example` versionado.

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

## Verificación y evidencias

Desde la raíz, ejecuta los controles correspondientes a la revisión que vas a entregar:

```sh
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix frontend run lint
npm --prefix frontend run build
```

La suite de integración requiere MySQL y las credenciales descritas arriba; `npm test` utiliza datos sintéticos y dependencias simuladas. Conserva cada resultado con fecha, comando, hash de Git y ambiente. La cobertura puede obtenerse desde `backend` con `node --test --test-isolation=none --experimental-test-coverage`; su porcentaje y umbral de aceptación están pendientes de registrar.

Como antecedente, la revisión del 12/11/2026 sobre `50fc6bf` registró 167 pruebas aisladas aprobadas y ESLint sin errores, con tres advertencias. No sustituye una ejecución sobre cambios posteriores ni acredita integración MySQL, instalación limpia, recepción de correos, exportaciones o aceptación del despliegue. No existe un pipeline CI versionado que certifique automáticamente estos controles.

## Compilación y despliegue

El frontend y el backend se despliegan por separado. La infraestructura comunicada para la entrega es:

| Servicio | Proveedor y dirección | Configuración de referencia |
| --- | --- | --- |
| Frontend | Vercel: https://papercontrol.online y https://www.papercontrol.online | Directorio `frontend`, instalación `npm ci`, build `npm run build`, salida `dist` |
| Backend | Render: https://api.papercontrol.online | Directorio `backend`, instalación `npm ci`, arranque `npm start` |
| Base de datos | MySQL administrado en Aiven | Host, puerto, usuario, contraseña y TLS del servicio en variables privadas del backend |

El endpoint público de salud es [GET /api/health](https://api.papercontrol.online/api/health). La ejecución el 12/11/2026 mostró `exito: true` y `datos.estado: "activo"`; no es una comprobación continua ni acredita todas las funciones o la versión publicada. Registra el commit efectivo de cada despliegue antes de la aceptación.

En Vercel configura `VITE_API_URL=https://api.papercontrol.online`, `VITE_GOOGLE_CLIENT_ID` y `VITE_RECAPTCHA_SITE_KEY`. En Render configura las variables privadas del backend, incluyendo `NODE_ENV=production`, `FRONTEND_ORIGIN=https://papercontrol.online` y `FRONTEND_RESET_PASSWORD_URL=https://papercontrol.online/#/restablecer-contrasena`. Si el acceso por `www` redirige al dominio principal, verifica esa redirección; el backend admite un único origen configurado, no una lista separada por comas. Autoriza los dominios utilizados en Google y reCAPTCHA.

Prepara una base nueva con esquema y semillas, o aplica únicamente las migraciones pendientes sobre una base existente, con respaldo previo. Usa el puerto y la CA suministrados por Aiven, con TLS conforme a los requisitos del servicio. No publiques sus credenciales. Crea el administrador inicial solo si aún no existe, desde un entorno autorizado conectado a la base de entrega.

Después de publicar, comprueba salud, login, permisos, apertura de caja, venta y actualización de stock; verifica también contacto, recuperación y descarga del reporte de caja. Ante un fallo, restaura el despliegue anterior de frontend/backend; una migración de datos requiere el procedimiento de recuperación del respaldo, no solo revertir Git. El respaldo, su restauración y las pruebas funcionales deben quedar documentados para la entrega.

El script `npm run deploy` de frontend utiliza `gh-pages` y permanece como mecanismo alternativo; no corresponde al despliegue actual en Vercel.

Para preparar la interfaz, configura `VITE_API_URL` con la dirección de la API y ejecuta `npm run build` dentro de `frontend`. Si publicas bajo una subruta, ajusta `base` en `frontend/vite.config.js`. La aplicación utiliza `HashRouter` para las rutas del navegador.

En el backend, configura `NODE_ENV=production`, el origen HTTPS del frontend y la URL de recuperación del mismo origen. Ajusta `TRUST_PROXY` a la topología real del servicio y configura `DB_TLS` cuando corresponda. Las variables del frontend se resuelven durante la compilación; cambiarlas requiere generar nuevamente el build.

## Documentación del proyecto

La documentación actualmente versionada se distribuye en `backend/docs` y `database`. La guía ADSO propone centralizar documentación viva, ADR, diagramas, API, datos, seguridad, pruebas, operación e índice de evidencias en `/docs`; esa estructura todavía no está incorporada y no se presenta como entregada.

La política de seguridad se mantiene en `SECURITY.md`, en la raíz: identifica `main` como rama con soporte y conserva como pendientes el canal privado de reporte y los plazos de atención.

- [Preparación del backend](backend/README.md)
- [Preparación y organización del frontend](frontend/README.md)
- [Índice de documentación del backend](backend/docs/README.md)
- [Esquema y relaciones de la base de datos](database/README.md)
- [Convenciones y listados](backend/docs/api/convenciones.md)
- [Autenticación, Google y recuperación de contraseña](backend/docs/api/autenticacion.md)
- [Administración de usuarios y aprobación de Google](backend/docs/api/usuarios.md)
- [Ventas, compras, descuentos y comprobantes](backend/docs/api/ventas.md)
- [Inventario y caja](backend/docs/api/inventario-caja.md)
- [Dashboard](backend/docs/api/dashboard.md)
- [Política de seguridad — borrador; rama `main` con soporte y canal privado pendiente](SECURITY.md)
- [Controles de seguridad y despliegue](backend/docs/seguridad/controles.md)
- [Migraciones y compatibilidad del backend](backend/docs/operacion/migraciones-y-compatibilidad.md)

## Docker con recarga automática

Desde la raíz del repositorio, con Docker Desktop iniciado y `.env.docker`
y `backend/.env` configurados:

Crea `.env.docker` a partir de `.env.docker.example` y completa sus valores ficticios con la configuración local. El archivo es privado. Prepara también `backend/.env` como se indicó en instalación local. La base se inicializa con esquema y semillas únicamente cuando el volumen está vacío.

```sh
docker compose --env-file .env.docker -f compose.yaml -f compose.dev.yaml up -d --build
```

Abre http://localhost:8080. Vite actualiza la interfaz al guardar archivos y
Nodemon reinicia la API al cambiar su código. Se conserva la base MySQL local y su
volumen; este entorno no utiliza Aiven. Los observadores del frontend y backend usan polling
para detectar cambios en los archivos compartidos desde Windows.

Los directorios de código se montan como solo lectura dentro de los contenedores;
las dependencias se instalan en Linux dentro de las imágenes.
Al modificar `package.json`, `package-lock.json` o los Dockerfile, vuelve a ejecutar
el comando anterior. Los cambios en variables de entorno requieren recrear el
servicio con el mismo comando. Las migraciones SQL se aplican por separado.

Para detener el entorno conservando sus datos:

```sh
docker compose --env-file .env.docker -f compose.yaml -f compose.dev.yaml stop
```

Para volver a las imágenes compiladas, sin recarga automática:

```sh
docker compose --env-file .env.docker up -d --build
```

## Solicitudes de contacto de la landing

El formulario envía `POST /api/contacto` con nombre, apellido, email y mensaje.
El contacto no requiere CAPTCHA y permite cinco intentos por IP cada
15 minutos. Solo confirma el envío cuando Resend devuelve un identificador.

Configura `CONTACT_TO=notificaciones@papercontrol.online` en `backend/.env` y en
Render (ese buzón es también el destino predeterminado). `MAIL_FROM` debe usar
un dominio verificado en Resend y `RESEND_API_KEY` permanece solo en el backend.
El correo del visitante se utiliza como `reply_to`, nunca como remitente ni
destinatario. La solicitud incluye una plantilla HTML con logo, datos, mensaje y botón de
respuesta, además de una versión de texto. El contenido del visitante se escapa
para no interpretar su HTML. No se guarda en la base de datos. Si falla el proveedor, se conserva
el formulario para reintentar y se devuelve HTTP 503.

El frontend envía estos cuatro campos a `${VITE_API_URL}/api/contacto`.
La clave `VITE_RECAPTCHA_SITE_KEY` sigue siendo necesaria para el login, pero
no para contacto. Verifica el envío y la recepción en el ambiente publicado antes de aceptar la funcionalidad.

## Prueba local de cache Redis en Proveedores

Redis es opcional y solo almacena el listado de proveedores; MySQL sigue siendo
la fuente de verdad. El navegador sigue haciendo peticiones al cambiar de modulo.
La autenticacion y los roles se comprueban antes de acceder a la cache.

Con el contenedor `papercontrol-redis` iniciado, configurar en `backend/.env`:

```dotenv
REDIS_URL=redis://127.0.0.1:6379
REDIS_CACHE_TTL_SECONDS=30
```

Reiniciar el backend con `npm run dev`. Al conectar aparece
`Redis conectado: cache de Proveedores (30s).` En Network, seleccionar la
consulta GET `/api/proveedores` y revisar `X-Cache` en las cabeceras de respuesta:

- `MISS`: MySQL respondio y se guardo el resultado en Redis.
- `HIT`: se reutilizo el resultado de Redis.
- `BYPASS`: Redis esta desactivado o no disponible; respondio MySQL.
- `REFRESH`: se solicito `refrescar=true`, se consulto MySQL y se actualizo Redis.

El boton Actualizar del frontend debe usar, por ejemplo,
`GET /api/proveedores?pagina=1&limite=50&buscar=papel&refrescar=true`.
Debe conservar pagina, limite y busqueda vigentes. El parametro admite solo
`true` o `false` (otros valores devuelven 400); omitido usa la cache normalmente.
Al refrescar se invalidan las otras variantes del listado y se almacena de nuevo
la pagina solicitada. No cambia el formato JSON ni los permisos o rate limits.
Con Redis caido tambien consulta MySQL y devuelve `X-Cache: BYPASS`.

Abrir Proveedores y regresar antes de 30 segundos debe producir HIT para la
misma pagina y busqueda. Crear, editar o eliminar invalida todas las variantes;
la siguiente consulta vuelve a ser MISS. La cache conserva la fila adicional
que el backend usa para calcular `hayMas` y no guarda respuestas de error.
Administrador y Dueno comparten actualmente este mismo listado autorizado;
si se agregan restricciones por usuario, debera incluirse su alcance en la clave.

Para comprobar el fallback, ejecutar `docker stop papercontrol-redis` y volver a
consultar: la API debe seguir usando MySQL. Reiniciar con
`docker start papercontrol-redis`; el backend intenta reconectar cada 5 segundos
y descarta las entradas antiguas al reconectar. No se ejecuta `FLUSHDB`.
Cambios directos en MySQL pueden tardar hasta el TTL en reflejarse mientras
Redis permanezca conectado. Una caida durante una escritura puede dejar datos
anteriores hasta el TTL en otra instancia; esta cache no promete consistencia fuerte.

Pruebas sin base de datos de negocio: `npm run test:redis` desde `backend`.
Utiliza claves aleatorias propias en Redis local y las elimina al terminar.
Para desactivar la cache, dejar `REDIS_URL` vacia y reiniciar. No requiere
migracion ni desplegar el frontend. En produccion debe usarse un Redis privado,
con credenciales/TLS (`rediss://`) y un espacio de claves separado por entorno.

Referencia del cliente: https://redis.io/docs/latest/develop/clients/nodejs/produsage/

## Cache y recarga de Categorias (backend)

Usa la misma configuracion `REDIS_URL` y `REDIS_CACHE_TTL_SECONDS` de
Proveedores, con claves independientes. No cambia el frontend ni el JSON.

- `GET /api/categorias`: devuelve `datos.categorias`, con `X-Cache` MISS/HIT/BYPASS.
- `GET /api/categorias?refrescar=true`: consulta MySQL y renueva la cache;
  devuelve REFRESH si Redis esta disponible, BYPASS si no lo esta.
- `refrescar=false` o sin parametro utiliza la cache; otro valor devuelve 400.
- Crear, editar o eliminar categorias invalida su listado. Crear o editar
  productos tambien lo invalida porque el modelo puede crear categorias.
- Se mantienen permisos: los tres roles leen; solo Administrador/Dueno escriben.
- Para el futuro boton del frontend: llamar a `/api/categorias?refrescar=true`
  usando el cliente autenticado habitual y reemplazar el listado al responder.

Prueba manual: reiniciar backend, consultar dos veces (MISS y HIT), refrescar
(REFRESH), consultar otra vez (HIT) y modificar una categoria (siguiente MISS).
Si Redis se apaga, las consultas siguen funcionando con MySQL y BYPASS.

## Cache y recarga de Productos/Inventario (backend)

`GET /api/productos` utiliza Redis despues de validar autenticacion y permisos.
Conserva el JSON, la paginacion y la fila adicional para calcular `hayMas`.
La clave distingue pagina, limite, buscar, categoriaId e incluirInactivos.

- TTL: 10 segundos por defecto (`REDIS_PRODUCTS_CACHE_TTL_SECONDS`).
- Lectura normal: `X-Cache: MISS`, `HIT` o `BYPASS`.
- Recarga: `/api/productos?pagina=1&limite=50&refrescar=true` consulta MySQL,
  invalida las otras variantes y actualiza la pagina solicitada (REFRESH).
- El futuro boton debe conservar los filtros vigentes. Si descarga varias
  paginas consecutivas, enviar refrescar=true solo en la primera.
- Crear, editar, cambiar estado, eliminar y registrar entradas/ajustes invalidan
  la cache. Tambien asociar/quitar proveedores, editar/eliminar proveedores o
  categorias y confirmar/anular ventas.
- El detalle, movimientos, alertas, comprobantes y validacion de stock/precios
  al vender siguen consultando MySQL. No se almacenan ventas ni caja en Redis.
- Un fallo de Redis deja la lectura en BYPASS; las escrituras siguen usando
  MySQL. Cambios por SQL directo o una invalidacion fallida en otra instancia
  pueden tardar hasta el TTL en reflejarse: no es una cache de consistencia fuerte.

Prueba local: reiniciar backend; consultar la misma pagina dos veces (MISS/HIT),
forzar refrescar=true (REFRESH), registrar una entrada o confirmar una venta y
volver a consultar (MISS con stock actualizado). Probar los filtros por separado.
No requiere modificar ni desplegar el frontend ni migrar la base de datos.

## Cache y recarga de Clientes (backend)

Usa REDIS_URL y REDIS_CACHE_TTL_SECONDS (30 segundos por defecto), con un
espacio de claves propio. No cambia el frontend ni requiere migraciones.

- GET `/api/clientes?pagina=1&limite=50`: MISS/HIT/BYPASS en X-Cache.
- Agregar `refrescar=true` consulta MySQL y renueva la cache (REFRESH si Redis
  responde; BYPASS si esta desactivado o caido). Otro valor distinto de true o
  false devuelve 400. Conservar buscar, pagina, limite e incluirInactivos.
- La clave distingue busqueda, pagina, limite y el alcance autorizado de
  inactivos. El vendedor nunca recibe la variante de inactivos del administrador.
- Crear, editar, activar/desactivar o eliminar clientes invalida todas las
  variantes. Confirmar o anular ventas tambien, por los totales de compra y
  la condicion de cliente frecuente. El detalle y las compras no se cachean.
- Probar MISS -> HIT -> refrescar=true -> REFRESH -> HIT, modificar un cliente
  y comprobar MISS con los nuevos datos. Se conservan permisos, API key y JWT.
- Para el futuro boton: usar el cliente HTTP autenticado existente. Si carga
  varias paginas consecutivas, enviar refrescar=true solo en la primera.
- Se mantienen las limitaciones de TTL ante SQL directo o fallos de invalidacion
  en otras instancias; MySQL sigue siendo la fuente de verdad.

## Cache y recarga de Usuarios (backend)

GET `/api/usuarios?pagina=1&limite=50` mantiene el JSON y agrega X-Cache:
MISS/HIT/BYPASS. Agregar `refrescar=true` consulta MySQL y renueva Redis
(REFRESH). Conservar pagina, limite y buscar; refrescar solo admite true/false.
Si el frontend descarga varias paginas, forzar solo la primera.

TTL por defecto: 10 segundos (`REDIS_USERS_CACHE_TTL_SECONDS`). Usa REDIS_URL
y un espacio de claves independiente. Los datos cacheados son los del presentador:
no incluyen contrasenas, hashes, tokens ni sesiones. Redis puede contener nombres
y correos, por lo que debe mantenerse privado, con credenciales/TLS segun entorno.

Crear, editar, activar/desactivar, eliminar y gestionar acceso Google invalidan
el listado; tambien el cambio/restablecimiento de contrasena, desbloqueo,
intentos fallidos, login correcto y solicitudes Google pendientes. Las operaciones
administrativas transaccionales invalidan despues del commit, nunca antes.

Solo Administrador/Dueno acceden al listado con los permisos existentes; ambos
reciben actualmente los mismos campos. El detalle, login, renovacion, autorizacion,
bloqueos efectivos y sesiones siguen consultando MySQL, nunca esta cache.
Redis caido produce BYPASS sin impedir las operaciones. Se mantienen las
limitaciones por TTL ante SQL directo o invalidacion fallida en otras instancias.

Prueba: reiniciar backend, consultar dos veces (MISS/HIT), solicitar refrescar=true
(REFRESH) y repetir (HIT). Editar un usuario o desbloquearlo debe dejar la siguiente
consulta en MISS con los nuevos datos. No requiere cambios de frontend ni migracion.

## Cache y recarga de Dashboard (backend)

GET `/api/dashboard/resumen` conserva `datos.resumen` como objeto con cuatro
indicadores: productos activos, ventas confirmadas, usuarios activos y stock bajo.
Usa REDIS_URL y REDIS_CACHE_TTL_SECONDS (30 segundos por defecto), con claves
propias. La autenticacion y permisos de Administrador/Dueno siguen en MySQL.

- Respuesta normal: X-Cache MISS/HIT/BYPASS.
- GET `/api/dashboard/resumen?refrescar=true`: consulta MySQL y renueva Redis
  (REFRESH). El futuro boton del frontend puede usar esta ruta con el cliente
  autenticado habitual. Otros valores diferentes de true/false devuelven 400.
- Invalidan el resumen: crear/editar/activar/desactivar/eliminar productos,
  entradas y ajustes de stock, confirmar/anular ventas, y crear/activar/desactivar
  o eliminar usuarios. Las transacciones administrativas invalidan tras el commit.
- No se cachean Caja, Reportes ni graficas que consulten endpoints de reportes.
- Si Redis no responde, MySQL entrega los indicadores con BYPASS. SQL directo
  o fallos de invalidacion entre instancias pueden reflejarse hasta el TTL.

Prueba: reiniciar backend, consultar dos veces (MISS/HIT), forzar refrescar=true
(REFRESH), modificar stock o registrar una venta y consultar de nuevo (MISS con
contadores actualizados). No requiere migraciones ni cambios de frontend.

## Autores y contribuciones

Proyecto desarrollado por **Jhon Ricardo Rios Cuervo** y **Kelly Lopera**, equipo ADSO del SENA. El historial Git registra aportes con los nombres `Jhon Ricardo Rios Cuervo`, `Jhon Rios` y la cuenta `kellylop613`. Las responsabilidades de cada entrega deben trazarse a sus commits y revisiones, sin deducirlas del número de commits.

Consulta `git log` y `git shortlog -sn HEAD` para revisar las contribuciones. No existe `CONTRIBUTING.md`; las reglas de colaboración siguen pendientes de formalización. La [política de seguridad](SECURITY.md) está en borrador, con `main` como rama con soporte y el canal privado de reporte pendiente. Los controles técnicos se describen en [seguridad del backend](backend/docs/seguridad/controles.md).

## Licencia y terceros

El repositorio no contiene un archivo `LICENSE`; la licencia del código propio y las condiciones de distribución están pendientes de definir. Este README no concede una licencia ni sustituye esa decisión.

Las dependencias conservan sus propias licencias. Los manifiestos y lockfiles permiten identificar los paquetes utilizados; antes de la entrega debe completarse la revisión de compatibilidad y las atribuciones de librerías, iconos, imágenes y demás recursos de terceros. No se declara completada esa revisión.
