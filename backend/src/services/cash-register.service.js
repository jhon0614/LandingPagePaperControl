import { ErrorAplicacion } from "../errors/app-error.js";

const numero = (valor) => Number(valor ?? 0);

function presentarTurno(fila) {
  return {
    id: fila.id,
    abiertoPor: fila.abierto_por,
    ...(fila.abierto_por_nombre ? { abiertoPorNombre: fila.abierto_por_nombre } : {}),
    cerradoPor: fila.cerrado_por,
    ...(fila.cerrado_por_nombre ? { cerradoPorNombre: fila.cerrado_por_nombre } : {}),
    montoInicial: numero(fila.monto_apertura),
    abiertoEn: fila.abierto_en,
    montoEsperado: fila.efectivo_esperado == null ? null : numero(fila.efectivo_esperado),
    montoContado: fila.efectivo_contado == null ? null : numero(fila.efectivo_contado),
    diferencia: fila.diferencia == null ? null : numero(fila.diferencia),
    cerradoEn: fila.cerrado_en,
    estado: fila.estado,
    notasCierre: fila.notas_cierre,
  };
}

function presentarGasto(fila) {
  return {
    id: fila.id,
    turnoId: fila.turno_caja_id,
    usuarioId: fila.registrado_por,
    ...(fila.usuario_nombres ? { usuario: `${fila.usuario_nombres} ${fila.usuario_apellidos}`.trim() } : {}),
    descripcion: fila.descripcion,
    monto: numero(fila.monto),
    ocurridoEn: fila.ocurrido_en,
    creadoEn: fila.creado_en,
  };
}

function presentarResumen(fila) {
  const montoInicial = numero(fila.monto_apertura);
  const efectivo = numero(fila.efectivo);
  const totalGastos = numero(fila.total_gastos);
  return {
    montoInicial,
    totalVentas: numero(fila.total_ventas),
    ventasPorMetodo: {
      EFECTIVO: efectivo,
      TARJETA: numero(fila.tarjeta),
      TRANSFERENCIA: numero(fila.transferencia),
    },
    totalGastos,
    montoEsperadoEfectivo: montoInicial + efectivo - totalGastos,
  };
}

export class ServicioTurnoCaja {
  constructor(modelo) { this.modelo = modelo; }

  async obtenerAbierto() {
    const turno = await this.modelo.buscarAbierto();
    if (!turno) throw new ErrorAplicacion("No hay un turno de caja abierto.", 404, "TURNO_CAJA_NO_ABIERTO");
    return turno;
  }

  async abrir(montoInicial, usuarioId) {
    const resultado = await this.modelo.abrir({ montoInicial, usuarioId });
    if (resultado.existente) throw new ErrorAplicacion("Ya hay un turno de caja abierto.", 409, "TURNO_CAJA_YA_ABIERTO");
    return presentarTurno(resultado.creado);
  }

  async actual() { return presentarTurno(await this.obtenerAbierto()); }

  async resumen() {
    const turno = await this.obtenerAbierto();
    return presentarResumen(await this.modelo.obtenerResumen(turno.id));
  }

  async gastos() {
    const turno = await this.obtenerAbierto();
    return (await this.modelo.listarGastos(turno.id)).map(presentarGasto);
  }

  async registrarGasto(datos, usuarioId) {
    const turno = await this.obtenerAbierto();
    return presentarGasto(await this.modelo.crearGasto({
      turnoId: turno.id, usuarioId,
      descripcion: datos.descripcion.trim(), monto: datos.monto,
    }));
  }

  async eliminarGasto(id, usuario) {
    const gastoId = Number(id);
    if (!Number.isInteger(gastoId) || gastoId <= 0) throw new ErrorAplicacion("El ID del gasto es inválido.", 400, "ID_GASTO_INVALIDO");
    const gasto = await this.modelo.buscarGasto(gastoId);
    if (!gasto) throw new ErrorAplicacion("El gasto no fue encontrado.", 404, "GASTO_NO_ENCONTRADO");
    const turno = await this.obtenerAbierto();
    if (gasto.turno_caja_id !== turno.id) throw new ErrorAplicacion("No se puede eliminar un gasto de un turno cerrado.", 409, "GASTO_TURNO_CERRADO");
    if (gasto.registrado_por !== usuario.id && !["ADMINISTRADOR", "DUENO"].includes(usuario.rol)) {
      throw new ErrorAplicacion("No tienes permiso para eliminar este gasto.", 403, "ACCESO_DENEGADO");
    }
    await this.modelo.eliminarGasto(gastoId);
  }

  async cerrar(montoContado, usuarioId) {
    const turno = await this.obtenerAbierto();
    const resultado = await this.modelo.cerrar({ turnoId: turno.id, usuarioId, montoContado });
    if (!resultado) throw new ErrorAplicacion("El turno de caja ya fue cerrado.", 409, "TURNO_CAJA_YA_CERRADO");
    const resumen = presentarResumen(resultado.resumen);
    const cerrado = presentarTurno(resultado.turno);
    return {
      turnoId: cerrado.id,
      montoInicial: resumen.montoInicial,
      totalVentas: resumen.totalVentas,
      ventasPorMetodo: resumen.ventasPorMetodo,
      totalGastos: resumen.totalGastos,
      montoEsperado: resumen.montoEsperadoEfectivo,
      montoContado: cerrado.montoContado,
      diferencia: cerrado.diferencia,
      cerradoEn: cerrado.cerradoEn,
      cerradoPor: cerrado.cerradoPor,
    };
  }

  async historial(filtros) {
    const patronFecha = /^\d{4}-\d{2}-\d{2}$/;
    const desde = filtros.desde?.trim() || undefined;
    const hasta = filtros.hasta?.trim() || undefined;
    if ((desde && !patronFecha.test(desde)) || (hasta && !patronFecha.test(hasta))) {
      throw new ErrorAplicacion(
        "Las fechas deben usar el formato AAAA-MM-DD.",
        400,
        "RANGO_FECHAS_INVALIDO",
      );
    }
    if (desde && hasta && desde > hasta) {
      throw new ErrorAplicacion(
        "La fecha desde no puede ser posterior a la fecha hasta.",
        400,
        "RANGO_FECHAS_INVALIDO",
      );
    }
    return (await this.modelo.listar({ desde, hasta })).map(presentarTurno);
  }
}
