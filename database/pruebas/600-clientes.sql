-- PaperControl / MySQL 8 / 600 clientes para pruebas de listados.
-- Ejecutar solo en desarrollo. Repetible: inserta faltantes y reactiva el lote.
USE paper_control;

-- Workbench: permitir el UPDATE del lote solo en esta conexion.
SET @pc600_sql_safe_updates_anterior = @@SESSION.SQL_SAFE_UPDATES;
SET SESSION SQL_SAFE_UPDATES = 0;

START TRANSACTION;


INSERT INTO clientes (tipo_documento, numero_documento, nombres, apellidos, correo, esta_activo)
WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 600
)
SELECT
    'CC', CONCAT('PCC600-20261110-', LPAD(n, 4, '0')),
    CONCAT('Cliente prueba 600 - ', LPAD(n, 4, '0')), 'PCC600-20261110',
    CONCAT('pcc600-20261110-', LPAD(n, 4, '0'), '@example.invalid'), TRUE
FROM numeros
WHERE NOT EXISTS (
    SELECT 1 FROM clientes t
    WHERE t.numero_documento = CONCAT('PCC600-20261110-', LPAD(n, 4, '0')) AND t.tipo_documento = 'CC'
);

UPDATE clientes
SET esta_activo = TRUE, eliminado_en = NULL
WHERE tipo_documento = 'CC' AND apellidos = 'PCC600-20261110'
  AND numero_documento REGEXP '^PCC600-20261110-0[0-9]{3}$';

COMMIT;

SET SESSION SQL_SAFE_UPDATES = @pc600_sql_safe_updates_anterior;

SELECT COUNT(*) AS clientes_prueba_activos
FROM clientes
WHERE tipo_documento = 'CC' AND apellidos = 'PCC600-20261110'
  AND numero_documento REGEXP '^PCC600-20261110-0[0-9]{3}$'
  AND esta_activo = TRUE AND eliminado_en IS NULL;

SELECT COUNT(*) AS total_clientes_activos
FROM clientes WHERE esta_activo = TRUE AND eliminado_en IS NULL;

-- Resultado esperado: 600 registros activos del lote.
-- Comparar GET /api/clientes con GET /api/clientes?pagina=1&limite=50.
-- Usar una cuenta autorizada para el modulo.
-- Al terminar ejecutar limpiar-600-clientes.sql.

