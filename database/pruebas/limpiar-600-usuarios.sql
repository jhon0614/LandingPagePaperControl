-- Ejecutar por separado al terminar 600-usuarios.sql.
-- Borrado logico limitado al lote; conserva registros y relaciones existentes.
USE paper_control;

-- Workbench: permitir el UPDATE del lote solo en esta conexion.
SET @pc600_sql_safe_updates_anterior = @@SESSION.SQL_SAFE_UPDATES;
SET SESSION SQL_SAFE_UPDATES = 0;

START TRANSACTION;

UPDATE usuarios
SET esta_activo = FALSE, eliminado_en = CURRENT_TIMESTAMP
WHERE apellidos = 'PCU600-20261110'
  AND correo REGEXP '^pcu600-20261110-0[0-9]{3}@example[.]invalid$'
  AND eliminado_en IS NULL;

SELECT ROW_COUNT() AS usuarios_prueba_ocultados;

COMMIT;

SET SESSION SQL_SAFE_UPDATES = @pc600_sql_safe_updates_anterior;

-- Volver a ejecutar 600-usuarios.sql permite repetir la prueba.
-- Los datos reales ajenos al lote permanecen intactos.

