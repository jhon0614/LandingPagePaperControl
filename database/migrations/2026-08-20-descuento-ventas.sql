USE paper_control;

ALTER TABLE ventas
  ADD COLUMN tipo_descuento ENUM('PORCENTAJE', 'VALOR_FIJO') NULL
    AFTER subtotal,
  ADD COLUMN valor_descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00
    AFTER tipo_descuento,
  ADD CONSTRAINT verificar_ventas_valor_descuento
    CHECK (valor_descuento >= 0),
  ADD CONSTRAINT verificar_ventas_tipo_descuento
    CHECK (
      (tipo_descuento IS NULL AND valor_descuento = 0)
      OR tipo_descuento IS NOT NULL
    );
