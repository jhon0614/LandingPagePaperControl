-- Ejecutar una sola vez, antes de iniciar la versión nueva del backend.
-- Usa la base seleccionada por el operador; no cambia fechas comerciales históricas.

-- Estado compartido de los límites HTTP (todas las fechas son UTC).
CREATE TABLE limites_solicitudes (
  clave CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  total BIGINT UNSIGNED NOT NULL,
  reinicia_en DATETIME(3) NOT NULL,
  INDEX indice_limites_expiracion (reinicia_en)
) ENGINE = InnoDB;

-- No guarda tokens de recuperación ni contraseñas. El consumidor genera el enlace.
CREATE TABLE cola_recuperacion (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(191) NOT NULL,
  intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  reserva CHAR(36) NULL,
  disponible_en DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  INDEX indice_cola_disponible (disponible_en, id)
) ENGINE = InnoDB;

CREATE TABLE solicitudes_venta (
  usuario_id BIGINT UNSIGNED NOT NULL,
  clave VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  hash_solicitud CHAR(64) NOT NULL,
  venta_id BIGINT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (usuario_id, clave),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (venta_id) REFERENCES ventas(id)
) ENGINE = InnoDB;

-- Las fechas de expiración anteriores mezclaban UTC y hora local.
-- Se requiere un nuevo login/enlace después del despliegue.
UPDATE sesiones_usuario SET revocado_en = UTC_TIMESTAMP() WHERE revocado_en IS NULL;
UPDATE tokens_recuperacion_contrasena SET usado_en = UTC_TIMESTAMP() WHERE usado_en IS NULL;
