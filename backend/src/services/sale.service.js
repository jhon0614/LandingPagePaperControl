import { validarDescuento } from "../utils/discount.js";
import { rangoFechas, paginacion } from "../utils/query.js";
import { createHash } from "node:crypto";
import { ErrorAplicacion } from "../errors/app-error.js";

const numero = (valor) => Number(valor ?? 0);
const fechaValida = /^\d{4}-\d{2}-\d{2}$/;

// Los presentadores aíslan el contrato JSON de los nombres usados por MySQL.
function presentarListado(fila) {
  const productos = fila.productos ?? "";
  const subtotal = numero(fila.subtotal);
  const montoDescuento = numero(fila.monto_descuento);
  const total = numero(fila.monto_total);

  return {
    id: fila.id,
    numeroVenta: fila.numero_venta,
    // Se conservan estos alias en snake_case porque son los campos que consume
    // actualmente la tabla de historial de Ventas.jsx.
    numero_venta: fila.numero_venta,
    vendedorId: fila.vendido_por,
    vendedor: fila.vendedor,
    fecha: fila.confirmado_en,
    confirmado_en: fila.confirmado_en,
    productos,
    productosDetalle: productos ? productos.split(" | ") : [],
    subtotal,
    tipoDescuento: fila.tipo_descuento,
    valorDescuento: numero(fila.valor_descuento),
    montoDescuento,
    monto_descuento: montoDescuento,
    total,
    monto_total: total,
    metodoPago: fila.metodos_pago,
    metodos_pago: fila.metodos_pago,
    estado: fila.estado,
  };
}

function presentarComprobante({ venta, productos, pagos }) {
  return {
    id: venta.id,
    numeroVenta: venta.numero_venta,
    fecha: venta.confirmado_en,
    vendedor: { id: venta.vendido_por, nombre: venta.vendedor },
    cliente: venta.cliente_id
      ? {
          id: venta.cliente_id,
          nombre: (venta.cliente ?? "").trim(),
          tipoDocumento: venta.tipo_documento,
          documento: venta.numero_documento,
        }
      : null,
    productos: productos.map((producto) => ({
      productoId: producto.producto_id,
      nombre: producto.nombre_producto,
      sku: producto.sku,
      cantidad: Number(producto.cantidad),
      precioUnitario: numero(producto.precio_unitario),
      descuento: numero(producto.monto_descuento),
      impuesto: numero(producto.monto_impuesto),
      total: numero(producto.total_linea),
    })),
    subtotal: numero(venta.subtotal),
    descuento: {
      tipo: venta.tipo_descuento,
      valor: numero(venta.valor_descuento),
      monto: numero(venta.monto_descuento),
    },
    impuesto: numero(venta.monto_impuesto),
    total: numero(venta.monto_total),
    pagos: pagos.map((pago) => ({
      metodo: pago.codigo,
      nombre: pago.nombre,
      nombre: pago.nombre,
      monto: numero(pago.monto),
      referencia: pago.referencia,
      montoRecibido:
        pago.monto_recibido == null ? null : numero(pago.monto_recibido),
      cambio: pago.cambio == null ? null : numero(pago.cambio),
    })),
    estado: venta.estado,
    anuladoEn: venta.cancelado_en,
    motivoAnulacion: venta.motivo_cancelacion,
  };
}

// Coordina las reglas de venta sin depender de objetos propios de Express.
export class ServicioVenta {
  constructor(modelo) {
    this.modelo = modelo;
  }

  async metodosPago() {
    return (await this.modelo.listarMetodosPago()).map((metodo) => ({
      id: Number(metodo.id),
      codigo: metodo.codigo,
      nombre: metodo.nombre,
      activo: Boolean(metodo.esta_activo),
    }));
  }

  async actualizarMetodoPago(id, estaActivo) {
    const metodo = await this.modelo.actualizarMetodoPago(
      this.#validarId(id),
      Boolean(estaActivo),
    );
    if (!metodo)
      throw new ErrorAplicacion(
        "El método de pago no fue encontrado.",
        404,
        "METODO_PAGO_NO_ENCONTRADO",
      );
    return {
      id: Number(metodo.id),
      codigo: metodo.codigo,
      nombre: metodo.nombre,
      activo: Boolean(metodo.esta_activo),
    };
  }

