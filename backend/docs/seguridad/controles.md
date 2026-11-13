# Controles y revisiones de seguridad del backend

## Estado documental — 2026-11-13

Esta guía describe controles observados en el código de referencia `981fdb7` y
conserva el antecedente de revisión de septiembre. No acredita la configuración
del despliegue, la ausencia de vulnerabilidades ni una ejecución completa de
pruebas sobre ese commit.

La [política de seguridad](../../../SECURITY.md) es un documento distinto: define
`main` como rama con soporte y mantiene pendientes el canal privado y los plazos
de atención. Esta guía no designa un correo de reporte ni sustituye esa política.

### Controles actuales visibles en el código

| Área | Comportamiento observado | Fuente |
| --- | --- | --- |
| Autenticación | JWT con algoritmo HS256 fijado; `sub` y `sid` enteros válidos; sesión vigente y usuario activo consultados en MySQL; rol actual tomado de la base. | `src/middleware/auth.middleware.js` |
| Contraseñas | bcrypt, límite de 72 bytes UTF-8 para nuevas contraseñas, recuperación con token temporal almacenado como hash y revocación transaccional de sesiones al cambiar/restablecer. | `src/services/password.service.js`, `src/models/password-reset.model.js`, `src/models/user.model.js` |
| Renovación | Token aleatorio almacenado como hash; rotación condicional y comprobación de vigencia y revocación. La existencia de estos controles no demuestra que todos los órdenes concurrentes estén cubiertos. | `src/services/auth.service.js`, `src/models/session.model.js` |
| Cookies | HttpOnly y ruta `/api/auth`; en producción, Secure y SameSite=None; fuera de producción, SameSite=Strict. Guardar y borrar emplean las mismas opciones. | `src/controllers/auth.controller.js` |
| Origen y HTTP | Origen exacto, validación adicional de Origin/Fetch Metadata, CORS con credenciales, cabeceras Retry-After y RateLimit expuestas, Helmet, API no-store y JSON máximo de 100 KB. | `src/app.js`, `src/middleware/security.js` |
| Límites | La configuración normal habilita contadores compartidos en MySQL. La construcción de la aplicación admite MemoryStore si se desactiva esa opción; no debe confundirse ese camino con la configuración normal. | `src/config/env.js`, `src/app.js`, `src/models/rate-limit.store.js` |
| Roles y datos | Las rutas protegidas comprueban identidad y rol; algunos flujos añaden propiedad del vendedor. Consultas parametrizadas, orden permitido y paginación limitada. | `src/routes/`, `src/middleware/roles.middleware.js`, `src/utils/query.js` |
| Ventas e inventario | Precios y existencias autoritativos en MySQL; cálculos en centavos, transacciones, bloqueos y movimientos de inventario. | `src/models/sales/`, `src/models/product.model.js` |
| Secretos | `JWT_ACCESS_SECRET` es obligatorio. La configuración actual no comprueba longitud mínima, entropía ni valores de ejemplo; no se inspeccionó el secreto operativo. | `src/config/env.js` |
| Transporte y proxy | HTTPS exigido para FRONTEND_ORIGIN en producción; URL de recuperación del mismo origen; confianza en proxy configurable; TLS MySQL opcional con validación de certificado cuando se activa. La configuración efectiva del proveedor no se ha observado. | `src/config/env.js`, `src/config/database.js` |

### Límites de solicitudes definidos

| Ámbito | Cuota | Ventana |
| --- | --- | --- |
| Toda `/api` | 300 por IP | 1 minuto |
| Login local y Google | 20 por IP, compartidos entre ambas rutas | 15 minutos |
| Renovación | 60 por IP | 15 minutos |
| Cambio de contraseña | 5 por IP | 15 minutos |
| Recuperación/restablecimiento públicos | 5 por IP, contador compartido | 15 minutos |
| Solicitud de recuperación | 3 por correo normalizado, además del límite por IP | 15 minutos |
| Contacto público | 5 por IP | 15 minutos |

Las cuotas de ruta se suman al límite global. Sus valores se definen en
`src/app.js`, `src/routes/auth.routes.js` y `src/routes/contact.routes.js`; no
representan una medición del comportamiento desplegado.

### Estado y límites de la revisión reciente

La revisión de fuente cubrió autenticación, roles, SQL, datos, ventas, inventario
y Docker. Hubo observaciones locales acotadas del ciclo de cierre/renovación de
sesión y una simulación de módulos del frontend. La continuación de pruebas se
detuvo por instrucción del usuario antes de cerrar toda la validación
independiente. No se ejecutó un navegador real ni se verificaron servicios
desplegados.

Esas observaciones no se presentan aquí como una certificación ni como hallazgos
confirmados finales. Sus evidencias y pendientes se conservan fuera del
repositorio de código, en la documentación de auditoría. No se consultó una base
actual de CVEs durante esa revisión; el resultado histórico de `npm audit` de
septiembre no debe reutilizarse como un resultado actual.

## Antecedente histórico — revisión de 2026-09-02

El contenido siguiente se conserva como antecedente de aquella revisión. Para el
comportamiento actual, prevalecen la tabla anterior y el código referenciado;
por ejemplo, MemoryStore, los atributos de cookies y la validación del secreto
descritos en este antecedente no deben interpretarse como el estado actual.

