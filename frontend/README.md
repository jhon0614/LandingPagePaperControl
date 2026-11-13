# Frontend de PaperControl

Interfaz web de PaperControl construida con React y Vite. Incluye la landing
pública y las pantallas de gestión de usuarios, clientes, inventario,
proveedores, ventas, caja y reportes, según el rol de la cuenta.

Consume la API REST del [backend](../backend/README.md). No se conecta
directamente a MySQL ni contiene las credenciales de base de datos o correo.
La instalación completa y el estado del producto están en el
[README principal](../README.md).

## Tecnologías

| Uso | Herramientas declaradas |
| --- | --- |
| Interfaz y navegación | React 19, React Router 7 con HashRouter |
| Desarrollo y compilación | Vite 8 y plugin de React con React Compiler |
| Identidad | Google OAuth y reCAPTCHA v2 mediante sus componentes React |
| Gráficas | Recharts |
| Mensajes e iconos | SweetAlert2, React Icons y Font Awesome |
| Exportación del reporte de caja | ExcelJS, jsPDF y jsPDF-AutoTable |
| Revisión estática | ESLint con reglas de React Hooks y React Refresh |

Los rangos exactos están en [package.json](package.json); las versiones resueltas
están en [package-lock.json](package-lock.json). La versión `0.0.0` del manifiesto
no representa una versión unificada de entrega de PaperControl.

## Preparación local

Usa Node.js y npm; el entorno de referencia del proyecto es Node.js 24.12.
Para usar las funciones de gestión necesitas el backend configurado y en
ejecución, junto con su base de datos. La landing puede mostrarse sin restaurar
una sesión, pero el envío del formulario de contacto requiere la API.

Desde la raíz del repositorio:

```sh
cd frontend
npm ci
```

### Configuración

Crea manualmente `frontend/.env` con valores del entorno local:

```dotenv
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=tu_id.apps.googleusercontent.com
VITE_RECAPTCHA_SITE_KEY=tu_clave_del_sitio
```

| Variable | Propósito |
| --- | --- |
| `VITE_API_URL` | Origen de la API, sin `/api` ni barra final; los servicios añaden las rutas. |
| `VITE_GOOGLE_CLIENT_ID` | ID público del cliente OAuth; debe corresponder a `GOOGLE_CLIENT_ID` del backend. |
| `VITE_RECAPTCHA_SITE_KEY` | Clave pública del sitio de reCAPTCHA v2 utilizada por el login. |

Estas variables se incorporan a los archivos del frontend y son públicas. No
coloques contraseñas, secretos JWT, claves de Resend ni claves privadas de Google
en variables `VITE_*`. No hace falta copiar los secretos del backend a esta carpeta.
Los archivos `.env` del frontend están excluidos de Git; no existe un
`.env.example` versionado en esta carpeta.

Vite lee la configuración al arrancar y al compilar. Después de cambiar `.env`,
reinicia el servidor de desarrollo; para una entrega estática, genera de nuevo
la compilación.

### Iniciar la interfaz

Dentro de `frontend/`:

```sh
npm run dev
```

