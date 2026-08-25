import { ErrorAplicacion } from "../errors/app-error.js";

function presentarCliente(fila) {
  const cantidadCompras = Number(fila.cantidad_compras ?? 0);
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
    // Un cliente se considera frecuente desde su tercera venta confirmada.
    esFrecuente: cantidadCompras >= 3,
    cantidadCompras,
    totalComprado: Number(fila.total_comprado ?? 0),
    ultimaCompra: fila.ultima_compra ?? null,
    creadoEn: fila.creado_en,
  };
}

// Contiene las reglas de registro, búsqueda y administración de clientes sin
// depender de objetos HTTP, lo que permite probarlo con modelos simulados.
export class ServicioCliente {
  constructor(modeloCliente, modeloAuditoria) {
    this.modeloCliente = modeloCliente;
    this.modeloAuditoria = modeloAuditoria;
  }

  async crear(datos) {
    // Tipo y número forman la identidad documental única del cliente.
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

    // Evita generar registros de auditoría cuando el estado ya era el solicitado.
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

  async buscar(termino, incluirInactivos) {
    // La consulta vacía devuelve los primeros clientes activos dentro del límite.
    const terminoNormalizado = String(termino ?? "").trim();

    if (terminoNormalizado.length > 100) {
      throw new ErrorAplicacion(
        "El término de búsqueda no puede superar los 100 caracteres.",
        400,
        "TERMINO_BUSQUEDA_INVALIDO",
      );
    }

    const filas = await this.modeloCliente.buscar(
      terminoNormalizado,
      100,
      incluirInactivos === "true",
    );

    return filas.map(presentarCliente);
  }

  async buscarPorId(id) {
    const numeroId = this.#validarId(id);
    const fila = await this.modeloCliente.buscarPorId(numeroId);

    if (!fila) {
      throw new ErrorAplicacion(
        "El cliente no fue encontrado.",
        404,
        "CLIENTE_NO_ENCONTRADO",
      );
    }

    return presentarCliente(fila);
  }

  async eliminar(id, responsableId, direccionIp) {
    const numeroId = this.#validarId(id);
    const cliente = await this.modeloCliente.buscarPorId(numeroId);

    if (!cliente) {
      throw new ErrorAplicacion(
        "El cliente no fue encontrado.",
        404,
        "CLIENTE_NO_ENCONTRADO",
      );
    }

    await this.modeloCliente.eliminarLogicamente(numeroId);
    await this.modeloAuditoria.registrar({
      usuarioId: Number(responsableId),
      accion: "ELIMINAR_CLIENTE",
      tipoEntidad: "CLIENTE",
      entidadId: numeroId,
      detalles: {
        documento: cliente.numero_documento,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
      },
      direccionIp,
    });
  }

  async actualizar(id, datos, administradorId, direccionIp) {
    // Los parámetros de ruta llegan como texto; se validan antes de consultar.
    const numeroId = Number(id);
    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID de cliente es inválido.",
        400,
        "ID_CLIENTE_INVALIDO",
      );
    }

    // buscarPorId ignora clientes eliminados lógicamente.
    const clienteActual = await this.modeloCliente.buscarPorId(numeroId);
    if (!clienteActual) {
      throw new ErrorAplicacion(
        "El cliente no fue encontrado.",
        404,
        "CLIENTE_NO_ENCONTRADO",
      );
    }

    // Se conservan los valores anteriores para completar los campos omitidos
    // y construir el detalle de auditoría.
    const tipoDocumentoAnterior = clienteActual.tipo_documento;
    const numeroDocumentoAnterior = clienteActual.numero_documento;
    const nombresAnterior = clienteActual.nombres;
    const apellidosAnterior = clienteActual.apellidos;
    const correoAnterior = clienteActual.correo;
    const telefonoAnterior = clienteActual.telefono;
    const direccionAnterior = clienteActual.direccion;

