-- PaperControl - Esquema inicial para MySQL 8.0+
-- Ejecutar con un usuario que tenga permisos para crear bases de datos.

CREATE DATABASE paper_control
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE paper_control;

-- Roles disponibles para controlar a qué módulos puede entrar cada usuario.
CREATE TABLE roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,
  descripcion VARCHAR(150) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unico_roles_nombre UNIQUE (nombre)
) ENGINE = InnoDB;

-- Personas autorizadas para ingresar a PaperControl.
CREATE TABLE usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id TINYINT UNSIGNED NOT NULL,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  correo VARCHAR(191) NOT NULL,
  hash_contrasena VARCHAR(255) NOT NULL,
  debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  intentos_acceso_fallidos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  ultimo_acceso_en DATETIME NULL,
  contrasena_cambiada_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_en DATETIME NULL,
  CONSTRAINT unico_usuarios_correo UNIQUE (correo),
  CONSTRAINT foranea_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id),
  CONSTRAINT verificar_usuarios_intentos_fallidos CHECK (intentos_acceso_fallidos >= 0)
) ENGINE = InnoDB;

CREATE INDEX indice_usuarios_rol_activo ON usuarios (rol_id, esta_activo);
CREATE INDEX indice_usuarios_bloqueado_hasta ON usuarios (bloqueado_hasta);

