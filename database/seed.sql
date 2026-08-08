-- PaperControl - Datos iniciales no sensibles
USE paper_control;

-- Crea los dos perfiles definidos en los requisitos del proyecto.
INSERT INTO roles (nombre, descripcion)
VALUES
  ('ADMINISTRADOR', 'Gestiona usuarios, inventario, configuración y reportes.'),
  ('VENDEDOR', 'Registra ventas, clientes, caja y consulta productos.'),
  ('DUENO', 'Consulta dashboard, inventario, ventas y reportes.')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Métodos de pago disponibles al iniciar el sistema por primera vez.
INSERT INTO metodos_pago (codigo, nombre, esta_activo)
VALUES
  ('EFECTIVO', 'Efectivo', TRUE),
  ('TARJETA', 'Tarjeta', TRUE),
  ('TRANSFERENCIA', 'Transferencia', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Valores iniciales para el bloqueo y la duración de las sesiones.
INSERT INTO configuraciones_sistema (clave_configuracion, valor_configuracion, descripcion)
VALUES
  ('autenticacion.maximo_intentos_fallidos', '5', 'Intentos fallidos antes del bloqueo temporal.'),
  ('autenticacion.minutos_bloqueo', '15', 'Duración del bloqueo temporal en minutos.'),
  ('autenticacion.minutos_token_acceso', '15', 'Duración del token de acceso en minutos.'),
  ('autenticacion.dias_token_renovacion', '7', 'Duración máxima de una sesión renovable en días.'),
  ('autenticacion.minutos_inactividad', '30', 'Tiempo de inactividad antes del cierre de sesión.')
ON DUPLICATE KEY UPDATE
  valor_configuracion = VALUES(valor_configuracion),
  descripcion = VALUES(descripcion);

-- El primer administrador debe crearse desde un script del backend que genere
-- hash_contrasena con Argon2id o bcrypt. Nunca guardar contraseñas en texto plano.