Se revisaron configuración Express, autenticación, cookies, rutas, permisos,
validación de entradas y consultas del sprint. No es una auditoría de penetración
ni una verificación del servidor desplegado.

## Límites de solicitudes

Antes solo existía limitación HTTP en recuperación de contraseña. Ahora:

| Ámbito | Límite por IP | Ventana |
| --- | --- | --- |
| Toda /api, incluidos errores y health | 300 | 1 minuto |
| POST /api/auth/login | 20 | 15 minutos |
| POST /api/auth/refresh | 60 | 15 minutos |
| PATCH /api/auth/contrasena | 5 | 15 minutos |
| Recuperación y restablecimiento públicos, contador compartido | 5 | 15 minutos |

Responden HTTP 429, código `DEMASIADAS_SOLICITUDES`, cabeceras RateLimit y
Retry-After. Los límites específicos se suman al límite global y se evalúan antes
de validar el cuerpo o consultar usuarios. El bloqueo por cuenta tras intentos
fallidos continúa en el servicio de autenticación y su configuración en MySQL.

Los contadores usan MemoryStore: son por proceso y se reinician al reiniciar
Node. Con varias instancias debe usarse un almacén compartido o un límite en el
proxy. Las IP compartidas (NAT) comparten cuota. Referencia:
[almacenes de express-rate-limit](https://express-rate-limit.mintlify.app/reference/stores).

## Controles revisados y ajustes

- **Proxy:** se elimina la confianza fija en un salto. Por defecto Node ignora
  cabeceras de IP reenviada. `TRUST_PROXY` acepta una lista de IP/CIDR de proxies
  controlados; no debe incluir redes abiertas. El proxy debe sanear cabeceras
  reenviadas. Esta configuración debe corresponder a la topología real.
- **Origen y cookies:** CORS mantiene un origen exacto. El middleware además
  rechaza Origin distinto con 403 antes de ejecutar operaciones; sin Origin,
  rechaza mutaciones identificadas por el navegador como cross-site. Clientes
  sin Origin/Fetch Metadata siguen usando autenticación normal. Las cookies
  ya tenían HttpOnly, SameSite=Strict, ruta /api/auth y Secure en producción.
  Logout ahora borra la cookie antes de enviar la respuesta 204.
- **JWT:** verificación explícita HS256, expiración y usuario activo consultado
  en base de datos; roles se toman de la base. El inicio exige secreto de al
  menos 32 bytes, distinto del ejemplo. No valida su entropía: debe generarse
  aleatoriamente. FRONTEND_ORIGIN exige HTTPS en producción.
- **Contraseñas:** bcrypt con costo 12; las rutas de creación/cambio/reset y el
  script create-admin rechazan nuevas contraseñas mayores de 72 bytes UTF-8
  para evitar truncamiento. Se conservan las reglas de complejidad de las rutas.
- **Sesiones:** refresh aleatorio almacenado como SHA-256, rotación condicional,
  expiración y revocación persistidas. Cambiar contraseña revoca refresh tokens.
- **Autorización:** categorías se consultan con los tres roles; escribir requiere
  ADMINISTRADOR/DUENO. Reporte de caja requiere esos mismos roles. Se conservan
  restricciones de ventas propias y cambio obligatorio de contraseña temporal.
- **Entradas:** Zod valida cuerpos. Categorías rechaza campos desconocidos;
  filtros repetidos/estructurados devuelven 400 antes de llegar a los servicios.
  El reporte valida fechas reales, rango máximo e ID de vendedor seguro.
- **SQL:** categorías y reporte utilizan parámetros; filtros SQL provienen de
  fragmentos fijos. La FK impide borrar categorías referenciadas. Stock usa
  transacciones y FOR UPDATE.
- **HTTP:** Helmet, X-Powered-By desactivado, JSON máximo 100 KB y no-store en
  respuestas API. JSON malformado devuelve 400; tamaño excesivo devuelve 413.
  Los fallos internos mantienen una respuesta genérica sin detalles de SQL.

La revisión de CORS distingue cabeceras de navegador de control de acceso:
[documentación oficial de Express CORS](https://expressjs.com/en/resources/middleware/cors/).
Los controles de transporte y cookies siguen las
[prácticas de seguridad de Express](https://expressjs.com/en/advanced/best-practice-security/).

## Evidencia y límites de la validación

- `npm audit --omit=dev --json`: cero vulnerabilidades conocidas en las
  dependencias auditadas a la fecha de esta revisión. No garantiza ausencia de
  vulnerabilidades desconocidas ni de errores propios de la aplicación.
- Pruebas HTTP con servidor Express local: CRUD y permisos, orígenes rechazados,
  JWT expirado/algoritmo no permitido, JSON inválido, tamaño, cookies de logout,
  parámetros repetidos y 429 de los límites global/login/refresh/recuperación.
- Pruebas de servicios y consultas con dobles de MySQL: cálculo diario, filtros,
  operaciones de inventario y errores de integridad.
- Configuración local comprobada sin mostrar secretos; no se modificó `.env`.

Actualización 2026-09-09: los pendientes de revocación, concurrencia, límites
compartidos y paginación se implementaron. Consultar
[correcciones y migración](../operacion/migraciones-y-compatibilidad.md) para el estado
actual, compatibilidad con frontend y pruebas con MySQL real. Las secciones
anteriores describen la revisión previa; el resultado de auditoría de paquetes
allí mencionado no representa una nueva auditoría de dependencias.
