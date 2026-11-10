const MARCA = "062F3D";
const TEAL = "05788A";
const TEAL_CLARO = "F1FAFB";
const BORDE = "CFE9EE";
const AZUL = "0080B0";
const VERDE_AGUA = "26A99A";
const VERDE = "7AD080";
const ROJO = "DC2626";
const GRIS = "64748B";
const TEXTO = "1E293B";

function rgb(hex) {
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
    ];
}

function fechaCalendario(texto) {
    if (!texto) return "";
    const [anio, mes, dia] = String(texto).slice(0, 10).split("-");
    return `${dia}/${mes}/${anio}`;
}

function pesos(valor) {
    const numero = Number(valor || 0);
    const texto = `$${Math.abs(numero).toLocaleString("es-CO")}`;

    return numero < 0 ? `-${texto}` : texto;
}

// Gastos se muestran con signo menos, salvo cuando son cero.
function gastos(valor) {
    return Number(valor || 0) > 0 ? `-${pesos(valor)}` : pesos(0);
}

function metodo(obj, clave) {
    return Number(obj?.[clave] || 0);
}

function nombreArchivo(filtros, extension) {
    return `reporte-caja_${filtros.desde}_a_${filtros.hasta}.${extension}`;
}

function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
}

const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#${AZUL}"/>
      <stop offset="60%" stop-color="#${VERDE_AGUA}"/>
      <stop offset="100%" stop-color="#${VERDE}"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="52" fill="#ffffff"/>
  <g transform="translate(-22.5,-20.6) scale(0.95)" fill="none"
     stroke="url(#g)" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
    <g transform="translate(50,50)">
      <path d="M 40,20 L 110,20 A 15,15 0 0 1 125,35 L 125,130 A 15,15 0 0 1 110,145 L 40,145 A 15,15 0 0 1 25,130 L 25,35 A 15,15 0 0 1 40,20 Z"/>
      <circle cx="135" cy="135" r="28"/>
      <line x1="155" y1="155" x2="175" y2="175"/>
    </g>
  </g>
</svg>`;

async function crearLogoPNG() {
    try {
        const imagen = new Image();
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`;

        await new Promise((resolver, rechazar) => {
            imagen.onload = resolver;
            imagen.onerror = rechazar;
            imagen.src = url;
        });

        const lienzo = document.createElement("canvas");
        lienzo.width = 240;
        lienzo.height = 240;
        lienzo.getContext("2d").drawImage(imagen, 0, 0, 240, 240);

        return lienzo.toDataURL("image/png");
    } catch {
        return null;
    }
}


/* =========================================================
    EXCEL
========================================================= */