La URL local de referencia es [http://localhost:5173](http://localhost:5173).
Usa la dirección que muestre Vite si ese puerto está ocupado. El origen exacto
debe coincidir con `FRONTEND_ORIGIN` del backend y con el origen de
`FRONTEND_RESET_PASSWORD_URL`; actualiza la configuración del backend si cambia
el puerto. Google OAuth y reCAPTCHA también deben estar configurados para los
dominios autorizados del entorno.

## Comandos disponibles

Ejecutar dentro de `frontend/`:

| Comando | Función |
| --- | --- |
| `npm run dev` | Inicia Vite en desarrollo. |
| `npm run build` | Genera los archivos estáticos en `dist/`. |
| `npm run preview` | Sirve una vista previa local de una compilación ya generada. |
| `npm run lint` | Revisa JavaScript/JSX con ESLint, sin solicitar correcciones automáticas. |
| `npm run deploy` | Ejecuta `predeploy` para compilar y publica `dist/` mediante gh-pages. |

`preview` no inicia la API ni MySQL. El script `deploy` publica contenido: no es
un comando de comprobación local ni configura por sí solo los servicios externos.
El manifiesto del frontend no define actualmente un script `test`.

## Organización del código

```text
frontend/
  public/        Recursos públicos copiados a la entrega
  src/
    assets/      Imágenes y recursos importados por la interfaz
    components/  Layout, navegación, formularios, gráficas y componentes compartidos
    hooks/       Tema y paginación
    pages/       Pantallas públicas y módulos de gestión
    routes/      Protección de pantallas por sesión y rol
    services/    Cliente HTTP y servicios por módulo
    styles/      Estilos de pantallas y componentes
    utils/       Fechas, moneda, contraseña, tema y exportaciones
    main.jsx     Entrada de React, tema inicial y HashRouter
    App.jsx      Composición de pantallas y restauración de sesión
  index.html     Documento de entrada
  vite.config.js Configuración de Vite, base y observación de archivos
  Dockerfile     Etapas de desarrollo, compilación y entrega estática
```

Los componentes de gráficas están agrupados en `src/components/graficas/`; el
comprobante de venta tiene su componente en `src/components/ventas/`.

## Navegación y permisos de pantalla

[main.jsx](src/main.jsx) usa `HashRouter`: las rutas se representan después de
`#`, por ejemplo `http://localhost:5173/#/login`. Las rutas siguientes están
definidas en [App.jsx](src/App.jsx).

| Ruta dentro del hash | Acceso de la interfaz |
| --- | --- |
| `/` | Landing pública. |
| `/login` | Inicio de sesión local o con Google. |
| `/olvide-contrasena`, `/restablecer-contrasena` | Recuperación y restablecimiento. |
| `/acceso-denegado` | Pantalla de acceso denegado. |
| `/admin` | `ADMINISTRADOR`. |
| `/vendedor` | `VENDEDOR`. |
| `/dueno` | `DUENO`. |
| `/caja`, `/clientes`, `/ventas`, `/cambiar-contrasena` | `ADMINISTRADOR`, `VENDEDOR` y `DUENO`. |
| `/usuarios`, `/inventario`, `/proveedores`, `/reportes` | `ADMINISTRADOR` y `DUENO`. |

[PrivateRoute.jsx](src/routes/PrivateRoute.jsx) comprueba token en memoria,
metadata de usuario y roles permitidos antes de mostrar una pantalla. Es una
restricción de navegación: la autorización de cada operación debe aplicarse
también en el backend. Tener acceso a una pantalla no concede todas sus acciones
a todos los roles.

## Comunicación con la API y sesión

[api.js](src/services/api.js) centraliza las solicitudes HTTP, el Bearer token,
las cookies, los errores y la renovación. Los archivos `*.service.js` agrupan
las operaciones de cada módulo y mantienen esas llamadas fuera de los componentes.

- El token de acceso permanece en memoria del módulo; no se guarda en localStorage.
- La cookie de renovación es HttpOnly y la administra el navegador; el frontend
  no debe leer su contenido.
- localStorage contiene metadata de usuario para la presentación. Esa metadata
  no constituye una autorización del servidor.
- Al entrar al sistema, `App.jsx` intenta restaurar la sesión. La landing `/`
  se muestra sin esperar esa comprobación.
- Los fallos temporales de restauración, como red, 429 o 5xx, muestran una opción
  de reintento; una sesión inválida permite continuar hacia el login.
- El cierre manual y el aviso de inactividad usan el servicio de logout. El aviso
  de inactividad es un comportamiento del cliente, no un reloj independiente
  de expiración en el backend.

Los cuerpos, respuestas y reglas de Google, recuperación y contraseña temporal
están en la [guía de autenticación](../backend/docs/api/autenticacion.md).
La aprobación de acceso Google está en [usuarios y roles](../backend/docs/api/usuarios.md).
Estos flujos no crean automáticamente una cuenta local desde Google.

## Reportes, comprobantes y contacto

- Las gráficas consumen datos de la API; no calculan permisos ni sustituyen las
  validaciones de negocio del servidor.
- [exportarReporteCaja.js](src/utils/exportarReporteCaja.js) genera Excel y PDF
  en el navegador a partir del reporte de caja consultado.
- Los comprobantes usan el contrato de [ventas](../backend/docs/api/ventas.md),
  con datos y representaciones JSON/HTML del backend. La exportación de caja a
  PDF no significa que el endpoint de comprobantes genere PDF.
- El contacto de la landing envía datos a `POST /api/contacto`; el proveedor de
  correo y sus secretos se configuran exclusivamente en el backend. La respuesta
  de aceptación no demuestra que el destinatario haya recibido o leído el mensaje.

## Compilación y despliegue

Para una entrega estática se usan los archivos de `dist/`; no se publica
`node_modules/`, el código del backend ni sus variables privadas.
[vite.config.js](vite.config.js) tiene `base: "/"`. Si la aplicación se sirve
desde un subdirectorio, debe configurarse esa base para la ubicación elegida
antes de compilar; `HashRouter` no corrige por sí solo las rutas de los recursos.

En Docker, la etapa de desarrollo usa Vite; la entrega final copia únicamente
`dist/` a nginx. Los `VITE_*` de producción se resuelven durante la compilación:
cambiar variables del contenedor nginx después no reescribe el JavaScript.

El [Compose de desarrollo](../compose.dev.yaml) monta fuentes de solo lectura,
habilita polling con `DOCKER_WATCH_POLLING=true` y conserva la base del proyecto.
El [Compose local](../compose.yaml) publica el frontend en
`http://localhost:8080`. Ese Compose es un entorno persistente de desarrollo,
no un laboratorio descartable. La preparación completa está en el
[README principal](../README.md#docker-con-recarga-automática).

## Alcance de esta guía

La guía se redactó a partir de los archivos del frontend y sus contratos
documentados. No se ejecutaron instalación, build, lint, pruebas, despliegue ni
comprobaciones de navegador para elaborarla. La existencia de un script no
acredita que se haya ejecutado ni aprobado.

Documentación relacionada:

- [Índice de contratos del backend](../backend/docs/README.md).
- [Convenciones de la API y listados](../backend/docs/api/convenciones.md).
- [Política de seguridad](../SECURITY.md), en borrador mientras se define el canal privado.
