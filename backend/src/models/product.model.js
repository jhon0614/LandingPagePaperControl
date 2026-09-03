// Centraliza las consultas de productos, existencias y sus relaciones.
// Las operaciones que cambian stock usan transacciones para que el producto,
// el movimiento y la alerta siempre queden sincronizados.
export class ModeloProducto {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async categorias() {
    const [filas] = await this.conexiones.execute(
      `SELECT id, nombre FROM categorias WHERE esta_activo = TRUE ORDER BY nombre`,
    );
    return filas;
  }

  async listar(incluirInactivos = false, categoriaId) {
    const [filas] = await this.conexiones.execute(
      `SELECT p.*, c.nombre AS categoria
         FROM productos p JOIN categorias c ON c.id = p.categoria_id
        WHERE p.eliminado_en IS NULL ${incluirInactivos ? "" : "AND p.esta_activo = TRUE"}
          ${categoriaId == null ? "" : "AND p.categoria_id = ?"}
        ORDER BY p.nombre`,
      categoriaId == null ? [] : [categoriaId],
    );
    return this.#adjuntarProveedores(filas);
  }

  async buscarPorId(id) {
    const [filas] = await this.conexiones.execute(
      `SELECT p.*, c.nombre AS categoria
         FROM productos p JOIN categorias c ON c.id = p.categoria_id
        WHERE p.id = ? AND p.eliminado_en IS NULL LIMIT 1`,
      [id],
    );
    if (!filas[0]) return null;
    return (await this.#adjuntarProveedores(filas))[0];
  }

  async #adjuntarProveedores(productos) {
    // Carga todos los proveedores en una sola consulta para evitar una consulta
    // adicional por cada producto de la lista.
    if (!productos.length) return productos;
    const ids = productos.map((producto) => producto.id);
    const [proveedores] = await this.conexiones.execute(
      `SELECT pp.producto_id, pr.id, pr.nombre, pr.telefono
         FROM productos_proveedores pp
         JOIN proveedores pr ON pr.id = pp.proveedor_id
        WHERE pp.producto_id IN (${ids.map(() => "?").join(",")})
          AND pr.esta_activo = TRUE AND pr.eliminado_en IS NULL
        ORDER BY pr.nombre`,
      ids,
    );
    const porProducto = new Map();
    for (const proveedor of proveedores) {
      const lista = porProducto.get(Number(proveedor.producto_id)) ?? [];
      lista.push(proveedor);
      porProducto.set(Number(proveedor.producto_id), lista);
    }
    return productos.map((producto) => ({
      ...producto,
      proveedores: porProducto.get(Number(producto.id)) ?? [],
    }));
  }

