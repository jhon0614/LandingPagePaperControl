-- PaperControl / MySQL 8 / prueba del limite de 500 productos.
-- Ejecutar en la base de desarrollo. No ejecuta ventas ni modifica stock real.
-- Repetible: crea hasta 600 productos de prueba y reactiva los del mismo lote.
USE paper_control;

START TRANSACTION;

INSERT INTO categorias (nombre, descripcion, esta_activo)
SELECT 'PRUEBA PC500 20260915', 'Lote tecnico PC500-20260915', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM categorias WHERE nombre = 'PRUEBA PC500 20260915'
);

SET @pc500_categoria = (
    SELECT id FROM categorias WHERE nombre = 'PRUEBA PC500 20260915'
);

INSERT INTO productos (
    categoria_id, sku, nombre, descripcion, precio_compra, precio_venta,
    stock_actual, stock_minimo, alerta_stock_habilitada, esta_activo
)
WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 600
)
SELECT
    @pc500_categoria,
    CONCAT('PC500-20260915-', LPAD(n, 4, '0')),
    CONCAT('Producto prueba 500 - ', LPAD(n, 4, '0')),
    'Lote tecnico PC500-20260915',
    1000.00, 1500.00,
    0, 0, FALSE, TRUE
FROM numeros
WHERE NOT EXISTS (
    SELECT 1 FROM productos p
    WHERE p.sku = CONCAT('PC500-20260915-', LPAD(n, 4, '0'))
);

-- Permite repetir la prueba despues de ejecutar la limpieza.
UPDATE productos
SET esta_activo = TRUE, eliminado_en = NULL
WHERE categoria_id = @pc500_categoria
  AND descripcion = 'Lote tecnico PC500-20260915'
  AND sku REGEXP '^PC500-20260915-[0-9]{4}$';

COMMIT;

SELECT COUNT(*) AS productos_prueba_activos
FROM productos
WHERE categoria_id = @pc500_categoria
  AND descripcion = 'Lote tecnico PC500-20260915'
  AND sku REGEXP '^PC500-20260915-[0-9]{4}$'
  AND esta_activo = TRUE AND eliminado_en IS NULL;

SELECT COUNT(*) AS total_productos_activos
FROM productos WHERE esta_activo = TRUE AND eliminado_en IS NULL;

-- Resultado esperado: 600 productos de prueba activos.
-- Sin filtro de categoria, abrir Inventario o Ventas y revisar Network (F12).
-- GET /api/productos sin pagina/limite debe responder HTTP 422:
-- PAGINACION_REQUERIDA
-- El listado supera 500 registros. Consulta usando pagina y limite.
-- Comparacion: con la misma autenticacion,
-- GET /api/productos?pagina=1&limite=50 debe responder HTTP 200.
-- Los productos tienen stock cero porque esta prueba solo verifica listados.
