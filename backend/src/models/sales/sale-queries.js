import { limiteSql } from "../../utils/query.js";

// Agrupa las consultas de lectura utilizadas por el modelo de ventas.
export class ConsultasVenta {
  constructor(conexiones) {
    this.conexiones = conexiones;
  }

  async existeCliente(id) {
    const [filas] = await this.conexiones.execute(
      "SELECT id FROM clientes WHERE id = ? AND eliminado_en IS NULL LIMIT 1",
      [id],
    );
    return filas.length > 0;
  }

  async comprobante(id) {
    // Se consulta en tres bloques para evitar duplicar productos por cada pago.
    const [ventas] = await this.conexiones.execute(
      `SELECT v.*, CONCAT(u.nombres, ' ', u.apellidos) AS vendedor,
              c.tipo_documento, c.numero_documento,
              CONCAT(c.nombres, ' ', COALESCE(c.apellidos, '')) AS cliente
         FROM ventas v
         JOIN usuarios u ON u.id = v.vendido_por
         LEFT JOIN clientes c ON c.id = v.cliente_id
        WHERE v.id = ? LIMIT 1`,
      [id],
    );
    if (!ventas[0]) return null;
    const [productos] = await this.conexiones.execute(
      `SELECT producto_id, nombre_producto, sku, cantidad, precio_unitario,
              monto_descuento, monto_impuesto, total_linea
         FROM detalles_venta WHERE venta_id = ? ORDER BY id`,
      [id],
    );
    const [pagos] = await this.conexiones.execute(
      `SELECT mp.codigo, mp.nombre, p.monto, p.referencia,
              p.monto_recibido, p.cambio
         FROM pagos_venta p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
        WHERE p.venta_id = ? ORDER BY p.id`,
      [id],
    );
    return { venta: ventas[0], productos, pagos };
  }

  async comprasCliente({
    clienteId,
    vendedorId,
    fechaInicio,
    fechaFin,
    estado,
    ...filtros
  }) {
    const condiciones = ["v.cliente_id = ?"];
    const parametros = [clienteId];
    if (vendedorId !== undefined) {
      condiciones.push("v.vendido_por = ?");
      parametros.push(vendedorId);
    }
    if (fechaInicio) {
      condiciones.push("v.confirmado_en >= ?");
      parametros.push(fechaInicio);
    }
    if (fechaFin) {
      condiciones.push("v.confirmado_en < DATE_ADD(?, INTERVAL 1 DAY)");
      parametros.push(fechaFin);
    }
    if (estado !== "TODAS") {
      condiciones.push("v.estado = ?");
      parametros.push(estado);
    }
    const [ventas] = await this.conexiones.execute(
      `SELECT v.*, CONCAT(u.nombres, ' ', u.apellidos) AS vendedor
          FROM ventas v JOIN usuarios u ON u.id = v.vendido_por
          WHERE ${condiciones.join(" AND ")} ORDER BY v.confirmado_en DESC, v.id DESC ${limiteSql(filtros)}`,
      parametros,
    );
    if (!ventas.length) return ventas;
    // Dos consultas por página: no se truncan productos con GROUP_CONCAT ni hay N+1.
    const ids = ventas.map((venta) => venta.id);
    const marcadores = ids.map(() => "?").join(",");
    const [items] = await this.conexiones.execute(
      `SELECT venta_id, producto_id, nombre_producto, sku, cantidad, precio_unitario, total_linea
          FROM detalles_venta WHERE venta_id IN (${marcadores}) ORDER BY venta_id, id`,
      ids,
    );
    const [pagos] = await this.conexiones.execute(
      `SELECT p.venta_id, mp.codigo FROM pagos_venta p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
          WHERE p.venta_id IN (${marcadores}) ORDER BY p.id`,
      ids,
    );
    const porVenta = new Map(
      ventas.map((venta) => [
        Number(venta.id),
        { ...venta, items: [], metodos: [] },
      ]),
    );
    for (const item of items)
      porVenta.get(Number(item.venta_id)).items.push(item);
    for (const pago of pagos)
      porVenta.get(Number(pago.venta_id)).metodos.push(pago.codigo);
    return [...porVenta.values()].map((venta) => ({
      ...venta,
      productos: venta.items
        .map((p) => `${p.nombre_producto} x${p.cantidad}`)
        .join(" | "),
      metodos_pago: [...new Set(venta.metodos)].join(","),
    }));
  }

  async buscarPorVendedor(usuarioId, filtros = {}) {
    const [filas] = await this.conexiones.execute(
      `${this.#consultaListado()} WHERE v.vendido_por = ?
        GROUP BY v.id ORDER BY v.confirmado_en DESC, v.id DESC ${limiteSql(filtros)}`,
      [usuarioId],
    );
    return filas;
  }

  async historial({ fechaInicio, fechaFin, vendedorId, orden, ...filtros }) {
    // Los nombres de columna para ordenar provienen de esta lista controlada.
    const condiciones = [];
    const parametros = [];
    if (fechaInicio) {
      condiciones.push("v.confirmado_en >= ?");
      parametros.push(fechaInicio);
    }
    if (fechaFin) {
      condiciones.push("v.confirmado_en < DATE_ADD(?, INTERVAL 1 DAY)");
      parametros.push(fechaFin);
    }
    if (vendedorId) {
      condiciones.push("v.vendido_por = ?");
      parametros.push(vendedorId);
    }
    const ordenes = {
      fecha: "v.confirmado_en DESC",
      monto: "v.monto_total DESC, v.confirmado_en DESC",
      vendedor: "u.nombres, u.apellidos, v.confirmado_en DESC",
    };
    const where = condiciones.length
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";
    const [filas] = await this.conexiones.execute(
      `${this.#consultaListado()} ${where} GROUP BY v.id ORDER BY ${ordenes[orden]}, v.id DESC ${limiteSql(filtros)}`,
      parametros,
    );
    return filas;
  }

  #consultaListado() {
    // Centraliza la proyección compartida entre ventas propias e historial.
    return `SELECT v.id, v.numero_venta, v.vendido_por, v.subtotal,
                   v.tipo_descuento, v.valor_descuento, v.monto_descuento,
                   v.monto_total, v.estado, v.confirmado_en,
                   CONCAT(u.nombres, ' ', u.apellidos) AS vendedor,
                   GROUP_CONCAT(DISTINCT mp.codigo ORDER BY mp.codigo SEPARATOR ',') AS metodos_pago,
                   GROUP_CONCAT(CONCAT(d.nombre_producto, ' x', d.cantidad)
                     ORDER BY d.id SEPARATOR ' | ') AS productos
              FROM ventas v
              JOIN usuarios u ON u.id = v.vendido_por
              JOIN detalles_venta d ON d.venta_id = v.id
              JOIN pagos_venta p ON p.venta_id = v.id
              JOIN metodos_pago mp ON mp.id = p.metodo_pago_id`;
  }
}