-- Historial de accesos correctos y fallidos para seguimiento de seguridad.
CREATE TABLE intentos_acceso (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NULL,
  correo_intentado VARCHAR(191) NOT NULL,
  fue_exitoso BOOLEAN NOT NULL,
  motivo_fallo VARCHAR(40) NULL,
  direccion_ip VARCHAR(45) NULL,
  agente_usuario VARCHAR(500) NULL,
  intentado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT foranea_intentos_acceso_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX indice_intentos_acceso_usuario_fecha ON intentos_acceso (usuario_id, intentado_en);
CREATE INDEX indice_intentos_acceso_correo_fecha ON intentos_acceso (correo_intentado, intentado_en);

-- Sesiones abiertas por los usuarios. Se guarda la huella del token, no el token real.
CREATE TABLE sesiones_usuario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  hash_token_renovacion CHAR(64) NOT NULL,
  direccion_ip VARCHAR(45) NULL,
  agente_usuario VARCHAR(500) NULL,
  expira_en DATETIME NOT NULL,
  revocado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unico_sesiones_usuario_token UNIQUE (hash_token_renovacion),
  CONSTRAINT foranea_sesiones_usuario_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX indice_sesiones_usuario_usuario_activo ON sesiones_usuario (usuario_id, revocado_en, expira_en);

-- Solicitudes temporales para recuperar una contraseña olvidada.
CREATE TABLE tokens_recuperacion_contrasena (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  hash_token CHAR(64) NOT NULL,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unico_recuperacion_contrasena_token UNIQUE (hash_token),
  CONSTRAINT foranea_recuperacion_contrasena_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX indice_recuperacion_contrasena_usuario_activo
  ON tokens_recuperacion_contrasena (usuario_id, usado_en, expira_en);

-- Valores que el administrador podrá configurar sin cambiar el código fuente.
CREATE TABLE configuraciones_sistema (
  clave_configuracion VARCHAR(80) PRIMARY KEY,
  valor_configuracion VARCHAR(255) NOT NULL,
  descripcion VARCHAR(255) NULL,
  actualizado_por BIGINT UNSIGNED NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT foranea_configuraciones_sistema_usuario
    FOREIGN KEY (actualizado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- Clasificación general de los productos, por ejemplo cuadernos o escritura.
CREATE TABLE categorias (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT unico_categorias_nombre UNIQUE (nombre)
) ENGINE = InnoDB;

-- Empresas o personas que suministran productos a la papelería.
CREATE TABLE proveedores (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_documento VARCHAR(30) NULL,
  nombre VARCHAR(150) NOT NULL,
  nombre_contacto VARCHAR(150) NULL,
  correo VARCHAR(191) NULL,
  telefono VARCHAR(30) NULL,
  direccion VARCHAR(255) NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_en DATETIME NULL,
  CONSTRAINT unico_proveedores_documento UNIQUE (numero_documento)
) ENGINE = InnoDB;

CREATE INDEX indice_proveedores_nombre ON proveedores (nombre);

-- Catálogo de productos con precios, existencia y límite de bajo inventario.
CREATE TABLE productos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(60) NOT NULL,
  codigo_barras VARCHAR(80) NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion VARCHAR(500) NULL,
  precio_compra DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  precio_venta DECIMAL(12,2) NOT NULL,
  stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 0,
  alerta_stock_habilitada BOOLEAN NOT NULL DEFAULT TRUE,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_en DATETIME NULL,
  CONSTRAINT unico_productos_sku UNIQUE (sku),
  CONSTRAINT unico_productos_codigo_barras UNIQUE (codigo_barras),
  CONSTRAINT foranea_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT verificar_productos_precio_compra CHECK (precio_compra >= 0),
  CONSTRAINT verificar_productos_precio_venta CHECK (precio_venta >= 0),
  CONSTRAINT verificar_productos_stock CHECK (stock_actual >= 0),
  CONSTRAINT verificar_productos_stock_minimo CHECK (stock_minimo >= 0)
) ENGINE = InnoDB;

CREATE INDEX indice_productos_nombre ON productos (nombre);
CREATE INDEX indice_productos_categoria_activo ON productos (categoria_id, esta_activo);
CREATE INDEX indice_productos_alerta_inventario ON productos (alerta_stock_habilitada, stock_actual, stock_minimo);

-- Relación de muchos a muchos: un producto puede tener varios proveedores.
CREATE TABLE productos_proveedores (
  producto_id BIGINT UNSIGNED NOT NULL,
  proveedor_id BIGINT UNSIGNED NOT NULL,
  codigo_producto_proveedor VARCHAR(80) NULL,
  ultimo_precio_compra DECIMAL(12,2) NULL,
  es_preferido BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (producto_id, proveedor_id),
  CONSTRAINT foranea_productos_proveedores_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
  CONSTRAINT foranea_productos_proveedores_proveedor
    FOREIGN KEY (proveedor_id) REFERENCES proveedores (id) ON DELETE CASCADE,
  CONSTRAINT verificar_producto_proveedor_precio
    CHECK (ultimo_precio_compra IS NULL OR ultimo_precio_compra >= 0)
) ENGINE = InnoDB;

-- Información básica de los compradores que desean quedar registrados.
CREATE TABLE clientes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo_documento VARCHAR(20) NOT NULL DEFAULT 'CC',
  numero_documento VARCHAR(30) NOT NULL,
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NULL,
  correo VARCHAR(191) NULL,
  telefono VARCHAR(30) NULL,
  direccion VARCHAR(255) NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_en DATETIME NULL,
  CONSTRAINT unico_clientes_documento UNIQUE (tipo_documento, numero_documento)
) ENGINE = InnoDB;

CREATE INDEX indice_clientes_nombre ON clientes (nombres, apellidos);
CREATE INDEX indice_clientes_correo ON clientes (correo);

-- Apertura y cierre de caja de cada turno de trabajo.
CREATE TABLE turnos_caja (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  abierto_por BIGINT UNSIGNED NOT NULL,
  cerrado_por BIGINT UNSIGNED NULL,
  monto_apertura DECIMAL(12,2) NOT NULL,
  abierto_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  efectivo_esperado DECIMAL(12,2) NULL,
  efectivo_contado DECIMAL(12,2) NULL,
  diferencia DECIMAL(12,2) NULL,
  cerrado_en DATETIME NULL,
  estado ENUM('ABIERTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',
  notas_cierre VARCHAR(500) NULL,
  CONSTRAINT foranea_turno_caja_abierto_por FOREIGN KEY (abierto_por) REFERENCES usuarios (id),
  CONSTRAINT foranea_turno_caja_cerrado_por FOREIGN KEY (cerrado_por) REFERENCES usuarios (id),
  CONSTRAINT verificar_cash_monto_apertura CHECK (monto_apertura >= 0),
  CONSTRAINT verificar_turno_caja_estado CHECK (
    (estado = 'ABIERTO' AND cerrado_en IS NULL)
    OR (estado = 'CERRADO' AND cerrado_en IS NOT NULL)
  )
) ENGINE = InnoDB;

CREATE INDEX indice_turno_cajas_estado ON turnos_caja (estado);
CREATE INDEX indice_turno_cajas_abierto_en ON turnos_caja (abierto_en);

-- Formas de pago disponibles al confirmar una venta.
CREATE TABLE metodos_pago (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT unico_metodos_pago_codigo UNIQUE (codigo),
  CONSTRAINT unico_metodos_pago_nombre UNIQUE (nombre)
) ENGINE = InnoDB;

-- Encabezado de la venta con cliente, vendedor y valores totales.
CREATE TABLE ventas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_venta VARCHAR(30) NOT NULL,
  turno_caja_id BIGINT UNSIGNED NOT NULL,
  cliente_id BIGINT UNSIGNED NULL,
  vendido_por BIGINT UNSIGNED NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  monto_descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_impuesto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_total DECIMAL(12,2) NOT NULL,
  estado ENUM('CONFIRMADA', 'ANULADA') NOT NULL DEFAULT 'CONFIRMADA',
  confirmado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelado_en DATETIME NULL,
  cancelado_por BIGINT UNSIGNED NULL,
  motivo_cancelacion VARCHAR(500) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unico_ventas_numero UNIQUE (numero_venta),
  CONSTRAINT foranea_ventas_turno_caja
    FOREIGN KEY (turno_caja_id) REFERENCES turnos_caja (id),
  CONSTRAINT foranea_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT foranea_ventas_vendido_por FOREIGN KEY (vendido_por) REFERENCES usuarios (id),
  CONSTRAINT foranea_ventas_cancelado_por FOREIGN KEY (cancelado_por) REFERENCES usuarios (id),
  CONSTRAINT verificar_ventas_subtotal CHECK (subtotal >= 0),
  CONSTRAINT verificar_ventas_descuento CHECK (monto_descuento >= 0),
  CONSTRAINT verificar_ventas_impuesto CHECK (monto_impuesto >= 0),
  CONSTRAINT verificar_ventas_total CHECK (monto_total >= 0),
  CONSTRAINT verificar_ventas_cancelacion CHECK (
    (estado = 'CONFIRMADA' AND cancelado_en IS NULL AND cancelado_por IS NULL)
    OR (estado = 'ANULADA' AND cancelado_en IS NOT NULL AND cancelado_por IS NOT NULL)
  )
) ENGINE = InnoDB;

CREATE INDEX indice_ventas_fecha ON ventas (confirmado_en);
CREATE INDEX indice_ventas_vendedor_fecha ON ventas (vendido_por, confirmado_en);
CREATE INDEX indice_ventas_cliente_fecha ON ventas (cliente_id, confirmado_en);
CREATE INDEX indice_ventas_turno_caja ON ventas (turno_caja_id, estado);

-- Productos y cantidades que componen cada venta.
-- Se conserva el nombre, SKU y precio usados para mantener el historial original.
CREATE TABLE detalles_venta (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  nombre_producto VARCHAR(150) NOT NULL,
  sku VARCHAR(60) NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  monto_descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_impuesto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_linea DECIMAL(12,2) NOT NULL,
  CONSTRAINT foranea_detalles_venta_venta
    FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT foranea_detalles_venta_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT verificar_detalles_venta_cantidad CHECK (cantidad > 0),
  CONSTRAINT verificar_detalles_venta_precio_unitario CHECK (precio_unitario >= 0),
  CONSTRAINT verificar_detalles_venta_descuento CHECK (monto_descuento >= 0),
  CONSTRAINT verificar_detalles_venta_impuesto CHECK (monto_impuesto >= 0),
  CONSTRAINT verificar_detalles_venta_total CHECK (total_linea >= 0),
  CONSTRAINT unico_venta_producto UNIQUE (venta_id, producto_id)
) ENGINE = InnoDB;

CREATE INDEX indice_detalles_venta_producto ON detalles_venta (producto_id);

-- Pagos asociados a una venta; permite combinar más de un método de pago.
CREATE TABLE pagos_venta (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT UNSIGNED NOT NULL,
  metodo_pago_id SMALLINT UNSIGNED NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  referencia VARCHAR(100) NULL,
  monto_recibido DECIMAL(12,2) NULL,
  cambio DECIMAL(12,2) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT foranea_pagos_venta_venta
    FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT foranea_pagos_venta_metodo
    FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago (id),
  CONSTRAINT verificar_pago_venta_monto CHECK (monto > 0),
  CONSTRAINT verificar_pago_venta_recibido CHECK (monto_recibido IS NULL OR monto_recibido >= 0),
  CONSTRAINT verificar_pago_venta_cambio CHECK (cambio IS NULL OR cambio >= 0)
) ENGINE = InnoDB;

CREATE INDEX indice_pagos_venta_venta ON pagos_venta (venta_id);
CREATE INDEX indice_pagos_venta_metodo ON pagos_venta (metodo_pago_id);

-- Salidas de dinero menores registradas durante un turno de caja.
CREATE TABLE gastos_caja (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  turno_caja_id BIGINT UNSIGNED NOT NULL,
  registrado_por BIGINT UNSIGNED NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  ocurrido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT foranea_gastos_caja_sesion
    FOREIGN KEY (turno_caja_id) REFERENCES turnos_caja (id),
  CONSTRAINT foranea_gastos_caja_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios (id),
  CONSTRAINT verificar_gastos_caja_monto CHECK (monto > 0)
) ENGINE = InnoDB;

CREATE INDEX indice_gastos_caja_sesion ON gastos_caja (turno_caja_id);

-- Historial de cada entrada, salida, ajuste o devolución de inventario.
CREATE TABLE movimientos_inventario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  venta_id BIGINT UNSIGNED NULL,
  tipo_movimiento ENUM('INICIAL', 'COMPRA', 'VENTA', 'REVERSION_VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA') NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT UNSIGNED NOT NULL,
  stock_posterior INT UNSIGNED NOT NULL,
  costo_unitario DECIMAL(12,2) NULL,
  referencia VARCHAR(100) NULL,
  notas VARCHAR(500) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT foranea_movimientos_inventario_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT foranea_movimientos_inventario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT foranea_movimientos_inventario_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
  CONSTRAINT verificar_inventario_cantidad CHECK (cantidad <> 0),
  CONSTRAINT verificar_inventario_stock_anterior CHECK (stock_anterior >= 0),
  CONSTRAINT verificar_inventario_stock_posterior CHECK (stock_posterior >= 0),
  CONSTRAINT verificar_inventario_costo_unitario CHECK (costo_unitario IS NULL OR costo_unitario >= 0)
) ENGINE = InnoDB;

CREATE INDEX indice_inventario_producto_fecha ON movimientos_inventario (producto_id, creado_en);
CREATE INDEX indice_inventario_venta ON movimientos_inventario (venta_id);

-- Alertas creadas por el Observer cuando un producto llega al stock mínimo.
CREATE TABLE alertas_inventario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id BIGINT UNSIGNED NOT NULL,
  movimiento_inventario_id BIGINT UNSIGNED NULL,
  stock_al_crear INT UNSIGNED NOT NULL,
  stock_minimo_al_crear INT UNSIGNED NOT NULL,
  estado ENUM('ACTIVA', 'RESUELTA', 'DESCARTADA') NOT NULL DEFAULT 'ACTIVA',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelto_en DATETIME NULL,
  resuelto_por BIGINT UNSIGNED NULL,
  CONSTRAINT foranea_alertas_inventario_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT foranea_alertas_inventario_movimiento
    FOREIGN KEY (movimiento_inventario_id) REFERENCES movimientos_inventario (id),
  CONSTRAINT foranea_alertas_inventario_resuelto_por FOREIGN KEY (resuelto_por) REFERENCES usuarios (id),
  CONSTRAINT verificar_alerta_inventario_resolucion CHECK (
    (estado = 'ACTIVA' AND resuelto_en IS NULL)
    OR (estado IN ('RESUELTA', 'DESCARTADA') AND resuelto_en IS NOT NULL)
  )
) ENGINE = InnoDB;

CREATE INDEX indice_alertas_inventario_estado_fecha ON alertas_inventario (estado, creado_en);
CREATE INDEX indice_alertas_inventario_producto_estado ON alertas_inventario (producto_id, estado);

-- Registro general de acciones importantes realizadas dentro del sistema.
CREATE TABLE registros_auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NULL,
  accion VARCHAR(80) NOT NULL,
  tipo_entidad VARCHAR(80) NOT NULL,
  entidad_id BIGINT UNSIGNED NULL,
  detalles JSON NULL,
  direccion_ip VARCHAR(45) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT foranea_registros_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX indice_auditoria_entidad ON registros_auditoria (tipo_entidad, entidad_id);
CREATE INDEX indice_auditoria_usuario_fecha ON registros_auditoria (usuario_id, creado_en);
