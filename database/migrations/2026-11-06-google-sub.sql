-- Agrega la vinculación con Google a instalaciones anteriores.
-- Ejecutar una sola vez y únicamente si usuarios no tiene google_sub.
-- El esquema nuevo ya incluye esta columna.

USE paper_control;

ALTER TABLE usuarios
  ADD COLUMN google_sub VARCHAR(255)
    CHARACTER SET ascii
    COLLATE ascii_bin
    NULL UNIQUE
    AFTER apellidos;