  async crear(datos, usuarioId, claveIdempotencia) {
    validarDescuento(datos.tipoDescuento, datos.valorDescuento ?? 0);
    if (
      claveIdempotencia !== undefined &&
      (typeof claveIdempotencia !== "string" ||
        !/^[A-Za-z0-9:_-]{16,128}$/.test(claveIdempotencia))
    )
      throw new ErrorAplicacion(
        "Idempotency-Key debe contener entre 16 y 128 caracteres alfanuméricos, : _ o -.",
        400,
        "IDEMPOTENCIA_INVALIDA",
      );
    const contenido = {
      turnoCajaId: datos.turnoCajaId ?? null,
      clienteId: datos.clienteId ?? null,
      productos: [...datos.productos]
        .map(({ productoId, cantidad }) => ({ productoId, cantidad }))
        .sort((a, b) => a.productoId - b.productoId),
      metodoPago: datos.metodoPago,
      tipoDescuento: datos.tipoDescuento ?? null,
      valorDescuento: datos.valorDescuento ?? 0,
      referencia: datos.referencia ?? null,
      montoRecibido: datos.montoRecibido ?? null,
    };
    const hashSolicitud = createHash("sha256")
      .update(JSON.stringify(contenido))
      .digest("hex");
    const resultado = await this.modelo.crear({
      claveIdempotencia,
      hashSolicitud,
      ...datos,
      usuarioId,
      clienteId: datos.clienteId ?? null,
      tipoDescuento: datos.tipoDescuento ?? null,
      referencia: datos.referencia ?? null,
      montoRecibido: datos.montoRecibido ?? null,
    });
    // El modelo devuelve códigos de dominio para poder deshacer la transacción;
    // aquí se traducen al formato uniforme de errores HTTP de la aplicación.
    const errores = {
      IDEMPOTENCIA_CONFLICTO: [
        "La clave ya fue usada con otra venta.",
        409,
        "IDEMPOTENCIA_CONFLICTO",
      ],
      SIN_TURNO: [
        "Debes abrir un turno de caja antes de vender.",
        409,
        "TURNO_CAJA_NO_ABIERTO",
      ],
      CLIENTE_INVALIDO: [
        "El cliente no existe o está inactivo.",
        400,
        "CLIENTE_INVALIDO",
      ],
      PRODUCTO_INVALIDO: [
        "Uno de los productos no existe o está inactivo.",
        400,
        "PRODUCTO_INVALIDO",
      ],
      STOCK_INSUFICIENTE: [
        "No hay existencias suficientes para completar la venta.",
        409,
        "STOCK_INSUFICIENTE",
      ],
      METODO_PAGO_INVALIDO: [
        "El método de pago no existe o está inactivo.",
        400,
        "METODO_PAGO_INVALIDO",
      ],
      DESCUENTO_INVALIDO: [
        "El descuento no puede superar el subtotal.",
        400,
        "DESCUENTO_INVALIDO",
      ],
      TOTAL_INVALIDO: [
        "El total de la venta debe ser mayor que cero.",
        400,
        "TOTAL_VENTA_INVALIDO",
      ],
      MONTO_RECIBIDO_INSUFICIENTE: [
        "El monto recibido es inferior al total.",
        400,
        "MONTO_RECIBIDO_INSUFICIENTE",
      ],
    };
    if (resultado.error) {
      const [mensaje, estado, codigo] = errores[resultado.error];
      throw new ErrorAplicacion(mensaje, estado, codigo, {
        ...(resultado.productoId ? { productoId: resultado.productoId } : {}),
        ...(resultado.disponible != null
          ? { disponible: resultado.disponible }
          : {}),
        ...(resultado.total != null ? { total: resultado.total } : {}),
      });
    }
    return presentarComprobante(await this.modelo.comprobante(resultado.id));
  }

  async propias(usuarioId, filtros = {}) {
    return (await this.modelo.buscarPorVendedor(usuarioId, filtros)).map(
      presentarListado,
    );
  }

  async historial(filtros) {
    // Solo se permiten filtros y órdenes conocidos antes de construir el SQL.
    rangoFechas(filtros.fechaInicio, filtros.fechaFin);
    const fechaInicio = filtros.fechaInicio?.trim() || undefined;
    const fechaFin = filtros.fechaFin?.trim() || undefined;
    if (
      (fechaInicio && !fechaValida.test(fechaInicio)) ||
      (fechaFin && !fechaValida.test(fechaFin)) ||
      (fechaInicio && fechaFin && fechaInicio > fechaFin)
    ) {
      throw new ErrorAplicacion(
        "El rango de fechas no es válido. Usa AAAA-MM-DD.",
        400,
        "RANGO_FECHAS_INVALIDO",
      );
    }
    let vendedorId;
    if (filtros.vendedorId != null && filtros.vendedorId !== "") {
      vendedorId = Number(filtros.vendedorId);
      if (!Number.isInteger(vendedorId) || vendedorId <= 0)
        throw new ErrorAplicacion(
          "El vendedorId no es válido.",
          400,
          "VENDEDOR_ID_INVALIDO",
        );
    }
    const orden = filtros.orden || "fecha";
    if (!["fecha", "monto", "vendedor"].includes(orden))
      throw new ErrorAplicacion(
        "El orden solicitado no es válido.",
        400,
        "ORDEN_INVALIDO",
      );
    return (
      await this.modelo.historial({
        ...filtros,
        fechaInicio,
        fechaFin,
        vendedorId,
        orden,
      })
    ).map(presentarListado);
  }

