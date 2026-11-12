import { useState } from "react";

const LIMITE_PRODUCTOS = 5;

const NOMBRES_METODO = {
    EFECTIVO: "Efectivo",
    TARJETA: "Tarjeta",
    TRANSFERENCIA: "Transferencia",
};


function moneda(valor) {

    return `$${Number(valor || 0).toLocaleString("es-CO")}`;

}


function fechaHora(fecha) {

    if (!fecha) return "—";

    return new Date(fecha).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

}


/*
 * Comprobante de pago de una venta.
 * Props: comprobante = respuesta de GET /api/ventas/:id/comprobante
 */

function ComprobanteVenta({ comprobante }) {

    const [verTodos, setVerTodos] = useState(false);

    if (!comprobante) return null;

    const anulada = comprobante.estado === "ANULADA";

    const descuento = comprobante.descuento || {};

    const hayDescuento = Number(descuento.monto || 0) > 0;

    const textoDescuento =
        descuento.tipo === "PORCENTAJE" && descuento.valor
            ? `Descuento (${descuento.valor} %)`
            : "Descuento";

    const pagos = comprobante.pagos || [];

    const clienteNombre =
        comprobante.cliente?.nombre || "Consumidor final";


    return (

        <div className="comprobante">

            <div className="comprobante-cab">

                <div className="comprobante-marca">

                    <svg
                        width="46"
                        height="46"
                        viewBox="0 0 46 46"
                        fill="none"
                        aria-hidden="true"
                    >
                        <rect x="4" y="3" width="26" height="34" rx="5" stroke="#8fd3b6" strokeWidth="3" />
                        <circle cx="29" cy="30" r="9" stroke="#5fd3e6" strokeWidth="3" fill="#062f3d" />
                        <line x1="36" y1="37" x2="43" y2="44" stroke="#5fd3e6" strokeWidth="3.5" strokeLinecap="round" />
                    </svg>

                    <div>
                        <h1>PaperControl</h1>
                        <small>inventario y ventas</small>
                    </div>

                </div>

                <div className="comprobante-numero">
                    <span>Comprobante de pago</span>
                    <strong>{comprobante.numeroVenta}</strong>
                </div>

            </div>


            <div
                className={
                    anulada
                        ? "comprobante-banda comprobante-banda-anulada"
                        : "comprobante-banda"
                }
            >
                <span>{anulada ? "Venta anulada" : "Venta confirmada"}</span>
                <span>{fechaHora(comprobante.fecha)}</span>
            </div>


            <div className="comprobante-cuerpo">

                {anulada && (
                    <p className="comprobante-aviso-anulada">
                        <strong>Motivo:</strong>{" "}
                        {comprobante.motivoAnulacion || "Sin motivo registrado."}
                    </p>
                )}

                <div className="comprobante-datos">

                    <div>
                        <span>Cliente</span>
                        <b>{clienteNombre}</b>
                        {comprobante.cliente?.documento && (
                            <small>
                                {comprobante.cliente.tipoDocumento}{" "}
                                {comprobante.cliente.documento}
                            </small>
                        )}
                    </div>

                    <div>
                        <span>Vendedor</span>
                        <b>{comprobante.vendedor?.nombre || "—"}</b>
                    </div>

                </div>


                {(() => {

                    const productos = comprobante.productos || [];
                    const hayMuchos = productos.length > LIMITE_PRODUCTOS;

                    return (
                        <>
                            <table
                                className={
                                    hayMuchos && !verTodos
                                        ? "comprobante-tabla comprobante-colapsado"
                                        : "comprobante-tabla"
                                }
                            >

                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th className="d">Cant.</th>
                                        <th className="d">Precio</th>
                                        <th className="d">Total</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {productos.map((producto, indice) => (

                                        <tr
                                            key={producto.productoId}
                                            className={indice >= LIMITE_PRODUCTOS ? "comprobante-fila-extra" : undefined}
                                        >
                                            <td>{producto.nombre}</td>
                                            <td className="d">{producto.cantidad}</td>
                                            <td className="d">{moneda(producto.precioUnitario)}</td>
                                            <td className="d">{moneda(producto.total)}</td>
                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                            {hayMuchos && (
                                <button
                                    type="button"
                                    className="comprobante-ver-mas"
                                    onClick={() => setVerTodos((actual) => !actual)}
                                >
                                    <i className={verTodos ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"}></i>
                                    {verTodos
                                        ? " Ver menos"
                                        : ` Ver todos los productos (${productos.length})`}
                                </button>
                            )}
                        </>
                    );

                })()}


                <div className="comprobante-totales">

                    <div>
                        <span>Subtotal</span>
                        <span>{moneda(comprobante.subtotal)}</span>
                    </div>

                    {hayDescuento && (
                        <div className="comprobante-descuento">
                            <span>{textoDescuento}</span>
                            <span>-{moneda(descuento.monto)}</span>
                        </div>
                    )}

                    <div className="comprobante-final">
                        <span>Total</span>
                        <span>{moneda(comprobante.total)}</span>
                    </div>

                </div>


                {pagos.map((pago, indice) => (

                    <div className="comprobante-pago" key={`${pago.metodo}-${indice}`}>

                        <div>
                            <span>Método de pago</span>
                            <b>
                                {pago.nombre ||
                                    NOMBRES_METODO[pago.metodo] ||
                                    pago.metodo}
                            </b>
                        </div>

                        {pago.montoRecibido != null && (
                            <div>
                                <span>Monto recibido</span>
                                <b>{moneda(pago.montoRecibido)}</b>
                            </div>
                        )}

                        {pago.cambio != null && (
                            <div>
                                <span>Cambio</span>
                                <b>{moneda(pago.cambio)}</b>
                            </div>
                        )}

                        {pago.referencia && (
                            <div>
                                <span>Referencia</span>
                                <b>{pago.referencia}</b>
                            </div>
                        )}

                    </div>

                ))}

            </div>


            <div className="comprobante-pie">

                <strong>¡Gracias por tu compra!</strong>

                Conserva este comprobante como soporte de tu pago.

            </div>

        </div>

    );

}

export default ComprobanteVenta;