  async crear(datos, usuarioId) {
    const conexion = await this.conexiones.getConnection();
    try {
      await conexion.beginTransaction();
      const categoriaId = await this.#obtenerCategoria(
        conexion,
        datos.categoria,
      );
      const [resultado] = await conexion.execute(
        `INSERT INTO productos
          (categoria_id, sku, nombre, descripcion, precio_compra, precio_venta,
           stock_actual, stock_minimo, esta_activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          categoriaId,
          datos.codigo,
          datos.nombre,
          datos.marca,
          datos.precioMayor,
          datos.precioDetal,
          datos.stock,
          datos.stockMinimo,
        ],
      );
      if (datos.stock > 0) {
        // El stock con el que nace un producto también debe quedar trazado.
        await conexion.execute(
          `INSERT INTO movimientos_inventario
            (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior,
             stock_posterior, notas)
           VALUES (?, ?, 'INICIAL', ?, 0, ?, 'Stock inicial')`,
          [resultado.insertId, usuarioId, datos.stock, datos.stock],
        );
      }
      await conexion.commit();
      return resultado.insertId;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async actualizar(id, datos, usuarioId) {
    const conexion = await this.conexiones.getConnection();
    try {
      await conexion.beginTransaction();
      const [actuales] = await conexion.execute(
        `SELECT stock_actual FROM productos WHERE id = ? AND eliminado_en IS NULL FOR UPDATE`,
        [id],
      );
      if (!actuales[0]) {
        await conexion.rollback();
        return false;
      }
      const categoriaId = await this.#obtenerCategoria(
        conexion,
        datos.categoria,
      );
      await conexion.execute(
        `UPDATE productos SET categoria_id = ?, sku = ?, nombre = ?, descripcion = ?,
                precio_compra = ?, precio_venta = ?, stock_actual = ?, stock_minimo = ?,
                actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
        [
          categoriaId,
          datos.codigo,
          datos.nombre,
          datos.marca,
          datos.precioMayor,
          datos.precioDetal,
          datos.stock,
          datos.stockMinimo,
          id,
        ],
      );
      const anterior = Number(actuales[0].stock_actual);
      if (anterior !== datos.stock) {
        // Una edición que cambia stock se registra como ajuste, no como venta.
        const diferencia = datos.stock - anterior;
        await conexion.execute(
          `INSERT INTO movimientos_inventario
            (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior,
             stock_posterior, notas)
           VALUES (?, ?, ?, ?, ?, ?, 'Ajuste desde edición de producto')`,
          [
            id,
            usuarioId,
            diferencia > 0 ? "AJUSTE_ENTRADA" : "AJUSTE_SALIDA",
            diferencia,
            anterior,
            datos.stock,
          ],
        );
      }
      await this.#sincronizarAlerta(conexion, id, usuarioId);
      await conexion.commit();
      return true;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async #obtenerCategoria(conexion, nombre) {
    // El frontend trabaja con el nombre de la categoría; aquí se resuelve o
    // crea su identificador sin exigir un endpoint adicional de categorías.
    await conexion.execute(
      `INSERT INTO categorias (nombre) VALUES (?)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
      [nombre],
    );
    const [filas] = await conexion.execute(
      `SELECT id FROM categorias WHERE nombre = ? LIMIT 1`,
      [nombre],
    );
    return filas[0].id;
  }

  async cambiarEstado(id, estaActivo) {
    const [resultado] = await this.conexiones.execute(
      `UPDATE productos SET esta_activo = ?, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ? AND eliminado_en IS NULL`,
      [estaActivo, id],
    );
    return resultado.affectedRows > 0;
  }

  async eliminar(id, usuarioId) {
    const conexion = await this.conexiones.getConnection();
    try {
      await conexion.beginTransaction();
      const [productos] = await conexion.execute(
        `SELECT id FROM productos WHERE id = ? AND eliminado_en IS NULL FOR UPDATE`,
        [id],
      );
      if (!productos[0]) {
        await conexion.rollback();
        return { noExiste: true };
      }
      const [usos] = await conexion.execute(
        `SELECT EXISTS(SELECT 1 FROM detalles_venta WHERE producto_id = ?) AS tiene_ventas,
                EXISTS(SELECT 1 FROM movimientos_inventario WHERE producto_id = ?) AS tiene_movimientos,
                EXISTS(SELECT 1 FROM alertas_inventario WHERE producto_id = ?) AS tiene_alertas`,
        [id, id, id],
      );
      // HU-13: una venta confirmada forma parte del historial y bloquea por
      // completo la eliminación del producto, incluso la eliminación lógica.
      if (usos[0].tiene_ventas) {
        await conexion.rollback();
        return { tieneVentas: true };
      }
      if (
        usos[0].tiene_movimientos ||
        usos[0].tiene_alertas
      ) {
        // Se conserva el producto para mantener sus referencias históricas,
        // pero se marca como eliminado para retirarlo de todos los catálogos.
        await conexion.execute(
          `UPDATE productos
              SET esta_activo = FALSE,
                  eliminado_en = CURRENT_TIMESTAMP,
                  actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [id],
        );
        // Una alerta de un producto retirado deja de requerir reposición. Se
        // resuelve en la misma transacción y conserva quién realizó la acción.
        await conexion.execute(
          `UPDATE alertas_inventario
              SET estado = 'RESUELTA',
                  resuelto_en = CURRENT_TIMESTAMP,
                  resuelto_por = ?
            WHERE producto_id = ? AND estado = 'ACTIVA'`,
          [usuarioId, id],
        );
        await conexion.commit();
        return { eliminadoLogicamente: true };
      }
      await conexion.execute(`DELETE FROM productos WHERE id = ?`, [id]);
      await conexion.commit();
      return { eliminado: true };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async listarMovimientos(id) {
    const [filas] = await this.conexiones.execute(
      `SELECT m.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario
         FROM movimientos_inventario m JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.producto_id = ? ORDER BY m.creado_en DESC, m.id DESC`,
      [id],
    );
    return filas;
  }

