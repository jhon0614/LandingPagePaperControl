-- PaperControl / MySQL 8 / 600 usuarios para pruebas de listados.
-- Ejecutar solo en desarrollo. Repetible: inserta faltantes y reactiva el lote.
USE paper_control;

-- Workbench: permitir el UPDATE del lote solo en esta conexion.
SET @pc600_sql_safe_updates_anterior = @@SESSION.SQL_SAFE_UPDATES;
SET SESSION SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- Requiere el rol VENDEDOR de database/seed.sql; no crea roles nuevos.
-- Son usuarios para listados, sin Google ni contrasena utilizable (hash '!').
SET @pcu600_rol = (SELECT id FROM roles WHERE nombre = 'VENDEDOR');

INSERT INTO usuarios (rol_id, nombres, apellidos, correo, hash_contrasena, esta_activo)
WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 600
)
SELECT
    @pcu600_rol, CONCAT('Usuario prueba 600 - ', LPAD(n, 4, '0')),
    'PCU600-20261110', CONCAT('pcu600-20261110-', LPAD(n, 4, '0'), '@example.invalid'),
    '!', TRUE
FROM numeros
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios t
    WHERE t.correo = CONCAT('pcu600-20261110-', LPAD(n, 4, '0'), '@example.invalid')
) AND @pcu600_rol IS NOT NULL;

UPDATE usuarios
SET esta_activo = TRUE, eliminado_en = NULL
WHERE apellidos = 'PCU600-20261110'
  AND correo REGEXP '^pcu600-20261110-0[0-9]{3}@example[.]invalid$';

COMMIT;

SET SESSION SQL_SAFE_UPDATES = @pc600_sql_safe_updates_anterior;

SELECT IF(@pcu600_rol IS NULL, 'Falta el rol VENDEDOR: aplicar database/seed.sql antes de cargar.', 'Rol VENDEDOR disponible.') AS comprobacion_rol;
SELECT COUNT(*) AS usuarios_prueba_activos
FROM usuarios
WHERE apellidos = 'PCU600-20261110'
  AND correo REGEXP '^pcu600-20261110-0[0-9]{3}@example[.]invalid$'
  AND esta_activo = TRUE AND eliminado_en IS NULL;

SELECT COUNT(*) AS total_usuarios_activos
FROM usuarios WHERE esta_activo = TRUE AND eliminado_en IS NULL;

-- Resultado esperado: 600 registros activos del lote.
-- Comparar GET /api/usuarios con GET /api/usuarios?pagina=1&limite=50.
-- Usar una cuenta autorizada para el modulo.
-- Al terminar ejecutar limpiar-600-usuarios.sql.

