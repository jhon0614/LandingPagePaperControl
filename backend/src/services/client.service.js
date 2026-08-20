import { ErrorAplicacion } from "../errors/app-error.js";

function presentarCliente(fila) {
  return {
    id: fila.id,
    tipoDocumento: fila.tipo_documento,
    documento: fila.numero_documento,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    correo: fila.correo,
    telefono: fila.telefono,
    direccion: fila.direccion,
    estaActivo: Boolean(fila.esta_activo),
    creadoEn: fila.creado_en,
  };
}

export class ServicioCliente {
  constructor(modeloCliente, modeloAuditoria) {
    this.modeloCliente = modeloCliente;
    this.modeloAuditoria = modeloAuditoria;
  }

  async crear(datos) {
    const tipoDocumento = datos.tipoDocumento.trim().toUpperCase();
    const numeroDocumento = datos.documento.trim();

    const existente = await this.modeloCliente.buscarPorDocumento(
      tipoDocumento,
      numeroDocumento,
    );

    if (existente) {
      throw new ErrorAplicacion(
        "Ya existe un cliente con este documento.",
        409,
        "CLIENTE_DOCUMENTO_EXISTENTE",
      );
    }

    const fila = await this.modeloCliente.crear({
      tipoDocumento,
      numeroDocumento,
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos?.trim() || null,
      correo: datos.correo?.trim().toLowerCase() || null,
      telefono: datos.telefono?.trim() || null,
      direccion: datos.direccion?.trim() || null,
    });

    return presentarCliente(fila);
  }

  async cambiarEstado(id, estaActivo, administradorId, direccionIp) {
    const numeroId = Number(id);

    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID de cliente es inválido.",
        400,
        "ID_CLIENTE_INVALIDO",
      );
    }

    const clienteActual = await this.modeloCliente.buscarPorId(numeroId);
    if (!clienteActual) {
      throw new ErrorAplicacion(
        "El cliente no fue encontrado.",
        404,
        "CLIENTE_NO_ENCONTRADO",
      );
    }

    const fila = await this.modeloCliente.actualizarEstado(
      numeroId,
      estaActivo,
    );
    const estadoAnterior = Boolean(clienteActual.esta_activo);

    if (estadoAnterior !== estaActivo) {
      await this.modeloAuditoria.registrar({
        usuarioId: Number(administradorId),
        accion: estaActivo ? "ACTIVAR_CLIENTE" : "DESACTIVAR_CLIENTE",
        tipoEntidad: "CLIENTE",
        entidadId: numeroId,
        detalles: { estadoAnterior, estadoNuevo: estaActivo },
        direccionIp,
      });
    }

    return presentarCliente(fila);
  }

  async buscar(termino) {
    const terminoNormalizado = String(termino ?? "").trim(); //normaliza el texto si es null o undefined

    if (terminoNormalizado.length > 100) {
      throw new ErrorAplicacion(
        "El término de búsqueda no puede superar los 100 caracteres.",
        400,
        "TERMINO_BUSQUEDA_INVALIDO",
      );
    }

    const filas = await this.modeloCliente.buscar(terminoNormalizado, 20); //envia al modelo el termino normalizado para que se ejecute la búsquedad

    return filas.map(presentarCliente); //regresa la información de acuerdo al formato inicial
  }
}