  async registrarMovimiento({ productoId, usuarioId, tipo, cantidad, nota }) {
    const conexion = await this.conexiones.getConnection();
    try {
      await conexion.beginTransaction();
      const [productos] = await conexion.execute(
        `SELECT id, stock_actual FROM productos
          WHERE id = ? AND eliminado_en IS NULL FOR UPDATE`,
        [productoId],
      );
      if (!productos[0]) {
        await conexion.rollback();
        return null;
      }
      const anterior = Number(productos[0].stock_actual);
      // ENTRADA suma unidades; AJUSTE representa el nuevo conteo físico total.
      const posterior = tipo === "ENTRADA" ? anterior + cantidad : cantidad;
      const diferencia = posterior - anterior;
      if (diferencia === 0) {
        await conexion.rollback();
        return { sinCambio: true };
      }
      const tipoDb =
        tipo === "ENTRADA"
          ? "COMPRA"
          : diferencia > 0
            ? "AJUSTE_ENTRADA"
            : "AJUSTE_SALIDA";
      await conexion.execute(
        `UPDATE productos SET stock_actual = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
        [posterior, productoId],
      );
      const [resultado] = await conexion.execute(
        `INSERT INTO movimientos_inventario
          (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior,
           stock_posterior, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          productoId,
          usuarioId,
          tipoDb,
          diferencia,
          anterior,
          posterior,
          nota || null,
        ],
      );
      await this.#sincronizarAlerta(
        conexion,
        productoId,
        usuarioId,
        resultado.insertId,
      );
      await conexion.commit();
      return resultado.insertId;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async #sincronizarAlerta(
    conexion,
    productoId,
    usuarioId,
    movimientoId = null,
  ) {
    // Mantiene una sola alerta activa por producto y la resuelve cuando el
    // stock vuelve a estar por encima del mínimo configurado.
    const [filas] = await conexion.execute(
      `SELECT stock_actual, stock_minimo, alerta_stock_habilitada
         FROM productos WHERE id = ?`,
      [productoId],
    );
    const producto = filas[0];
    if (
      producto.alerta_stock_habilitada &&
      Number(producto.stock_actual) <= Number(producto.stock_minimo)
    ) {
      await conexion.execute(
        `INSERT INTO alertas_inventario
          (producto_id, movimiento_inventario_id, stock_al_crear, stock_minimo_al_crear)
         SELECT ?, ?, ?, ? WHERE NOT EXISTS (
           SELECT 1 FROM alertas_inventario WHERE producto_id = ? AND estado = 'ACTIVA'
         )`,
        [
          productoId,
          movimientoId,
          producto.stock_actual,
          producto.stock_minimo,
          productoId,
        ],
      );
    } else {
      await conexion.execute(
        `UPDATE alertas_inventario SET estado = 'RESUELTA', resuelto_en = CURRENT_TIMESTAMP,
                resuelto_por = ? WHERE producto_id = ? AND estado = 'ACTIVA'`,
        [usuarioId, productoId],
      );
    }
  }

  async alertasStock() {
    const [filas] = await this.conexiones.execute(
      `SELECT p.id, p.nombre, p.stock_actual, p.stock_minimo
         FROM productos p WHERE p.esta_activo = TRUE AND p.eliminado_en IS NULL
          AND p.alerta_stock_habilitada = TRUE AND p.stock_actual <= p.stock_minimo
        ORDER BY p.stock_actual ASC, p.nombre`,
    );
    return this.#adjuntarProveedores(filas);
  }

  async listarProveedores(productoId) {
    const [filas] = await this.conexiones.execute(
      `SELECT pr.id, pr.nombre, pr.nombre_contacto, pr.telefono, pr.correo, pr.direccion
         FROM productos_proveedores pp JOIN proveedores pr ON pr.id = pp.proveedor_id
        WHERE pp.producto_id = ? AND pr.eliminado_en IS NULL ORDER BY pr.nombre`,
      [productoId],
    );
    return filas;
  }

  async asociarProveedor(productoId, proveedorId) {
    const [resultado] = await this.conexiones.execute(
      `INSERT IGNORE INTO productos_proveedores (producto_id, proveedor_id)
       SELECT p.id, pr.id FROM productos p JOIN proveedores pr ON pr.id = ?
        WHERE p.id = ? AND p.eliminado_en IS NULL AND pr.eliminado_en IS NULL`,
      [proveedorId, productoId],
    );
    return resultado.affectedRows > 0;
  }

  async quitarProveedor(productoId, proveedorId) {
    const [resultado] = await this.conexiones.execute(
      `DELETE FROM productos_proveedores WHERE producto_id = ? AND proveedor_id = ?`,
      [productoId, proveedorId],
    );
    return resultado.affectedRows > 0;
  }
}
