# Revisión de seguridad del backend — 2026-09-02

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

Los access tokens ya emitidos pueden seguir válidos hasta expirar aunque se
revoque el refresh al cerrar sesión o cambiar contraseña; no hay lista de
revocación por access token. La baja de un usuario se comprueba en cada petición.
La inactividad documentada depende del cliente; no se incorporó un reloj de
inactividad persistido en servidor. Las consultas antiguas de listados no tienen
paginación general. Estos puntos quedan registrados para endurecimiento futuro.

Pendiente validar despliegue real: HTTPS, configuración del proxy, almacén
compartido si hay réplicas, permisos mínimos MySQL y pruebas de concurrencia con
una base exclusiva de pruebas. No se cambió infraestructura ni frontend.
