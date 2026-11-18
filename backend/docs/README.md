# Documentación del backend

Las guías se agrupan por función. Los contratos HTTP están en `api/`, los
controles técnicos en `seguridad/` y las instrucciones de actualización en
`operacion/`. La preparación local permanece en el [README del backend](../README.md).

Esta reorganización es documental: no cambia la API ni acredita una nueva
ejecución de pruebas, una auditoría completa o el estado del despliegue. Las
referencias históricas conservan su fecha y sus límites.

## API e integración

| Guía | Contenido |
| --- | --- |
| [Convenciones](api/convenciones.md) | Respuestas comunes, paginación, búsquedas y filtros de listados. |
| [Autenticación](api/autenticacion.md) | Login local, sesión, contraseña, recuperación y acceso con Google. |
| [Usuarios y roles](api/usuarios.md) | Administración de cuentas, desbloqueo, restablecimiento y aprobación de Google. |
| [Ventas](api/ventas.md) | Pagos, registro y anulación, descuentos, historial de compras y comprobantes. |
| [Inventario y caja](api/inventario-caja.md) | Categorías y reporte diario de caja; alcance y trazabilidad de las historias documentadas. |
| [Dashboard](api/dashboard.md) | Resumen administrativo y ejemplo de consumo desde el frontend. |

Estas guías reúnen los contratos que estaban documentados; no constituyen un
catálogo completo de todas las rutas existentes. Para rutas todavía no descritas,
consulta `backend/src/routes/` y sus servicios sin inferir un contrato nuevo a
partir del nombre de un módulo.

## Seguridad

- [Controles y revisiones](seguridad/controles.md): controles observados en el
  código, alcance de la revisión y antecedente histórico de septiembre.
- [Política de seguridad del proyecto](../../SECURITY.md): rama con soporte y
  procedimiento de reporte. Está en borrador, con canal privado y plazos pendientes.

La política de reporte, los controles de implementación y las evidencias de
auditoría tienen propósitos distintos; no se sustituyen entre sí.

## Operación y compatibilidad

[Migraciones y compatibilidad](operacion/migraciones-y-compatibilidad.md) conserva
las instrucciones y el registro de cambios de la actualización del 09/09/2026.
Antes de una actualización debe identificarse qué esquema y migraciones tiene
la base; el registro histórico no prueba que se hayan aplicado al despliegue.

## Dónde quedó cada documento

| Archivo anterior | Ubicación por función |
| --- | --- |
| `autenticacion-api.md` | [Autenticación](api/autenticacion.md) |
| `google-auth.md` | [Autenticación](api/autenticacion.md) para login/vinculación; [Usuarios](api/usuarios.md) para aprobación administrativa. |
| `usuarios-api.md` | [Usuarios y roles](api/usuarios.md) |
| `ventas-api.md` | [Ventas](api/ventas.md) |
| `scrum-15-26-22.md` | [Ventas](api/ventas.md), con trazabilidad de SCRUM-15, SCRUM-26 y SCRUM-22. |
| `sprint-inventario-caja.md` | [Inventario y caja](api/inventario-caja.md), con criterios e historia de validación. |
| `dashboard-api.md` | [Dashboard](api/dashboard.md) |
| `listados.md` | [Convenciones](api/convenciones.md) |
| `seguridad-backend.md` | [Controles y revisiones](seguridad/controles.md) |
| `correcciones-backend-2026-09-09.md` | [Migraciones y compatibilidad](operacion/migraciones-y-compatibilidad.md) |

Los informes de auditoría conservados fuera del repositorio pueden citar rutas
anteriores junto con su commit de referencia. Esa evidencia histórica no se
reescribe por esta reorganización; la tabla permite localizar la guía actual.

## Mantenimiento

- Actualiza el contrato en su guía funcional cuando cambie una ruta o respuesta.
- Documenta cambios de esquema y compatibilidad en operación y enlaza la guía afectada.
- Conserva fechas, condiciones y limitaciones al citar resultados históricos.
- Registra historias de backlog dentro de su función, sin duplicar el contrato
  completo en archivos separados por sprint.