  async comprasCliente(id, filtros = {}, usuario) {
    const clienteId = Number(id);
    if (!Number.isSafeInteger(clienteId) || clienteId <= 0)
      throw new ErrorAplicacion(
        "El ID del cliente es inválido.",
        400,
        "ID_CLIENTE_INVALIDO",
      );
    if (!["VENDEDOR", "ADMINISTRADOR", "DUENO"].includes(usuario?.rol))
      throw new ErrorAplicacion(
        "No tienes permiso para consultar compras.",
        403,
        "ACCESO_DENEGADO",
      );
    if (!Number.isSafeInteger(Number(usuario.id)) || Number(usuario.id) <= 0)
      throw new ErrorAplicacion(
        "El usuario no es válido.",
        403,
        "ACCESO_DENEGADO",
      );
    paginacion(filtros);
    rangoFechas(filtros.fechaInicio, filtros.fechaFin);
    const estado = filtros.estado ?? "TODAS";
    if (!["TODAS", "CONFIRMADA", "ANULADA"].includes(estado))
      throw new ErrorAplicacion(
        "estado debe ser TODAS, CONFIRMADA o ANULADA.",
        400,
        "ESTADO_VENTA_INVALIDO",
      );
    if (!(await this.modelo.existeCliente(clienteId)))
      throw new ErrorAplicacion(
        "El cliente no fue encontrado.",
        404,
        "CLIENTE_NO_ENCONTRADO",
      );
    const filas = await this.modelo.comprasCliente({
      clienteId,
      vendedorId: usuario.rol === "VENDEDOR" ? Number(usuario.id) : undefined,
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      estado,
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
    return filas.map((fila) => ({
      ...presentarListado(fila),
      clienteId,
      items: fila.items.map((item) => ({
        productoId: item.producto_id,
        nombre: item.nombre_producto,
        sku: item.sku,
        cantidad: Number(item.cantidad),
        precioUnitario: numero(item.precio_unitario),
        total: numero(item.total_linea),
      })),
      comprobanteUrl: `/api/ventas/${fila.id}/comprobante`,
    }));
  }

  async comprobante(id, usuario) {
    const ventaId = this.#validarId(id);
    const comprobante = await this.modelo.comprobante(ventaId);
    if (!comprobante)
      throw new ErrorAplicacion(
        "La venta no fue encontrada.",
        404,
        "VENTA_NO_ENCONTRADA",
      );
    // El vendedor consulta sus propias ventas; responsables pueden ver cualquiera.
    if (
      Number(comprobante.venta.vendido_por) !== Number(usuario.id) &&
      !["ADMINISTRADOR", "DUENO"].includes(usuario.rol)
    ) {
      throw new ErrorAplicacion(
        "No tienes permiso para consultar esta venta.",
        403,
        "ACCESO_DENEGADO",
      );
    }
    return presentarComprobante(comprobante);
  }

  async anular(id, datos, usuario) {
    const ventaId = this.#validarId(id);
    const resultado = await this.modelo.anular({
      id: ventaId,
      usuarioId: Number(usuario.id),
      puedeAnularCualquiera: ["ADMINISTRADOR", "DUENO"].includes(usuario.rol),
      motivo: datos.motivo?.trim() || null,
    });
    // Mantiene desacoplados los resultados transaccionales de los estados HTTP.
    const errores = {
      NO_ENCONTRADA: [
        "La venta no fue encontrada.",
        404,
        "VENTA_NO_ENCONTRADA",
      ],
      SIN_PERMISO: [
        "No tienes permiso para anular esta venta.",
        403,
        "ACCESO_DENEGADO",
      ],
      YA_ANULADA: ["La venta ya está anulada.", 409, "VENTA_YA_ANULADA"],
      TURNO_CERRADO: [
        "No se puede anular una venta de un turno de caja cerrado.",
        409,
        "TURNO_CAJA_CERRADO",
      ],
    };
    if (resultado.error) {
      const [mensaje, estado, codigo] = errores[resultado.error];
      throw new ErrorAplicacion(mensaje, estado, codigo);
    }
    return this.comprobante(ventaId, usuario);
  }

  #validarId(id) {
    // Los parámetros de ruta llegan como texto y nunca se entregan sin validar.
    const numeroId = Number(id);
    if (!Number.isSafeInteger(numeroId) || numeroId <= 0)
      throw new ErrorAplicacion(
        "El ID de venta no es válido.",
        400,
        "ID_VENTA_INVALIDO",
      );
    return numeroId;
  }
}