export async function exportarReporteCajaExcel(reporte, filtros) {

    const [{ default: ExcelJS }, logo] = await Promise.all([
        import("exceljs"),
        crearLogoPNG(),
    ]);

    const libro = new ExcelJS.Workbook();
    libro.creator = "PaperControl";
    libro.created = new Date();

    const FILA_ENCABEZADO = 11;
    const PRIMERA_FILA = FILA_ENCABEZADO + 1;

    const hoja = libro.addWorksheet("Reporte de caja", {
        views: [{ state: "frozen", ySplit: FILA_ENCABEZADO, showGridLines: false }],
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    hoja.columns = [
        { width: 18 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 18 },
        { width: 16 },
        { width: 18 },
    ];

    const formatoPesos = '"$"#,##0';
    const resumen = reporte.resumen || {};
    const relleno = (hex) => ({ type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } });
    const borde = (hex) => ({ style: "thin", color: { argb: `FF${hex}` } });

    hoja.getRow(1).height = 54;

    for (let c = 1; c <= 7; c++) {
        hoja.getCell(1, c).fill = relleno(MARCA);
    }

    if (logo) {
        const idLogo = libro.addImage({ base64: logo, extension: "png" });
        hoja.addImage(idLogo, {
            tl: { col: 0.12, row: 0.12 },
            ext: { width: 52, height: 52 },
        });
    }

    hoja.mergeCells("B1:D1");
    hoja.getCell("B1").value = {
        richText: [
            { text: "PaperControl\n", font: { bold: true, size: 18, color: { argb: "FFFFFFFF" } } },
            { text: "inventario y ventas", font: { size: 10, color: { argb: "FF9FD6DF" } } },
        ],
    };
    hoja.getCell("B1").alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };

    hoja.mergeCells("E1:G1");
    hoja.getCell("E1").value = {
        richText: [
            { text: "REPORTE DE CAJA\n", font: { bold: true, size: 13, color: { argb: "FFFFFFFF" } } },
            { text: `Generado: ${new Date().toLocaleString("es-CO")}`, font: { size: 9, color: { argb: "FF9FD6DF" } } },
        ],
    };
    hoja.getCell("E1").alignment = { vertical: "middle", horizontal: "right", wrapText: true, indent: 1 };

    hoja.getRow(2).height = 5;
    [AZUL, AZUL, VERDE_AGUA, VERDE_AGUA, VERDE_AGUA, VERDE, VERDE].forEach((color, i) => {
        hoja.getCell(2, i + 1).fill = relleno(color);
    });

    hoja.getRow(3).height = 10;

    const filtrosFilas = [
        ["Período", `${fechaCalendario(filtros.desde)} al ${fechaCalendario(filtros.hasta)}`],
        ["Vendedor", filtros.vendedor || "Todos"],
        ["Días con actividad", (reporte.dias || []).length],
    ];

    filtrosFilas.forEach(([etiqueta, valor], i) => {
        const fila = 4 + i;
        hoja.getCell(`A${fila}`).value = etiqueta;
        hoja.getCell(`A${fila}`).font = { bold: true, color: { argb: `FF${TEAL}` } };
        hoja.mergeCells(`B${fila}:D${fila}`);
        hoja.getCell(`B${fila}`).value = valor;
        hoja.getCell(`B${fila}`).font = { bold: true, color: { argb: `FF${TEXTO}` } };
        hoja.getCell(`B${fila}`).alignment = { horizontal: "left" };
    });

    hoja.getRow(7).height = 10;
    hoja.getRow(8).height = 20;
    hoja.getRow(9).height = 30;

    const tarjetas = [
        ["Total ventas", resumen.totalVentas],
        ["Efectivo", metodo(resumen.ventasPorMetodo, "efectivo")],
        ["Tarjeta", metodo(resumen.ventasPorMetodo, "tarjeta")],
        ["Transferencia", metodo(resumen.ventasPorMetodo, "transferencia")],
        ["Gastos", -Number(resumen.totalGastos || 0)],
        ["Flujo neto", resumen.flujoNeto],
    ];

    hoja.getCell("A8").value = "Resumen";
    hoja.getCell("A8").font = { bold: true, size: 12, color: { argb: `FF${MARCA}` } };
    hoja.getCell("A8").alignment = { vertical: "middle" };

    tarjetas.forEach(([etiqueta, valor], i) => {
        const col = i + 2;
        const destacada = etiqueta === "Flujo neto";

        const celdaEtiqueta = hoja.getCell(8, col);
        celdaEtiqueta.value = etiqueta;
        celdaEtiqueta.font = { size: 9, color: { argb: destacada ? "FFFFFFFF" : `FF${GRIS}` } };
        celdaEtiqueta.fill = relleno(destacada ? TEAL : TEAL_CLARO);
        celdaEtiqueta.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        celdaEtiqueta.border = { top: borde(BORDE), left: borde(BORDE), right: borde(BORDE) };

        const celdaValor = hoja.getCell(9, col);
        celdaValor.value = Number(valor || 0);
        celdaValor.numFmt = formatoPesos;
        celdaValor.font = {
            bold: true,
            size: 13,
            color: { argb: destacada ? "FFFFFFFF" : etiqueta === "Gastos" ? `FF${ROJO}` : `FF${TEAL}` },
        };
        celdaValor.fill = relleno(destacada ? TEAL : TEAL_CLARO);
        celdaValor.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        celdaValor.border = { bottom: borde(BORDE), left: borde(BORDE), right: borde(BORDE) };
    });

    hoja.getRow(10).height = 12;

    // ---- Tabla diaria ----
    hoja.getRow(FILA_ENCABEZADO).height = 24;

    [
        "Fecha",
        "Total ventas",
        "Efectivo",
        "Tarjeta",
        "Transferencia",
        "Gastos",
        "Flujo neto",
    ].forEach((texto, i) => {
        const celda = hoja.getCell(FILA_ENCABEZADO, i + 1);
        celda.value = texto;
        celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
        celda.fill = relleno(TEAL);
        celda.alignment = { horizontal: i === 0 ? "left" : "right", vertical: "middle", indent: 1 };
    });

    const dias = reporte.dias || [];

    dias.forEach((dia, indice) => {
        const filaNumero = PRIMERA_FILA + indice;
        const fila = hoja.getRow(filaNumero);
        fila.height = 20;

        fila.getCell(1).value = fechaCalendario(dia.fecha);
        fila.getCell(2).value = Number(dia.totalVentas || 0);
        fila.getCell(3).value = metodo(dia.ventasPorMetodo, "efectivo");
        fila.getCell(4).value = metodo(dia.ventasPorMetodo, "tarjeta");
        fila.getCell(5).value = metodo(dia.ventasPorMetodo, "transferencia");
        fila.getCell(6).value = -Number(dia.totalGastos || 0);
        fila.getCell(7).value = Number(dia.flujoNeto || 0);

        for (let c = 1; c <= 7; c++) {
            const celda = fila.getCell(c);

            celda.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right", indent: 1 };
            celda.border = { bottom: borde("E2E8F0") };

            if (c > 1) celda.numFmt = formatoPesos;
            if (indice % 2 === 1) celda.fill = relleno("F8FAFC");
        }

        fila.getCell(6).font = { color: { argb: `FF${ROJO}` } };
        fila.getCell(7).font = { bold: true, color: { argb: `FF${MARCA}` } };
    });

    // ---- Totales (con fórmulas, para que Excel los recalcule) ----
    const filaTotal = hoja.getRow(PRIMERA_FILA + dias.length);
    filaTotal.height = 24;
    filaTotal.getCell(1).value = "TOTAL";

    if (dias.length > 0) {
        const ultima = PRIMERA_FILA + dias.length - 1;

        ["B", "C", "D", "E", "F", "G"].forEach((col, i) => {
            const celda = filaTotal.getCell(i + 2);
            celda.value = { formula: `SUM(${col}${PRIMERA_FILA}:${col}${ultima})` };
            celda.numFmt = formatoPesos;
        });
    }

    for (let c = 1; c <= 7; c++) {
        const celda = filaTotal.getCell(c);
        celda.font = { bold: true, color: { argb: `FF${MARCA}` } };
        celda.fill = relleno(TEAL_CLARO);
        celda.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right", indent: 1 };
        celda.border = { top: { style: "medium", color: { argb: `FF${TEAL}` } } };
    }

    // ---- Pie ----
    const filaPie = PRIMERA_FILA + dias.length + 2;
    hoja.mergeCells(`A${filaPie}:G${filaPie}`);
    hoja.getCell(`A${filaPie}`).value = "PaperControl · inventario y ventas";
    hoja.getCell(`A${filaPie}`).font = { size: 9, italic: true, color: { argb: "FF94A3B8" } };

    const buffer = await libro.xlsx.writeBuffer();

    descargar(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        nombreArchivo(filtros, "xlsx")
    );
}


