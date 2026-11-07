-- Aplicar después de 2026-11-06-google-sub.sql.
USE paper_control;
ALTER TABLE usuarios
  ADD COLUMN google_correo VARCHAR(191) NULL AFTER google_sub,
  ADD COLUMN google_estado ENUM('NINGUNO','PENDIENTE','APROBADO','RECHAZADO') NOT NULL DEFAULT 'NINGUNO' AFTER google_correo;
UPDATE usuarios SET google_estado = 'APROBADO', google_correo = correo WHERE google_sub IS NOT NULL;
