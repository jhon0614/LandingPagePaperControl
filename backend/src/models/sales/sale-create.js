import { calcularDescuento, validarDescuento } from "../../utils/discount.js";
import { centavos, importeSql } from "../../utils/money.js";
import { randomUUID } from "node:crypto";
import { InventarioVenta } from "./sale-inventory.js";
import { SolicitudesVenta } from "./sale-idempotency.js";

// Registra la venta, el pago y la salida de inventario en una sola transacción.
export class CreadorVenta {
  constructor(conexiones) {
    this.conexiones = conexiones;
    this.inventarioVenta = new InventarioVenta();
    this.solicitudesVenta = new SolicitudesVenta();
  }

  async buscarTurnoAbierto(conexion, turnoCajaId) {
    // Conserva el bloqueo del turno dentro de la transacción de la venta.
    const [turnos] = await conexion.execute(
      `SELECT id FROM turnos_caja WHERE estado = 'ABIERTO'
      AND (? IS NULL OR id = ?)
      ORDER BY abierto_en DESC LIMIT 1 FOR UPDATE`,
      [turnoCajaId ?? null, turnoCajaId ?? null],
    );

    return turnos[0];
  }

  async buscarClienteActivo(conexion, clienteId) {
    const [clientes] = await conexion.execute(
      `SELECT id FROM clientes WHERE id = ? AND esta_activo = TRUE
      AND eliminado_en IS NULL LIMIT 1`,
      [clienteId],
    );

    return clientes[0];
  }

  async buscarProductosParaVenta(conexion, productos) {
    const ids = productos.map((producto) => producto.productoId);
    const marcadores = ids.map(() => "?").join(",");

    // Bloquea los productos en orden de ID para coordinar ventas simultáneas.
    const [filasProductos] = await conexion.execute(
      `SELECT id, nombre, sku, precio_venta, stock_actual, stock_minimo,
            alerta_stock_habilitada, esta_activo
       FROM productos WHERE id IN (${marcadores}) AND eliminado_en IS NULL
       ORDER BY id FOR UPDATE`,
      ids,
    );

    return filasProductos;
  }

  async buscarMetodoPagoActivo(conexion, codigo) {
    const [metodos] = await conexion.execute(
      `SELECT id, codigo FROM metodos_pago WHERE codigo = ? AND esta_activo = TRUE LIMIT 1`,
      [codigo],
    );

    return metodos[0];
  }

  calcularTotales(productos, porId, tipoDescuento, valorDescuento) {
    // Usa los precios de la BD y calcula en centavos para evitar errores decimales.
    const subtotalCentavos = productos.reduce(
      (total, solicitado) =>
        total +
        centavos(porId.get(solicitado.productoId).precio_venta) *
          BigInt(solicitado.cantidad),
      0n,
    );

    const descuentoCentavos = calcularDescuento(
      subtotalCentavos,
      tipoDescuento,
      valorDescuento,
    );

    return {
      subtotalCentavos,
      descuentoCentavos,
      totalCentavos: subtotalCentavos - descuentoCentavos,
    };
  }

  async registrarPago(conexion, datos) {
    await conexion.execute(
      `INSERT INTO pagos_venta
      (venta_id, metodo_pago_id, monto, referencia, monto_recibido, cambio)
     VALUES (?, ?, ?, ?, ?, ?)`,
      [
        datos.ventaId,
        datos.metodoPagoId,
        datos.total,
        datos.referencia,
        datos.montoRecibido,
        datos.cambio,
      ],
    );
  }

  async crear({
    usuarioId,
    clienteId,
    productos,
    metodoPago,
    tipoDescuento,
    valorDescuento = 0,
    referencia,
    montoRecibido,
    turnoCajaId,
    claveIdempotencia,
    hashSolicitud,
  }) {
    // Protege también a los consumidores internos que no pasan por la ruta HTTP.
    if (
      !Array.isArray(productos) ||
      productos.length === 0 ||
      productos.some(
        (p) =>
          !Number.isSafeInteger(p.productoId) ||
          p.productoId <= 0 ||
          !Number.isSafeInteger(p.cantidad) ||
          p.cantidad <= 0,
      ) ||
      new Set(productos.map((p) => p.productoId)).size !== productos.length
    ) {
      return { error: "PRODUCTO_INVALIDO" };
    }
    validarDescuento(tipoDescuento, valorDescuento);
    const conexion = await this.conexiones.getConnection();
    try {
      // La venta completa se confirma únicamente si caja, stock y pago son válidos.
      await conexion.beginTransaction();
      if (claveIdempotencia) {
        const solicitud = await this.solicitudesVenta.registrarYBuscar(
          conexion,
          { usuarioId, claveIdempotencia, hashSolicitud },
        );

        // Una misma clave no puede representar ventas con datos diferentes.
        if (solicitud.hash_solicitud !== hashSolicitud)
          return await this.#cancelar(conexion, {
            error: "IDEMPOTENCIA_CONFLICTO",
          });

        // Si la solicitud ya se completó, devuelve la venta sin registrarla otra vez.
        if (solicitud.venta_id) {
          await conexion.commit();
          return { id: solicitud.venta_id };
        }
      }
      const turno = await this.buscarTurnoAbierto(conexion, turnoCajaId);

