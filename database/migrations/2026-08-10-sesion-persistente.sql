-- Ejecutar una sola vez únicamente si paper_control ya existía antes de
-- incorporar la opción "Recordarme".
USE paper_control;

ALTER TABLE sesiones_usuario
  ADD COLUMN es_persistente BOOLEAN NOT NULL DEFAULT FALSE
  AFTER expira_en;
