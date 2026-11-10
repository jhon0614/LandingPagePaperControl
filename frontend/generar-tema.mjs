/*
 * Genera frontend/src/styles/Tema.css (tema oscuro) a partir de los demás CSS.
 * Uso (desde la carpeta frontend):  node generar-tema.mjs
 * Vuelve a ejecutarlo cuando agregues o cambies colores en los CSS.
 */
import fs from "fs";
import path from "path";
import postcss from "postcss";

const DIR = path.resolve("src/styles");
const SALIDA = path.resolve("src/styles/Tema.css");

/* ---------- utilidades de color ---------- */
function parseHex(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}
const hex = (n) => Math.round(n).toString(16).padStart(2, "0");
function hslToHex(h, s, l) {
  h /= 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return `#${hex(f(0) * 255)}${hex(f(8) * 255)}${hex(f(4) * 255)}`;
}

/* matiz: azul-verdoso (marca) 160-215; rojo; ámbar; verde; resto neutro/azulado */
function familia({ h, s }) {
  if (s < 0.12) return "neutro";
  if (h >= 160 && h <= 215) return "marca";
  if (h < 20 || h >= 335) return "rojo";
  if (h >= 20 && h < 65) return "ambar";
  if (h >= 65 && h < 160) return "verde";
  if (h > 215 && h < 335) return "azul";
  return "neutro";
}

/* ----- fondos ----- */
function fondoOscuro(rgb) {
  const c = rgbToHsl(rgb);
  const fam = familia(c);
  if (c.l >= 0.80) {
    // fondos claros
    if (fam === "neutro" || fam === "azul") {
      if (c.l > 0.985) return "#10252e";          // blanco -> superficie
      if (c.l > 0.965) return "#0d1e26";          // casi blanco (f8fafc) -> fondo
      if (c.l > 0.93) return "#16313c";            // gris muy claro -> superficie 2
      return "#1c3a46";                             // gris claro
    }
    const tinte = { marca: "5,120,138", rojo: "229,72,77", ambar: "245,158,11", verde: "34,160,90" }[fam];
    return `rgba(${tinte},.18)`;
  }
  if (c.l >= 0.65 && (fam === "neutro" || fam === "azul")) return "#24434f"; // grises medios claros (barras, etc.)
  return null; // fondos oscuros/saturados: se mantienen (botones, sidebar)
}

/* ----- texto ----- */
function textoOscuro(rgb) {
  const c = rgbToHsl(rgb);
  const fam = familia(c);
  if (c.l <= 0.30) {                 // texto muy oscuro -> casi blanco
    if (fam === "rojo") return "#fca5a5";
    if (fam === "verde") return "#86efac";
    if (fam === "ambar") return "#fcd34d";
    if (fam === "marca" && c.s > 0.35) return "#7fd6e6";
    return "#e6f1f4";
  }
  if (c.l <= 0.52 && (fam === "neutro" || fam === "azul")) return "#b3c6cd"; // grises de texto (#475569, #64748b)
  if (c.l <= 0.52 && fam === "marca") return "#4fc3d6";                        // teal de marca como texto
  if (c.l <= 0.52 && fam === "rojo") return "#f87171";
  if (c.l <= 0.52 && fam === "verde") return "#4ade80";
  if (c.l <= 0.52 && fam === "ambar") return "#fbbf24";
  if (c.l > 0.52 && c.l <= 0.70 && (fam === "neutro" || fam === "azul")) return "#9db4bc"; // #94a3b8
  return null;
}

/* ----- bordes ----- */
function bordeOscuro(rgb) {
  const c = rgbToHsl(rgb);
  const fam = familia(c);
  if (c.l >= 0.78) {
    if (fam === "neutro" || fam === "azul") return "#2a4a56";
    if (fam === "marca") return "rgba(79,195,214,.35)";
    if (fam === "rojo") return "rgba(248,113,113,.4)";
    if (fam === "ambar") return "rgba(251,191,36,.4)";
    if (fam === "verde") return "rgba(74,222,128,.4)";
  }
  if (c.l >= 0.55 && (fam === "neutro" || fam === "azul")) return "#35606e";
  return null;
}

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const NOMBRES = { white: "#ffffff", "#fff": "#ffffff" };