      if (!turno) return await this.#cancelar(conexion, { error: "SIN_TURNO" });

      // La venta puede registrarse sin cliente; si se indica uno, debe estar activo.
      if (clienteId) {
        const cliente = await this.buscarClienteActivo(conexion, clienteId);

        if (!cliente)
          return await this.#cancelar(conexion, {
            error: "CLIENTE_INVALIDO",
          });
      }

      const filasProductos = await this.buscarProductosParaVenta(
        conexion,
        productos,
      );
      const porId = new Map(
        filasProductos.map((producto) => [Number(producto.id), producto]),
      );
      for (const solicitado of productos) {
        const producto = porId.get(solicitado.productoId);
        if (!producto || !producto.esta_activo)
          return await this.#cancelar(conexion, {
            error: "PRODUCTO_INVALIDO",
            productoId: solicitado.productoId,
          });
        if (Number(producto.stock_actual) < solicitado.cantidad)
          return await this.#cancelar(conexion, {
            error: "STOCK_INSUFICIENTE",
            productoId: solicitado.productoId,
            disponible: Number(producto.stock_actual),
          });
      }

      const metodo = await this.buscarMetodoPagoActivo(conexion, metodoPago);

      if (!metodo)
        return await this.#cancelar(conexion, {
          error: "METODO_PAGO_INVALIDO",
        });

      // Los importes se calculan con los precios recuperados de la base de datos.
      const { subtotalCentavos, descuentoCentavos, totalCentavos } =
        this.calcularTotales(productos, porId, tipoDescuento, valorDescuento);
      if (totalCentavos <= 0n)
        return await this.#cancelar(conexion, { error: "TOTAL_INVALIDO" });
      const subtotal = importeSql(subtotalCentavos);
      const montoDescuento = importeSql(descuentoCentavos);
      const total = importeSql(totalCentavos);
      if (
        metodoPago === "EFECTIVO" &&
        montoRecibido != null &&
        centavos(montoRecibido) < totalCentavos
      )
        return await this.#cancelar(conexion, {
          error: "MONTO_RECIBIDO_INSUFICIENTE",
          total: Number(total),
        });

      // El valor temporal satisface la clave única hasta conocer el insertId.
      // numero_venta admite 30 caracteres, por eso se eliminan los guiones del
      // UUID y se limita la parte aleatoria a 26 caracteres más el prefijo.
      const temporal = `TMP-${randomUUID().replaceAll("-", "").slice(0, 26)}`;
      const [venta] = await conexion.execute(
        `INSERT INTO ventas
          (numero_venta, turno_caja_id, cliente_id, vendido_por, subtotal,
           tipo_descuento, valor_descuento, monto_descuento, monto_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          temporal,
          turno.id,
          clienteId,
          usuarioId,
          subtotal,
          tipoDescuento,
          valorDescuento,
          montoDescuento,
          total,
        ],
      );
      const numeroVenta = `V-${String(venta.insertId).padStart(8, "0")}`;
      await conexion.execute(
        `UPDATE ventas SET numero_venta = ? WHERE id = ?`,
        [numeroVenta, venta.insertId],
      );

      await this.inventarioVenta.registrarProductos(conexion, {
        productos,
        porId,
        ventaId: venta.insertId,
        usuarioId,
        numeroVenta,
      });

      const cambio =
        metodoPago === "EFECTIVO" && montoRecibido != null
          ? importeSql(centavos(montoRecibido) - totalCentavos)
          : null;
      await this.registrarPago(conexion, {
        ventaId: venta.insertId,
        metodoPagoId: metodo.id,
        total,
        referencia,
        montoRecibido,
        cambio,
      });
      if (claveIdempotencia) {
        await conexion.execute(
          `UPDATE solicitudes_venta SET venta_id = ? WHERE usuario_id = ? AND clave = ?`,
          [venta.insertId, usuarioId, claveIdempotencia],
        );
      }
      await conexion.commit();
      return { id: venta.insertId };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async #cancelar(conexion, resultado) {
    // Devuelve un resultado de dominio después de restaurar todos los cambios.
    await conexion.rollback();
    return resultado;
  }
}
