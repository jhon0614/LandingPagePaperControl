-- PaperControl / MySQL 8 / 600 proveedores para pruebas de listados.
-- Ejecutar solo en desarrollo. Repetible: inserta faltantes y reactiva el lote.
USE paper_control;

START TRANSACTION;


INSERT INTO proveedores (numero_documento, nombre, nombre_contacto, correo, esta_activo)
WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 600
)
SELECT
    CONCAT('PCP600-20261110-', LPAD(n, 4, '0')),
    CONCAT('Proveedor prueba 600 - ', LPAD(n, 4, '0')),
    'Lote PCP600-20261110', CONCAT('pcp600-20261110-', LPAD(n, 4, '0'), '@example.invalid'), TRUE
FROM numeros
WHERE NOT EXISTS (
    SELECT 1 FROM proveedores t
    WHERE t.numero_documento = CONCAT('PCP600-20261110-', LPAD(n, 4, '0'))
);

UPDATE proveedores
SET esta_activo = TRUE, eliminado_en = NULL
WHERE nombre_contacto = 'Lote PCP600-20261110'
  AND numero_documento REGEXP '^PCP600-20261110-0[0-9]{3}$';

COMMIT;

SELECT COUNT(*) AS proveedores_prueba_activos
FROM proveedores
WHERE nombre_contacto = 'Lote PCP600-20261110'
  AND numero_documento REGEXP '^PCP600-20261110-0[0-9]{3}$'
  AND esta_activo = TRUE AND eliminado_en IS NULL;

SELECT COUNT(*) AS total_proveedores_activos
FROM proveedores WHERE esta_activo = TRUE AND eliminado_en IS NULL;

-- Resultado esperado: 600 registros activos del lote.
-- Comparar GET /api/proveedores con GET /api/proveedores?pagina=1&limite=50.
-- Usar una cuenta autorizada para el modulo.
-- Al terminar ejecutar limpiar-600-proveedores.sql.

