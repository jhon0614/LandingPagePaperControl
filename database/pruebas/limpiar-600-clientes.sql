-- Ejecutar por separado al terminar 600-clientes.sql.
-- Borrado logico limitado al lote; conserva registros y relaciones existentes.
USE paper_control;

-- Workbench: permitir el UPDATE del lote solo en esta conexion.
SET @pc600_sql_safe_updates_anterior = @@SESSION.SQL_SAFE_UPDATES;
SET SESSION SQL_SAFE_UPDATES = 0;

START TRANSACTION;

UPDATE clientes
SET esta_activo = FALSE, eliminado_en = CURRENT_TIMESTAMP
WHERE tipo_documento = 'CC' AND apellidos = 'PCC600-20261110'
  AND numero_documento REGEXP '^PCC600-20261110-0[0-9]{3}$'
  AND eliminado_en IS NULL;

SELECT ROW_COUNT() AS clientes_prueba_ocultados;

COMMIT;

SET SESSION SQL_SAFE_UPDATES = @pc600_sql_safe_updates_anterior;

-- Volver a ejecutar 600-clientes.sql permite repetir la prueba.
-- Los datos reales ajenos al lote permanecen intactos.