function mapear(valor, fn) {
  let cambio = false;
  let v = valor.replace(/\bwhite\b/gi, "#ffffff");
  v = v.replace(HEX, (h) => {
    const r = fn(parseHex(h));
    if (r) { cambio = true; return r; }
    return h;
  });
  return cambio ? v : null;
}

function tipoProp(prop) {
  if (prop === "background" || prop === "background-color") return "fondo";
  if (prop === "color" || prop === "caret-color" || prop === "fill" || prop === "stroke" || prop === "text-decoration-color") return "texto";
  if (/^border(-(top|right|bottom|left))?(-color)?$/.test(prop) || prop === "outline" || prop === "outline-color") return "borde";
  return null;
}

/* ---------- recorrido ---------- */
const archivos = fs.readdirSync(DIR).filter((f) => f.endsWith(".css") && f !== "Tema.css").sort();
let salida = `/* =========================================================
   TEMA OSCURO
   Se activa con <html data-theme="dark">.
   Archivo generado a partir de los estilos de cada módulo:
   solo redefine fondos, textos y bordes. No toca el tamaño ni
   la distribución de nada.
   ========================================================= */

:root[data-theme="dark"] {
    color-scheme: dark;
}

[data-theme="dark"] body {
    background: #0b1a21;
    color: #e6f1f4;
}

`;
let total = 0;

function prefijar(sel) {
  return sel.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    if (/^(html|:root)\b/.test(s)) return null;
    if (/^body\b/.test(s)) return `[data-theme="dark"] ${s}`;
    return `[data-theme="dark"] ${s}`;
  }).filter(Boolean).join(",\n");
}

function procesarReglas(nodo, nivel = 0) {
  let out = "";
  nodo.each((n) => {
    if (n.type === "rule") {
      if (n.parent?.type === "atrule" && /keyframes/i.test(n.parent.name)) return;
      const decls = [];
      n.each((d) => {
        if (d.type !== "decl") return;
        const t = tipoProp(d.prop.toLowerCase());
        if (!t) return;
        if (/gradient|url\(/i.test(d.value) && t !== "fondo") return;
        const fn = t === "fondo" ? fondoOscuro : t === "texto" ? textoOscuro : bordeOscuro;
        const nv = mapear(d.value, fn);
        if (nv) decls.push(`${d.prop}: ${nv};`);
      });
      if (decls.length) {
        const sel = prefijar(n.selector);
        if (sel) { out += `${sel} {\n    ${decls.join("\n    ")}\n}\n\n`; total++; }
      }
    } else if (n.type === "atrule" && /^(media|supports|container)$/i.test(n.name)) {
      const dentro = procesarReglas(n, nivel + 1);
      if (dentro.trim()) out += `@${n.name} ${n.params} {\n${dentro.replace(/^/gm, "    ")}\n}\n\n`;
    }
  });
  return out;
}

for (const f of archivos) {
  const css = fs.readFileSync(path.join(DIR, f), "utf8");
  const root = postcss.parse(css, { from: f });
  const bloque = procesarReglas(root);
  if (bloque.trim()) salida += `/* ----- ${f} ----- */\n\n${bloque}`;
}

salida += `/* ----- Gráficas (recharts) ----- */

[data-theme="dark"] .recharts-text {
    fill: #9db4bc;
}

[data-theme="dark"] .recharts-cartesian-grid line {
    stroke: #24424d;
}

[data-theme="dark"] .recharts-label-list text,
[data-theme="dark"] .recharts-label-list .recharts-text {
    fill: #e6f1f4 !important;
}

[data-theme="dark"] .recharts-sector[fill="#062f3d"] {
    fill: #2f7f93;
}

[data-theme="dark"] .grafica-punto[style*="rgb(6, 47, 61)"] {
    background: #2f7f93 !important;
}

[data-theme="dark"] .recharts-tooltip-cursor {
    fill: rgba(79, 195, 214, .08);
    stroke: #4fc3d6;
}

/* ----- Campos y controles ----- */

[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
    color-scheme: dark;
}

[data-theme="dark"] ::placeholder {
    color: #7e97a0;
}
`;
fs.writeFileSync(SALIDA, salida);
console.log("reglas:", total, "líneas:", salida.split("\n").length);
