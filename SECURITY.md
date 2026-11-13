# Política de seguridad de PaperControl

**Estado: borrador.** Rama con soporte: `main`. El canal privado de reporte y
los plazos de atención están pendientes de definir. Esta política no debe
presentarse como un procedimiento de reporte operativo hasta publicar ese canal.

Última actualización documental: **13/11/2026**.

## Alcance del soporte

| Referencia | Tratamiento de los reportes |
| --- | --- |
| `main` | Rama con soporte para la recepción y evaluación de reportes de seguridad. Indicar siempre el commit afectado. |
| Ramas distintas de `main`, commits anteriores y versiones publicadas | No hay una política de mantenimiento o correcciones retroactivas definida. |

Los números de los manifiestos de frontend y backend no constituyen por sí solos
una versión unificada ni una garantía de soporte. La referencia de un reporte
debe identificar el commit y, si corresponde, el entorno afectado. Una revisión de
seguridad del código no acredita qué commit está desplegado.

## Reportar una posible vulnerabilidad

**Canal privado: pendiente de definir por los responsables del proyecto.**

El formulario de contacto y los correos mencionados en otras partes del proyecto
no están designados como canales de seguridad por este documento. Tampoco se ha
verificado que el repositorio tenga habilitados avisos privados de seguridad.

Mientras no exista un canal privado publicado, no incluyas detalles sensibles de
una vulnerabilidad en issues, pull requests, comentarios públicos o formularios
generales. No envíes contraseñas, tokens, archivos `.env` ni datos personales o de
negocio reales.

Cuando se habilite el canal, el reporte debera incluir:

- Componente afectado y commit de referencia en `main`.
- Descripción de la conducta esperada y del resultado observado.
- Rol o acceso previo necesario y condiciones que permiten reproducirlo.
- Pasos mínimos en un entorno propio y aislado, con datos ficticios.
- Impacto observado, separado de las consecuencias todavía hipotéticas.
- Evidencia mínima, sin credenciales, información personal ni datos reales.

## Límites de las comprobaciones

Este documento no concede autorización para probar servicios desplegados,
infraestructura de terceros o cuentas y datos ajenos. Las comprobaciones locales
deben usar recursos descartables y datos ficticios; las llamadas a proveedores se
deben simular cuando no exista una autorización específica para usarlos.

Evita pruebas de disponibilidad, envíos masivos, cambios destructivos o exposición
de información. Si una comprobación requiere acceso adicional, debe acordarse su
alcance con los responsables antes de realizarla.

## Gestión de reportes

El procedimiento propuesto es recibir el aviso en privado, revisar su alcance y
evidencia, evaluar el impacto y coordinar una corrección y su validación. La
comunicación pública debe acordarse después de esa evaluación, sin exponer
información sensible ni detalles pendientes de comprobar.

Quedan pendientes de aprobación:

- Canal privado operativo y persona o equipo responsable de atenderlo.
- Plazos de acuse de recibo, evaluación y comunicación de avances.
- Criterios y calendario de publicación de correcciones y avisos.
- Política de mantenimiento para versiones o ramas distintas de `main`.

No se establecen plazos de respuesta mientras esos puntos sigan pendientes.

## Documentación relacionada

- [Controles técnicos y revisiones del backend](backend/docs/seguridad-backend.md).
- [Correcciones del backend y compatibilidad de migraciones](backend/docs/correcciones-backend-2026-09-09.md).
- [Estado y operación del proyecto](README.md).

Los controles técnicos y las evidencias de auditoría tienen un propósito distinto
de esta política. Su existencia no garantiza ausencia de vulnerabilidades ni
sustituye un canal de reporte privado operativo.
