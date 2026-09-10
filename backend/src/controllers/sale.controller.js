import { generarComprobanteHtml } from "../services/receipt.service.js";
import { ErrorAplicacion } from "../errors/app-error.js";
import { listaPaginada } from "../utils/query.js";
// Traduce las solicitudes HTTP de ventas a llamadas del servicio; las reglas de
// inventario, permisos y caja permanecen fuera del controlador.
export class ControladorVenta {
  constructor(servicio) {
    this.servicio = servicio;
  }

  // Expone la configuración vigente para construir las opciones de cobro.
  metodosPago = async (_requerimiento, respuesta, siguiente) => {
    try {
      const metodosPago = await this.servicio.metodosPago();
      // El nombre coincide con el contrato consumido por ventas.service.js.
      return respuesta
        .status(200)
        .json({ exito: true, datos: { metodosPago } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Solo los responsables autorizados llegan aquí desde la ruta administrativa.
  actualizarMetodoPago = async (requerimiento, respuesta, siguiente) => {
    try {
      const metodoPago = await this.servicio.actualizarMetodoPago(
        requerimiento.params.id,
        requerimiento.body.estaActivo,
      );
      return respuesta.status(200).json({ exito: true, datos: { metodoPago } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Registra una venta usando el cuerpo validado y el usuario autenticado.
  crear = async (requerimiento, respuesta, siguiente) => {
    try {
      const venta = await this.servicio.crear(
        requerimiento.body,
        requerimiento.usuario.id,
        requerimiento.get?.("Idempotency-Key"),
      );
      return respuesta.status(201).json({ exito: true, datos: { venta } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Limita el listado al vendedor identificado por la sesión.
  propias = async (requerimiento, respuesta, siguiente) => {
    try {
      const ventas = await this.servicio.propias(
        requerimiento.usuario.id,
        requerimiento.query,
      );
      return respuesta
        .status(200)
        .json(listaPaginada("ventas", ventas, requerimiento.query));
    } catch (error) {
      return siguiente(error);
    }
  };

  // Entrega al servicio los filtros opcionales recibidos en la URL.
  historial = async (requerimiento, respuesta, siguiente) => {
    try {
      const ventas = await this.servicio.historial(requerimiento.query);
      return respuesta
        .status(200)
        .json(listaPaginada("ventas", ventas, requerimiento.query));
    } catch (error) {
      return siguiente(error);
    }
  };

  comprasCliente = async (req, res, next) => {
    try {
      const compras = await this.servicio.comprasCliente(
        req.params.id,
        req.query,
        req.usuario,
      );
      return res.json(listaPaginada("compras", compras, req.query));
    } catch (error) {
      return next(error);
    }
  };

  // El servicio comprueba si el usuario puede consultar la venta solicitada.
  comprobante = async (requerimiento, respuesta, siguiente) => {
    try {
      const formato = requerimiento.query?.formato ?? "json";
      const descargar = requerimiento.query?.descargar ?? "false";
      if (
        !["json", "html"].includes(formato) ||
        !["true", "false"].includes(descargar)
      )
        throw new ErrorAplicacion(
          "formato debe ser json o html; descargar debe ser true o false.",
          400,
          "FORMATO_COMPROBANTE_INVALIDO",
        );
      const comprobante = await this.servicio.comprobante(
        requerimiento.params.id,
        requerimiento.usuario,
      );
      if (descargar === "true")
        respuesta.attachment(`comprobante-${comprobante.id}.${formato}`);
      if (formato === "html") {
        respuesta.set(
          "Content-Security-Policy",
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox",
        );
        return respuesta
          .status(200)
          .type("html")
          .send(generarComprobanteHtml(comprobante));
      }
      return respuesta
        .status(200)
        .json({ exito: true, datos: { comprobante } });
    } catch (error) {
      return siguiente(error);
    }
  };

  // Solicita la anulación junto con el motivo y el responsable autenticado.
  anular = async (requerimiento, respuesta, siguiente) => {
    try {
      const venta = await this.servicio.anular(
        requerimiento.params.id,
        requerimiento.body,
        requerimiento.usuario,
      );
      return respuesta.status(200).json({ exito: true, datos: { venta } });
    } catch (error) {
      return siguiente(error);
    }
  };
}
