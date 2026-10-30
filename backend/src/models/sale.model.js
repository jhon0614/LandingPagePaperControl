import { ModeloMetodoPago } from "./sales/payment-method.model.js";
import { ConsultasVenta } from "./sales/sale-queries.js";
import { AnuladorVenta } from "./sales/sale-cancel.js";
import { CreadorVenta } from "./sales/sale-create.js";

// Mantiene una interfaz común para el servicio y delega cada operación
// al módulo de persistencia correspondiente.
export class ModeloVenta {
  constructor(conexiones) {
    this.conexiones = conexiones;
    // Todos los módulos utilizan el mismo grupo de conexiones.
    this.modeloMetodoPago = new ModeloMetodoPago(conexiones);
    this.consultasVenta = new ConsultasVenta(conexiones);
    this.anuladorVenta = new AnuladorVenta(conexiones);
    this.creadorVenta = new CreadorVenta(conexiones);
  }

  async listarMetodosPago() {
    return this.modeloMetodoPago.listarMetodosPago();
  }

  async actualizarMetodoPago(id, estaActivo) {
    return this.modeloMetodoPago.actualizarMetodoPago(id, estaActivo);
  }

  async crear(datos) {
    return this.creadorVenta.crear(datos);
  }

  async existeCliente(id) {
    return this.consultasVenta.existeCliente(id);
  }

  async comprasCliente(filtros) {
    return this.consultasVenta.comprasCliente(filtros);
  }

  async buscarPorVendedor(usuarioId, filtros = {}) {
    return this.consultasVenta.buscarPorVendedor(usuarioId, filtros);
  }

  async historial(filtros) {
    return this.consultasVenta.historial(filtros);
  }

  async comprobante(id) {
    return this.consultasVenta.comprobante(id);
  }

  async anular(datos) {
    return this.anuladorVenta.anular(datos);
  }
}
