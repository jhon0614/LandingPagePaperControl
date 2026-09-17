-- Ejecutar por separado al terminar la prueba de 600-productos.sql.
-- Oculta unicamente el lote de prueba con borrado logico.
-- No elimina registros fisicamente ni afecta productos ajenos al lote.
USE paper_control;

START TRANSACTION;

UPDATE productos p
JOIN categorias c ON c.id = p.categoria_id
SET p.esta_activo = FALSE, p.eliminado_en = CURRENT_TIMESTAMP
WHERE c.nombre = 'PRUEBA PC500 20260915'
  AND p.descripcion = 'Lote tecnico PC500-20260915'
  AND p.sku REGEXP '^PC500-20260915-[0-9]{4}$'
  AND p.eliminado_en IS NULL;

SELECT ROW_COUNT() AS productos_prueba_ocultados;

COMMIT;

-- La categoria de prueba se conserva para poder repetir la prueba.
-- Si ya habia mas de 500 productos reales, la API seguira exigiendo paginacion.