    // Se compara con undefined para permitir limpiar campos opcionales con "".
    const tipoDocumentoFinal =
      datos.tipoDocumento !== undefined
        ? datos.tipoDocumento.trim().toUpperCase()
        : tipoDocumentoAnterior;
    const numeroDocumentoFinal =
      datos.documento !== undefined
        ? datos.documento.trim()
        : numeroDocumentoAnterior;
    const nombresFinal =
      datos.nombres !== undefined ? datos.nombres.trim() : nombresAnterior;
    const apellidosFinal =
      datos.apellidos !== undefined
        ? datos.apellidos.trim() || null
        : apellidosAnterior;
    const correoFinal =
      datos.correo !== undefined
        ? datos.correo.trim().toLowerCase() || null
        : correoAnterior;
    const telefonoFinal =
      datos.telefono !== undefined
        ? datos.telefono.trim() || null
        : telefonoAnterior;
    const direccionFinal =
      datos.direccion !== undefined
        ? datos.direccion.trim() || null
        : direccionAnterior;

    // La clave única del documento está compuesta por tipo y número.
    const cambioDocumento =
      tipoDocumentoAnterior !== tipoDocumentoFinal ||
      numeroDocumentoAnterior !== numeroDocumentoFinal;

    if (cambioDocumento) {
      // Incluye eliminados porque todavía ocupan la clave única en MySQL.
      const clienteDocumento = await this.modeloCliente.buscarOtroPorDocumento(
        tipoDocumentoFinal,
        numeroDocumentoFinal,
        numeroId,
      );
      if (clienteDocumento) {
        if (!clienteDocumento.eliminado_en) {
          throw new ErrorAplicacion(
            "El documento ya está registrado en otro cliente activo.",
            409,
            "CLIENTE_DOCUMENTO_EXISTENTE",
          );
        }
        throw new ErrorAplicacion(
          "El documento pertenece a un cliente eliminado.",
          409,
          "CLIENTE_ELIMINADO_EXISTENTE",
        );
      }
    }

    // La auditoría registra únicamente los valores que realmente cambiaron.
    const cambioDatos = {};
    if (tipoDocumentoAnterior !== tipoDocumentoFinal) {
      cambioDatos.tipoDocumento = {
        anterior: tipoDocumentoAnterior,
        nuevo: tipoDocumentoFinal,
      };
    }
    if (numeroDocumentoAnterior !== numeroDocumentoFinal) {
      cambioDatos.numeroDocumento = {
        anterior: numeroDocumentoAnterior,
        nuevo: numeroDocumentoFinal,
      };
    }
    if (nombresAnterior !== nombresFinal) {
      cambioDatos.nombres = {
        anterior: nombresAnterior,
        nuevo: nombresFinal,
      };
    }
    if (apellidosAnterior !== apellidosFinal) {
      cambioDatos.apellidos = {
        anterior: apellidosAnterior,
        nuevo: apellidosFinal,
      };
    }
    if (correoAnterior !== correoFinal) {
      cambioDatos.correo = {
        anterior: correoAnterior,
        nuevo: correoFinal,
      };
    }
    if (telefonoAnterior !== telefonoFinal) {
      cambioDatos.telefono = {
        anterior: telefonoAnterior,
        nuevo: telefonoFinal,
      };
    }
    if (direccionAnterior !== direccionFinal) {
      cambioDatos.direccion = {
        anterior: direccionAnterior,
        nuevo: direccionFinal,
      };
    }

    // Evita UPDATE y auditoría cuando la solicitud no produce ningún cambio.
    if (Object.keys(cambioDatos).length === 0) {
      return presentarCliente(clienteActual);
    }

    // El modelo recibe todos los valores finales para realizar un único UPDATE.
    const fila = await this.modeloCliente.actualizar(numeroId, {
      tipoDocumento: tipoDocumentoFinal,
      numeroDocumento: numeroDocumentoFinal,
      nombres: nombresFinal,
      apellidos: apellidosFinal,
      correo: correoFinal,
      telefono: telefonoFinal,
      direccion: direccionFinal,
    });

    // Conserva quién modificó el cliente, los cambios y la IP de origen.
    await this.modeloAuditoria.registrar({
      usuarioId: Number(administradorId),
      accion: "ACTUALIZAR_CLIENTE",
      tipoEntidad: "CLIENTE",
      entidadId: numeroId,
      detalles: { cambios: cambioDatos },
      direccionIp,
    });

    return presentarCliente(fila);
  }

  #validarId(id) {
    const numeroId = Number(id);
    if (!Number.isInteger(numeroId) || numeroId <= 0) {
      throw new ErrorAplicacion(
        "El ID de cliente es inválido.",
        400,
        "ID_CLIENTE_INVALIDO",
      );
    }
    return numeroId;
  }
}
