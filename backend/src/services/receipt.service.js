const escapar = (valor) =>
  String(valor ?? "").replace(
    /[&<>"']/g,
    (caracter) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[caracter],
  );
const moneda = (valor) =>
  escapar(
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 2,
    }).format(valor ?? 0),
  );

export function generarComprobanteHtml(comprobante) {
  const c = comprobante;
  const fecha = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(c.fecha));
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comprobante ${escapar(c.numeroVenta)}</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;color:#17252b;max-width:850px;margin:40px auto;padding:0 24px}
h1{font-size:26px;margin-bottom:0}h2{font-size:18px}table{width:100%;border-collapse:collapse;margin:24px 0}
th,td{padding:10px 6px;border-bottom:1px solid #ddd;text-align:right;overflow-wrap:anywhere}
th:first-child,td:first-child{text-align:left}.totales{margin-left:auto;max-width:340px}
.totales p{display:flex;justify-content:space-between;gap:20px}.total{font-size:20px;font-weight:bold}
.anulada{border:2px solid #963636;padding:12px;color:#963636}small{color:#52636b}
@media print{body{margin:0;max-width:none}thead{display:table-header-group}tr{break-inside:avoid}}
</style></head><body>
<h1>PaperControl</h1><h2>Comprobante de venta ${escapar(c.numeroVenta)}</h2>
<p>Fecha: ${escapar(fecha)}<br>Vendedor: ${escapar(c.vendedor.nombre)}<br>
Cliente: ${escapar(c.cliente?.nombre || "Consumidor final")}${c.cliente ? `<br>Documento: ${escapar(c.cliente.tipoDocumento)} ${escapar(c.cliente.documento)}` : ""}</p>
${c.estado === "ANULADA" ? `<p class="anulada"><strong>VENTA ANULADA</strong><br>${escapar(c.motivoAnulacion || "Sin motivo registrado")}</p>` : ""}
<table><thead><tr><th>Producto / SKU</th><th>Cantidad</th><th>Precio unitario</th><th>Importe</th></tr></thead><tbody>
${c.productos.map((p) => `<tr><td>${escapar(p.nombre)}<br><small>${escapar(p.sku)}</small></td><td>${escapar(p.cantidad)}</td><td>${moneda(p.precioUnitario)}</td><td>${moneda(p.total)}</td></tr>`).join("\n")}
</tbody></table><div class="totales"><p><span>Subtotal</span><span>${moneda(c.subtotal)}</span></p>
<p><span>Descuento${c.descuento.tipo === "PORCENTAJE" ? ` (${escapar(c.descuento.valor)}%)` : ""}</span><span>−${moneda(c.descuento.monto)}</span></p>
<p><span>Impuesto</span><span>${moneda(c.impuesto)}</span></p>
<p class="total"><span>Total</span><span>${moneda(c.total)}</span></p></div>
<h2>Pagos</h2>${c.pagos.map((p) => `<p>${escapar(p.nombre || p.metodo)}: ${moneda(p.monto)}${p.referencia ? `<br>Referencia: ${escapar(p.referencia)}` : ""}${p.montoRecibido != null ? `<br>Recibido: ${moneda(p.montoRecibido)}` : ""}${p.cambio != null ? `<br>Cambio: ${moneda(p.cambio)}` : ""}</p>`).join("\n")}
<small>Conserva este comprobante para consultar tu compra.</small></body></html>`;
}