/* =========================================================
    PDF
========================================================= */

export async function exportarReporteCajaPDF(reporte, filtros) {

    const [{ jsPDF }, { default: autoTable }, logo] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        crearLogoPNG(),
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const resumen = reporte.resumen || {};
    const margen = 40;

    const relleno = (hex) => doc.setFillColor(...rgb(hex));
    const trazo = (hex) => doc.setDrawColor(...rgb(hex));
    const color = (hex) => doc.setTextColor(...rgb(hex));

    relleno(MARCA);
    doc.rect(0, 0, ancho, 76, "F");

    const tercio = ancho / 3;
    relleno(AZUL);
    doc.rect(0, 76, tercio, 4, "F");
    relleno(VERDE_AGUA);
    doc.rect(tercio, 76, tercio, 4, "F");
    relleno(VERDE);
    doc.rect(tercio * 2, 76, tercio, 4, "F");

    if (logo) {
        doc.addImage(logo, "PNG", margen, 14, 48, 48);
    }

    color("FFFFFF");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PaperControl", margen + 60, 38);

    color("9FD6DF");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("inventario y ventas", margen + 60, 54);

    color("FFFFFF");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("REPORTE DE CAJA", ancho - margen, 36, { align: "right" });

    color("9FD6DF");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
        `Generado: ${new Date().toLocaleString("es-CO")}`,
        ancho - margen,
        52,
        { align: "right" }
    );

    // ---- Filtros ----
    const etiquetaValor = (etiqueta, valor, x) => {
        color(GRIS);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(etiqueta.toUpperCase(), x, 106);

        color(TEXTO);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(valor, x, 121);
    };

    etiquetaValor(
        "Período",
        `${fechaCalendario(filtros.desde)} al ${fechaCalendario(filtros.hasta)}`,
        margen
    );
    etiquetaValor("Vendedor", filtros.vendedor || "Todos", margen + 240);
    etiquetaValor("Días con actividad", String((reporte.dias || []).length), margen + 480);

    // ---- Tarjetas de resumen ----
    const tarjetas = [
        { etiqueta: "Total ventas", valor: pesos(resumen.totalVentas), acento: AZUL },
        { etiqueta: "Efectivo", valor: pesos(metodo(resumen.ventasPorMetodo, "efectivo")), acento: VERDE_AGUA },
        { etiqueta: "Tarjeta", valor: pesos(metodo(resumen.ventasPorMetodo, "tarjeta")), acento: VERDE_AGUA },
        { etiqueta: "Transferencia", valor: pesos(metodo(resumen.ventasPorMetodo, "transferencia")), acento: VERDE_AGUA },
        { etiqueta: "Gastos", valor: gastos(resumen.totalGastos), acento: ROJO, rojo: true },
        { etiqueta: "Flujo neto", valor: pesos(resumen.flujoNeto), acento: TEAL, destacada: true },
    ];

    const separacion = 8;
    const anchoTarjeta = (ancho - margen * 2 - separacion * 5) / 6;
    const yTarjeta = 138;
    const altoTarjeta = 52;

    tarjetas.forEach((t, i) => {
        const x = margen + i * (anchoTarjeta + separacion);

        if (t.destacada) {
            relleno(TEAL);
            trazo(TEAL);
        } else {
            relleno(TEAL_CLARO);
            trazo(BORDE);
        }

        doc.roundedRect(x, yTarjeta, anchoTarjeta, altoTarjeta, 6, 6, "FD");

        if (!t.destacada) {
            relleno(t.acento);
            doc.roundedRect(x, yTarjeta, 4, altoTarjeta, 2, 2, "F");
        }

        color(t.destacada ? "D6F1F6" : GRIS);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(t.etiqueta, x + 14, yTarjeta + 19);

        color(t.destacada ? "FFFFFF" : t.rojo ? ROJO : TEAL);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(t.valor, x + 14, yTarjeta + 39);
    });

    // ---- Tabla diaria ----
    const dias = reporte.dias || [];

    const filas = dias.map((dia) => [
        fechaCalendario(dia.fecha),
        pesos(dia.totalVentas),
        pesos(metodo(dia.ventasPorMetodo, "efectivo")),
        pesos(metodo(dia.ventasPorMetodo, "tarjeta")),
        pesos(metodo(dia.ventasPorMetodo, "transferencia")),
        gastos(dia.totalGastos),
        pesos(dia.flujoNeto),
    ]);

    autoTable(doc, {
        startY: yTarjeta + altoTarjeta + 22,
        margin: { left: margen, right: margen, top: 96, bottom: 44 },
        head: [[
            "Fecha",
            "Total ventas",
            "Efectivo",
            "Tarjeta",
            "Transferencia",
            "Gastos",
            "Flujo neto",
        ]],
        body: filas,
        foot: [[
            "TOTAL",
            pesos(resumen.totalVentas),
            pesos(metodo(resumen.ventasPorMetodo, "efectivo")),
            pesos(metodo(resumen.ventasPorMetodo, "tarjeta")),
            pesos(metodo(resumen.ventasPorMetodo, "transferencia")),
            gastos(resumen.totalGastos),
            pesos(resumen.flujoNeto),
        ]],
        showFoot: "lastPage",
        theme: "plain",
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
            textColor: rgb(TEXTO),
            halign: "right",
            lineColor: rgb("E2E8F0"),
            lineWidth: { bottom: 0.5 },
        },
        headStyles: {
            fillColor: rgb(TEAL),
            textColor: 255,
            fontStyle: "bold",
            lineWidth: 0,
        },
        footStyles: {
            fillColor: rgb(TEAL_CLARO),
            textColor: rgb(MARCA),
            fontStyle: "bold",
            lineWidth: { top: 1.2 },
            lineColor: rgb(TEAL),
        },
        alternateRowStyles: { fillColor: rgb("F8FAFC") },
        columnStyles: {
            0: { halign: "left" },
            5: { textColor: rgb(ROJO) },
            6: { fontStyle: "bold", textColor: rgb(MARCA) },
        },
        didParseCell: (datos) => {
            if (datos.column.index === 0) {
                datos.cell.styles.halign = "left";
            }
            // El pie conserva sus propios colores en gastos y flujo neto
            if (datos.section === "foot") {
                datos.cell.styles.textColor = rgb(datos.column.index === 5 ? ROJO : MARCA);
            }
        },
        // Banda reducida en las páginas siguientes
        didDrawPage: (datos) => {
            if (datos.pageNumber > 1) {
                relleno(MARCA);
                doc.rect(0, 0, ancho, 44, "F");
                relleno(VERDE_AGUA);
                doc.rect(0, 44, ancho, 3, "F");

                color("FFFFFF");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.text("PaperControl - Reporte de caja", margen, 28);
            }
        },
    });

    // ---- Pie de página ----
    const paginas = doc.getNumberOfPages();

    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);

        trazo("E2E8F0");
        doc.setLineWidth(0.5);
        doc.line(margen, alto - 32, ancho - margen, alto - 32);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        color("94A3B8");
        doc.text("PaperControl - inventario y ventas", margen, alto - 18);
        doc.text(`Página ${i} de ${paginas}`, ancho - margen, alto - 18, { align: "right" });
    }

    doc.save(nombreArchivo(filtros, "pdf"));
}