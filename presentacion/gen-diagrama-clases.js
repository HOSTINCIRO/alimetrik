/* ALIMETRIK — Diagrama de clases UML y modelo relacional de la base de datos.
 * Genera dos PNG de alta resolución en ALIMETRIK-entrega/base-de-datos/diagramas/.
 * Las coordenadas son fijas a propósito: así cada conector, rombo y multiplicidad
 * queda exactamente donde debe y nunca se monta sobre una caja. */
const sharp = require("sharp");
const fs = require("fs");

const OUT = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/base-de-datos/diagramas";
const W = 2410, H = 1650;
const F = "Helvetica, Arial, sans-serif";
const C = {
  titulo: "#2E2A7A", sub: "#5B5A75", cabBg: "#ECE8FC", cabTx: "#2E2A7A", borde: "#7466CF",
  txt: "#2B2B3A", met: "#4B3FB0", mut: "#6B6B80", linea: "#34344A", sep: "#D9D4F5",
  pkBg: "#F7D774", pkTx: "#5C4300", fkBg: "#D3E4FF", fkTx: "#1F4E99", ukBg: "#DDF2E3", ukTx: "#1E6B3A",
  notaBg: "#F7F5FF",
};
const X = [50, 660, 1270, 1880], BW = 480;   // 4 columnas de 480 px, canales de 130 px
const YA = 150, YB = 640;                     // filas A y B

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* Anchos de Helvetica (métricas AFM de Adobe, por 1000 em) para medir el texto
 * y detectar automáticamente cualquier texto que se salga de su caja. */
const AFM = {
  r: " 278!278\"355#556$556%889&667'191(333)333*389+584,278-333.278/278:278;278<584=584>584?556@1015[278\\278]278^469_556`333{334|260}334~584",
  b: " 278!333\"474#556$556%889&722'238(333)333*389+584,278-333.278/278:333;333<584=584>584?611@975[333\\278]333^584_556`333{389|280}389~584",
};
const MAY = { r: [667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611],
              b: [722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611] };
const MIN = { r: [556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500],
              b: [556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500] };
const SIMB = {};
for (const k of ["r", "b"]) {
  SIMB[k] = {};
  const t = AFM[k];
  for (let i = 0; i < t.length; ) { const ch = t[i]; let j = i + 1; while (j < t.length && /\d/.test(t[j])) j++; SIMB[k][ch] = +t.slice(i + 1, j); i = j; }
}
const BASE = { "á":"a","é":"e","í":"i","ó":"o","ú":"u","ñ":"n","Á":"A","É":"E","Í":"I","Ó":"O","Ú":"U","Ñ":"N","ü":"u" };
function anchoTexto(s, size, bold) {
  const k = bold ? "b" : "r";
  let w = 0;
  for (let ch of String(s)) {
    ch = BASE[ch] || ch;
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) w += MAY[k][c - 65];
    else if (c >= 97 && c <= 122) w += MIN[k][c - 97];
    else if (c >= 48 && c <= 57) w += 556;
    else if (SIMB[k][ch] !== undefined) w += SIMB[k][ch];
    else if (ch === "—") w += 1000;
    else if (ch === "«" || ch === "»") w += 556;
    else if (ch === "·") w += 278;
    else w += 820;                          // ◇ ◆ ◁ ▸ ▾ ▴ ⇢ ∞ (fuente de respaldo)
  }
  return w * size / 1000 * 1.03;            // 3 % de margen de seguridad
}
const avisos = [];
function envolverTexto(txt, size, ancho) {
  const lineas = []; let actual = "";
  for (const p of txt.split(" ")) {
    const prueba = actual ? actual + " " + p : p;
    if (anchoTexto(prueba, size, false) > ancho && actual) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}
function cabe(txt, x, size, bold, limite, donde) {
  const fin = x + anchoTexto(txt, size, bold);
  if (fin > limite) avisos.push(`${donde}: "${txt}" se sale ${Math.ceil(fin - limite)} px`);
}

function T(x, y, s, o = {}) {
  const size = o.size || 20, peso = o.weight || "normal", fill = o.fill || C.txt;
  const anc = o.anchor || "start", cur = o.italic ? ' font-style="italic"' : "";
  let fondo = "";
  if (o.bg) {
    const tw = anchoTexto(s, size, peso === "bold");
    const bx = anc === "middle" ? x - tw / 2 : (anc === "end" ? x - tw : x);
    fondo = `<rect x="${(bx - 5).toFixed(1)}" y="${(y - size * 0.86).toFixed(1)}" width="${(tw + 10).toFixed(1)}" height="${(size * 1.18).toFixed(1)}" fill="${o.bg}" rx="4"/>`;
  }
  return fondo + `<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" font-weight="${peso}"${cur} fill="${fill}" text-anchor="${anc}">${esc(s)}</text>`;
}

function insignia(x, yBase, k) {
  const m = { PK: [C.pkBg, C.pkTx], FK: [C.fkBg, C.fkTx], UQ: [C.ukBg, C.ukTx] }[k];
  if (!m) return "";
  return `<rect x="${x}" y="${yBase - 21}" width="46" height="27" rx="6" fill="${m[0]}"/>` +
         T(x + 23, yBase - 1, k, { size: 18, weight: "bold", fill: m[1], anchor: "middle" });
}

/* ---------------- caja de CLASE (diagrama UML) ---------------- */
const LH = 30, FS = 20;
function clase(d) {
  const w = d.w || BW;
  const hdr = d.sub ? 78 : 56;
  const lineasA = (d.attrs || []).reduce((n, a) => n + 1 + (a.length - 2), 0);
  const hA = d.attrs ? 14 + lineasA * LH + 8 : 0;
  const hM = d.metodos ? 14 + d.metodos.length * LH + 8 : 0;
  const h = hdr + hA + hM;
  const { x, y } = d;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#FFFFFF" stroke="${C.borde}" stroke-width="2.5" filter="url(#sombra)"/>`;
  s += `<path d="M ${x + 1.25} ${y + hdr} L ${x + 1.25} ${y + 10} Q ${x + 1.25} ${y + 1.25} ${x + 10} ${y + 1.25} L ${x + w - 10} ${y + 1.25} Q ${x + w - 1.25} ${y + 1.25} ${x + w - 1.25} ${y + 10} L ${x + w - 1.25} ${y + hdr} Z" fill="${C.cabBg}"/>`;
  s += `<line x1="${x}" y1="${y + hdr}" x2="${x + w}" y2="${y + hdr}" stroke="${C.borde}" stroke-width="2"/>`;
  s += T(x + w / 2, y + 36, d.titulo, { size: 25, weight: "bold", fill: C.cabTx, anchor: "middle", italic: d.abstracta });
  if (d.sub) s += T(x + w / 2, y + 66, d.sub, { size: 19, fill: C.sub, anchor: "middle", italic: true });
  cabe(d.titulo, x + w / 2 - anchoTexto(d.titulo, 25, true) / 2, 25, true, x + w - 10, d.titulo);
  let yy = y + hdr;
  if (d.attrs) {
    yy += 14;
    d.attrs.forEach(a => {
      const [k, txt, ...cont] = a;
      const base = yy + 22;
      s += insignia(x + 14, base, k);
      s += T(x + 68, base, txt, { size: FS });
      cabe(txt, x + 68, FS, false, x + w - 12, d.titulo);
      yy += LH;
      cont.forEach(c => { s += T(x + 84, yy + 22, c, { size: FS, fill: C.mut }); cabe(c, x + 84, FS, false, x + w - 12, d.titulo); yy += LH; });
    });
    yy += 8;
  }
  if (d.metodos) {
    if (d.attrs) s += `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="${C.sep}" stroke-width="2"/>`;
    yy += 14;
    d.metodos.forEach(m => { s += T(x + 18, yy + 22, "+ " + m, { size: FS, fill: C.met }); cabe("+ " + m, x + 18, FS, false, x + w - 12, d.titulo); yy += LH; });
  }
  return { svg: s, x, y, w, h, r: x + w, b: y + h, cx: x + w / 2, cy: y + h / 2 };
}

/* ---------------- caja de TABLA (modelo relacional) ---------------- */
function tabla(d) {
  const w = d.w || BW, hdr = 56, LT = 31;
  const h = hdr + 12 + d.cols.length * LT + 10;
  const { x, y } = d;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#FFFFFF" stroke="${C.borde}" stroke-width="2.5" filter="url(#sombra)"/>`;
  s += `<path d="M ${x + 1.25} ${y + hdr} L ${x + 1.25} ${y + 10} Q ${x + 1.25} ${y + 1.25} ${x + 10} ${y + 1.25} L ${x + w - 10} ${y + 1.25} Q ${x + w - 1.25} ${y + 1.25} ${x + w - 1.25} ${y + 10} L ${x + w - 1.25} ${y + hdr} Z" fill="${C.titulo}"/>`;
  s += T(x + w / 2, y + 37, d.titulo, { size: 25, weight: "bold", fill: "#FFFFFF", anchor: "middle" });
  d.cols.forEach((c, i) => {
    const [k, nombre, tipo, nulo] = c;
    const base = y + hdr + 12 + i * LT + 22;
    s += insignia(x + 14, base, k);
    s += T(x + 68, base, nombre, { size: FS, weight: k === "PK" ? "bold" : "normal" });
    const tt = tipo + (nulo ? "  · " + (nulo === true ? "nulo" : nulo) : "");
    s += T(x + w - 16, base, tt, { size: 20, fill: C.mut, anchor: "end" });
    cabe(nombre, x + 68, FS, k === "PK", x + w - 16 - anchoTexto(tt, 20, false) - 12, d.titulo);
    if (i < d.cols.length - 1)
      s += `<line x1="${x + 12}" y1="${base + 9}" x2="${x + w - 12}" y2="${base + 9}" stroke="#F0EDFB" stroke-width="1.5"/>`;
  });
  return { svg: s, x, y, w, h, r: x + w, b: y + h, cx: x + w / 2, cy: y + h / 2 };
}

/* ---------------- conectores y terminaciones ---------------- */
const P = (p) => p.map(v => v.toFixed(1)).join(",");
const unidad = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return [dx / L, dy / L]; };
const mas = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
const normal = d => [-d[1], d[0]];

function terminacion(tipo, p, d) {        // d apunta desde la caja hacia afuera, a lo largo de la línea
  const n = normal(d);
  if (tipo === "rombo" || tipo === "romboLleno") {
    const L = 36, A = 12;
    const pts = [p, mas(mas(p, d, L / 2), n, A), mas(p, d, L), mas(mas(p, d, L / 2), n, -A)];
    return { svg: `<polygon points="${pts.map(P).join(" ")}" fill="${tipo === "romboLleno" ? C.linea : "#FFFFFF"}" stroke="${C.linea}" stroke-width="2.6" stroke-linejoin="round"/>`, recorte: L };
  }
  if (tipo === "triangulo") {
    const L = 30, A = 17;
    const pts = [p, mas(mas(p, d, L), n, A), mas(mas(p, d, L), n, -A)];
    return { svg: `<polygon points="${pts.map(P).join(" ")}" fill="#FFFFFF" stroke="${C.linea}" stroke-width="2.6" stroke-linejoin="round"/>`, recorte: L };
  }
  if (tipo === "flecha") {
    const L = 24, A = 12;
    return { svg: `<polyline points="${[mas(mas(p, d, L), n, A), p, mas(mas(p, d, L), n, -A)].map(P).join(" ")}" fill="none" stroke="${C.linea}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`, recorte: 0 };
  }
  /* pata de gallo: || uno y solo uno, o| cero o uno, |< uno o muchos, o< cero o muchos */
  const barra = k => { const q = mas(p, d, k); return `<line x1="${P(mas(q, n, 14)).split(",")[0]}" y1="${mas(q, n, 14)[1]}" x2="${mas(q, n, -14)[0]}" y2="${mas(q, n, -14)[1]}" stroke="${C.linea}" stroke-width="2.6"/>`; };
  const circulo = k => { const q = mas(p, d, k); return `<circle cx="${q[0]}" cy="${q[1]}" r="8.5" fill="#FFFFFF" stroke="${C.linea}" stroke-width="2.6"/>`; };
  const pata = () => { const q = mas(p, d, 26); return [mas(p, n, 15), p, mas(p, n, -15)].map(e => `<line x1="${q[0]}" y1="${q[1]}" x2="${e[0]}" y2="${e[1]}" stroke="${C.linea}" stroke-width="2.6"/>`).join(""); };
  if (tipo === "||") return { svg: barra(10) + barra(20), recorte: 0 };
  if (tipo === "o|") return { svg: barra(12) + circulo(32), recorte: 0 };
  if (tipo === "|<") return { svg: pata() + barra(34), recorte: 0 };
  if (tipo === "o<") return { svg: pata() + circulo(42), recorte: 0 };
  return { svg: "", recorte: 0 };
}

function conector(pts, o = {}) {
  const pp = pts.map(p => p.slice());
  let deco = "";
  if (o.ini) { const d = unidad(pp[0], pp[1]); const t = terminacion(o.ini, pp[0], d); deco += t.svg; pp[0] = mas(pp[0], d, t.recorte); }
  if (o.fin) { const n = pp.length; const d = unidad(pp[n - 1], pp[n - 2]); const t = terminacion(o.fin, pp[n - 1], d); deco += t.svg; pp[n - 1] = mas(pp[n - 1], d, t.recorte); }
  const raya = o.punteada ? ' stroke-dasharray="13 9"' : "";
  return `<polyline points="${pp.map(P).join(" ")}" fill="none" stroke="${C.linea}" stroke-width="2.6"${raya} stroke-linejoin="round"/>` + deco;
}

/* ---------------- recuadros de leyenda ---------------- */
function recuadro(x, y, w, h, titulo) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.notaBg}" stroke="${C.borde}" stroke-width="2"/>` +
         `<rect x="${x}" y="${y}" width="${w}" height="50" rx="10" fill="${C.titulo}"/>` +
         `<rect x="${x}" y="${y + 38}" width="${w}" height="12" fill="${C.titulo}"/>` +
         T(x + w / 2, y + 33, titulo, { size: 21, weight: "bold", fill: "#FFFFFF", anchor: "middle" });
}

function envolver(cuerpo, alto = H) {
  const H = alto;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><filter id="sombra" x="-5%" y="-5%" width="110%" height="115%">
    <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#2E2A7A" flood-opacity="0.13"/></filter></defs>
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="18" fill="none" stroke="${C.sep}" stroke-width="3"/>
  ${cuerpo}</svg>`;
}

/* =====================================================================
 * 1. DIAGRAMA DE CLASES UML
 * ===================================================================== */
function diagramaClases() {
  let s = T(W / 2, 70, "DIAGRAMA DE CLASES UML — BASE DE DATOS ALIMETRIK", { size: 46, weight: "bold", fill: C.titulo, anchor: "middle" });
  s += T(W / 2, 112, "Sistema de comedor escolar con huella dactilar (PAE) · ESP32-P4 + lector DigitalPersona U.are.U 4500", { size: 22, fill: C.sub, anchor: "middle" });

  const grados = clase({ x: X[0], y: YA, titulo: "GRADOS",
    attrs: [["PK", "id_grado : int"], ["", "nombre_grado : varchar(10)"]],
    metodos: ["crear() : void", "actualizar() : void"] });
  const grupos = clase({ x: X[1], y: YA, titulo: "GRUPOS",
    attrs: [["PK", "id_grupo : int"], ["FK", "id_grado : int"], ["", "nombre_grupo : varchar(11)"]],
    metodos: ["crear() : void", "actualizar() : void"] });
  const tipo = clase({ x: X[2], y: YA, titulo: "TIPO_ALIMENTO",
    attrs: [["PK", "id_tipo : int"], ["", "nombre : varchar(23)"], ["", "hora_inicio : time"], ["", "hora_fin : time"], ["", "activo : boolean"]],
    metodos: ["crear() : void", "actualizar() : void", "estaEnHorario(hora : time) : boolean"] });
  const alertas = clase({ x: X[3], y: YA, titulo: "ALERTAS",
    attrs: [["PK", "id_alerta : int"], ["FK", "id_asistencia : int"],
            ["", "tipo : enum(duplicado, desconocido,", "no_autorizado, sin_servicio)"],
            ["", "descripcion : varchar(120)"], ["", "fecha_hora : datetime"]],
    metodos: ["generar() : void"] });
  const est = clase({ x: X[1], y: YB, titulo: "ESTUDIANTES",
    attrs: [["PK", "id_estudiante : int"], ["FK", "id_grupo : int"], ["UQ", "documento : varchar(23)"],
            ["", "nombre : varchar(39)"], ["", "apellido : varchar(39)"], ["", "activo : boolean"],
            ["", "autorizacion : boolean"], ["", "acudiente : varchar(59)"], ["", "doc_acudiente : varchar(23)"],
            ["", "fecha_autoriza : date"]],
    metodos: ["registrar() : void", "actualizar() : void", "revocarAutorizacion() : void", "inactivar() : void"] });
  const asis = clase({ x: X[2], y: YB, titulo: "ASISTENCIAS",
    attrs: [["PK", "id_asistencia : int"], ["FK", "id_estudiante : int"], ["FK", "id_tipo : int"],
            ["", "fecha : date"], ["", "hora : time"],
            ["", "resultado : enum(permitido, duplicado,", "no_autorizado, desconocido,", "sin_servicio)"],
            ["", "score : smallint"]],
    metodos: ["registrar() : void", "yaEntregadoHoy() : boolean"] });
  const usu = clase({ x: X[3], y: YB, titulo: "USUARIOS", sub: "{abstracta}", abstracta: true,
    attrs: [["PK", "id_usuario : int"], ["UQ", "usuario : varchar(23)"], ["", "nombre : varchar(47)"],
            ["", "sal : binary(8)"], ["", "hash_clave : binary(32)"], ["", "rol : enum(administrador, operador)"],
            ["", "activo : boolean"]],
    metodos: ["iniciarSesion() : boolean", "cerrarSesion() : void", "cambiarClave() : void"] });
  const bio = clase({ x: X[1], y: est.b + 110, titulo: "BIOMETRÍA",
    attrs: [["PK", "id_huella : int"], ["FK", "id_estudiante : int"], ["", "dedo : varchar(23)"],
            ["", "plantilla : blob"], ["", "num_minucias : smallint"]],
    metodos: ["enrolar() : void", "identificar() : ESTUDIANTES", "eliminar() : void"] });
  const yS = usu.b + 100;
  const admin = clase({ x: 1680, y: yS, w: 330, titulo: "ADMINISTRADOR", sub: "Coordinación del PAE",
    metodos: ["gestionarEstudiantes() : void", "enrolarHuellas() : void", "configurarServicios() : void", "gestionarUsuarios() : void"] });
  const oper = clase({ x: 2030, y: yS, w: 330, titulo: "OPERADOR", sub: "Entrega en el comedor",
    metodos: ["operarKiosco() : void", "consultarRegistros() : void"] });

  let L = "";
  const BG = "#FFFFFF";
  // 1. Agregación: GRADOS ◇— GRUPOS
  const yGG = YA + 100;
  L += conector([[grados.r, yGG], [grupos.x, yGG]], { ini: "rombo" });
  L += T(595, yGG - 13, "agrupa →", { size: 19, anchor: "middle", italic: true, bg: BG });
  L += T(572, yGG + 30, "1", { size: 20, weight: "bold" });
  L += T(652, yGG + 30, "1..*", { size: 20, weight: "bold", anchor: "end" });
  // 2. Agregación: GRUPOS ◇— ESTUDIANTES
  L += conector([[grupos.cx, grupos.b], [est.cx, est.y]], { ini: "rombo" });
  L += T(grupos.cx + 14, (grupos.b + est.y) / 2 + 22, "contiene ↓", { size: 19, italic: true, bg: BG });
  L += T(grupos.cx - 12, grupos.b + 60, "1", { size: 20, weight: "bold", anchor: "end" });
  L += T(grupos.cx - 12, est.y - 12, "0..*", { size: 20, weight: "bold", anchor: "end" });
  // 3. Composición: ESTUDIANTES ◆— BIOMETRÍA
  L += conector([[est.cx, est.b], [bio.cx, bio.y]], { ini: "romboLleno" });
  L += T(est.cx + 14, est.b + 70, "posee ↓", { size: 19, italic: true, bg: BG });
  L += T(est.cx - 12, est.b + 58, "1", { size: 20, weight: "bold", anchor: "end" });
  L += T(est.cx - 12, bio.y - 12, "0..*", { size: 20, weight: "bold", anchor: "end" });
  // 4. Asociación: ESTUDIANTES — ASISTENCIAS
  const yEA = YB + 70;
  L += conector([[est.r, yEA], [asis.x, yEA]]);
  L += T(1205, yEA - 13, "recibe →", { size: 19, anchor: "middle", italic: true, bg: BG });
  L += T(est.r + 8, yEA + 30, "0..1", { size: 20, weight: "bold" });
  L += T(asis.x - 8, yEA + 30, "0..*", { size: 20, weight: "bold", anchor: "end" });
  // 5. Asociación: TIPO_ALIMENTO — ASISTENCIAS
  L += conector([[tipo.cx, tipo.b], [asis.cx, asis.y]]);
  L += T(tipo.cx + 14, (tipo.b + asis.y) / 2 + 8, "corresponde a ↑", { size: 19, italic: true, bg: BG });
  L += T(tipo.cx - 12, tipo.b + 30, "0..1", { size: 20, weight: "bold", anchor: "end" });
  L += T(tipo.cx - 12, asis.y - 12, "0..*", { size: 20, weight: "bold", anchor: "end" });
  // 6. Asociación: ASISTENCIAS — ALERTAS
  const xA1 = asis.r - 30, xA2 = alertas.x + 80, yAL = (alertas.b + asis.y) / 2 + 4;
  L += conector([[xA1, asis.y], [xA1, yAL], [xA2, yAL], [xA2, alertas.b]]);
  L += T((xA1 + xA2) / 2, yAL - 13, "genera →", { size: 19, anchor: "middle", italic: true, bg: BG });
  L += T(xA1 + 10, asis.y - 10, "1", { size: 20, weight: "bold" });
  L += T(xA2 + 10, alertas.b + 30, "0..1", { size: 20, weight: "bold" });
  // 7. Dependencia: USUARIOS ---> ALERTAS «consulta»
  const xUA = alertas.r - 110;
  L += conector([[xUA, usu.y], [xUA, alertas.b]], { fin: "flecha", punteada: true });
  L += T(xUA + 12, (usu.y + alertas.b) / 2 + 8, "«consulta»", { size: 19, italic: true, bg: BG });
  // 8. Dependencia: USUARIOS ---> ASISTENCIAS «consulta»
  const yUA = YB + 270;
  L += conector([[usu.x, yUA], [asis.r, yUA]], { fin: "flecha", punteada: true });
  L += T(1815, yUA - 13, "«consulta»", { size: 19, anchor: "middle", italic: true, bg: BG });
  // 9. Dependencia: ASISTENCIAS ---> BIOMETRÍA «usa»
  const yAB = asis.b - 60;
  L += conector([[asis.x, yAB], [1205, yAB], [1205, bio.cy], [bio.r, bio.cy]], { fin: "flecha", punteada: true });
  L += T(1213, asis.b + 48, "«usa»", { size: 19, italic: true, bg: BG });
  // 10. Herencia: ADMINISTRADOR / OPERADOR —▷ USUARIOS
  const yBus = usu.b + 62;
  L += conector([[usu.cx, usu.b], [usu.cx, yBus]], { ini: "triangulo" });
  L += conector([[admin.cx, yBus], [oper.cx, yBus]]);
  L += conector([[admin.cx, yBus], [admin.cx, admin.y]]);
  L += conector([[oper.cx, yBus], [oper.cx, oper.y]]);

  // ---- leyenda: simbología (columna izquierda, bajo GRADOS) ----
  const lx = X[0], lw = BW, ly = grados.b + 40;
  let g = recuadro(lx, ly, lw, 452, "SIMBOLOGÍA");
  const filas = [
    ["linea", "Asociación"], ["rombo", "Agregación"], ["romboLleno", "Composición"],
    ["triangulo", "Herencia (generalización)"], ["flecha", "Dependencia"],
    ["PK", "Llave primaria"], ["FK", "Llave foránea"], ["UQ", "Valor único (no se repite)"],
    ["abs", "Clase abstracta: cursiva + {abstracta}"], ["mas", "Método público"], ["lee", "Sentido en que se lee la relación"],
  ];
  filas.forEach((f, i) => {
    const yy = ly + 88 + i * 33.5, x1 = lx + 26, x2 = lx + 116;
    if (["linea", "rombo", "romboLleno", "triangulo", "flecha"].includes(f[0])) {
      const o = { linea: {}, rombo: { fin: "rombo" }, romboLleno: { fin: "romboLleno" }, triangulo: { fin: "triangulo" }, flecha: { fin: "flecha", punteada: true } }[f[0]];
      g += conector([[x1, yy - 7], [x2, yy - 7]], o);
    } else if (["PK", "FK", "UQ"].includes(f[0])) {
      g += insignia(x1 + 25, yy, f[0]);
    } else if (f[0] === "abs") {
      g += T(x1 + 45, yy, "Clase", { size: 19, italic: true, weight: "bold", anchor: "middle", fill: C.cabTx });
    } else if (f[0] === "mas") {
      g += T(x1 + 45, yy, "+ m()", { size: 19, anchor: "middle", fill: C.met });
    } else {
      g += T(x1 + 45, yy, "→ ↓ ↑", { size: 19, anchor: "middle" });
    }
    g += T(lx + 140, yy, f[1], { size: 19 });
    cabe(f[1], lx + 140, 19, false, lx + lw - 12, "SIMBOLOGÍA");
  });

  // ---- leyenda: multiplicidad ----
  const my = ly + 452 + 24;
  g += recuadro(lx, my, lw, 252, "MULTIPLICIDAD");
  [["1", "Exactamente uno"], ["0..1", "Cero o uno (opcional)"], ["0..*", "Cero o muchos"],
   ["1..*", "Uno o muchos"], ["*", "Muchos (algunos textos usan ∞)"]].forEach((m, i) => {
    const yy = my + 82 + i * 36;
    g += T(lx + 60, yy, m[0], { size: 21, weight: "bold", anchor: "middle", fill: C.titulo });
    g += T(lx + 120, yy, m[1], { size: 19 });
    cabe(m[1], lx + 120, 19, false, lx + lw - 12, "MULTIPLICIDAD");
  });

  // ---- resumen: las 5 interacciones UML ----
  const ry = my + 252 + 24, rh = bio.b - ry;
  g += recuadro(lx, ry, lw, rh, "LAS 5 INTERACCIONES UML");
  [["Asociación", "ESTUDIANTES — ASISTENCIAS", "0..1 a 0..*"],
   ["Agregación", "GRADOS ◇ GRUPOS ◇ ESTUDIANTES", "1 a 1..*  ·  1 a 0..*"],
   ["Composición", "ESTUDIANTES ◆ BIOMETRÍA", "1 a 0..*"],
   ["Herencia", "USUARIOS ◁ ADMINISTRADOR, OPERADOR", "generalización"],
   ["Dependencia", "ASISTENCIAS ⇢ BIOMETRÍA", "«usa»"]].forEach((r, i) => {
    const yy = ry + 80 + i * 64;
    g += T(lx + 22, yy, r[0], { size: 20, weight: "bold", fill: C.titulo });
    g += T(lx + lw - 22, yy, r[2], { size: 19, fill: C.sub, anchor: "end" });
    g += T(lx + 22, yy + 28, r[1], { size: 19 });
    cabe(r[1], lx + 22, 19, false, lx + lw - 14, "5 INTERACCIONES");
  });
  if (ry + 80 + 4 * 64 + 28 + 20 > ry + rh) avisos.push("5 INTERACCIONES: el contenido no cabe en el alto del recuadro");

  // ---- nota: cómo fluyen los datos (columna 3, bajo ASISTENCIAS) ----
  const nx = X[2], ny = asis.b + 92, nw = 380, nh = bio.b - ny;
  g += recuadro(nx, ny, nw, nh, "CÓMO FLUYEN LOS DATOS");
  let ty = ny + 82;
  [["1", "El estudiante pone el dedo y BIOMETRÍA lo identifica."],
   ["2", "La hora define el TIPO_ALIMENTO vigente."],
   ["3", "Se guarda la ASISTENCIA con su resultado."],
   ["4", "Si fue repetida, sin autorización, desconocida o fuera de horario, se genera una ALERTA."],
   ["5", "Los USUARIOS consultan asistencias y alertas."]].forEach(([n, txt]) => {
    g += `<circle cx="${nx + 32}" cy="${ty - 8}" r="15" fill="${C.titulo}"/>` + T(nx + 32, ty - 1, n, { size: 18, weight: "bold", fill: "#FFFFFF", anchor: "middle" });
    envolverTexto(txt, 19, nw - 80).forEach((ln, i) => { g += T(nx + 58, ty + i * 26, ln, { size: 19 }); });
    ty += envolverTexto(txt, 19, nw - 80).length * 26 + 14;
  });
  if (ty - 16 > ny + nh - 10) avisos.push(`CÓMO FLUYEN LOS DATOS: el texto se sale ${Math.ceil(ty - 16 - (ny + nh - 10))} px por abajo`);

  return envolver(s + L + grados.svg + grupos.svg + tipo.svg + alertas.svg + est.svg + asis.svg +
                  usu.svg + bio.svg + admin.svg + oper.svg + g);
}

/* =====================================================================
 * 2. MODELO RELACIONAL (tablas, llaves y conectores de pata de gallo)
 * ===================================================================== */
function modeloRelacional() {
  let s = T(W / 2, 70, "MODELO RELACIONAL — BASE DE DATOS ALIMETRIK", { size: 46, weight: "bold", fill: C.titulo, anchor: "middle" });
  s += T(W / 2, 112, "Tablas, llaves primarias y foráneas, y cardinalidad en notación de pata de gallo", { size: 22, fill: C.sub, anchor: "middle" });

  const grados = tabla({ x: X[0], y: YA, titulo: "grados",
    cols: [["PK", "id_grado", "INT"], ["", "nombre_grado", "VARCHAR(10)"]] });
  const grupos = tabla({ x: X[1], y: YA, titulo: "grupos",
    cols: [["PK", "id_grupo", "INT"], ["FK", "id_grado", "INT"], ["", "nombre_grupo", "VARCHAR(11)"]] });
  const tipo = tabla({ x: X[2], y: YA, titulo: "tipo_alimento",
    cols: [["PK", "id_tipo", "INT"], ["", "nombre", "VARCHAR(23)"], ["", "hora_inicio", "TIME"], ["", "hora_fin", "TIME"], ["", "activo", "BOOLEAN"]] });
  const alertas = tabla({ x: X[3], y: YA, titulo: "alertas",
    cols: [["PK", "id_alerta", "INT"], ["FK", "id_asistencia", "INT", "único"], ["", "tipo", "ENUM"],
           ["", "descripcion", "VARCHAR(120)"], ["", "fecha_hora", "DATETIME"]] });
  const est = tabla({ x: X[1], y: YB, titulo: "estudiantes",
    cols: [["PK", "id_estudiante", "INT"], ["FK", "id_grupo", "INT"], ["UQ", "documento", "VARCHAR(23)"],
           ["", "nombre", "VARCHAR(39)"], ["", "apellido", "VARCHAR(39)"], ["", "activo", "BOOLEAN"],
           ["", "autorizacion", "BOOLEAN"], ["", "acudiente", "VARCHAR(59)"], ["", "doc_acudiente", "VARCHAR(23)"],
           ["", "fecha_autoriza", "DATE"]] });
  const asis = tabla({ x: X[2], y: YB, titulo: "asistencias",
    cols: [["PK", "id_asistencia", "INT"], ["FK", "id_estudiante", "INT", true], ["FK", "id_tipo", "INT", true],
           ["", "fecha", "DATE"], ["", "hora", "TIME"], ["", "resultado", "ENUM"], ["", "score", "SMALLINT"]] });
  const usu = tabla({ x: X[3], y: YB, titulo: "usuarios",
    cols: [["PK", "id_usuario", "INT"], ["UQ", "usuario", "VARCHAR(23)"], ["", "nombre", "VARCHAR(47)"],
           ["", "sal", "BINARY(8)"], ["", "hash_clave", "BINARY(32)"], ["", "rol", "ENUM"], ["", "activo", "BOOLEAN"]] });
  const bio = tabla({ x: X[1], y: est.b + 110, titulo: "biometria",
    cols: [["PK", "id_huella", "INT"], ["FK", "id_estudiante", "INT"], ["", "dedo", "VARCHAR(23)"],
           ["", "plantilla", "BLOB"], ["", "num_minucias", "SMALLINT"]] });

  let L = "";
  const BG = "#FFFFFF";
  const fila = (t, i) => t.y + 56 + 12 + i * 31 + 14;   // altura (centro) de la fila i de una tabla
  // grados 1 ── 1..* grupos
  const y1 = fila(grupos, 1);
  L += conector([[grados.r, fila(grados, 0)], [595, fila(grados, 0)], [595, y1], [grupos.x, y1]], { ini: "||", fin: "|<" });
  L += T(595, y1 + 40, "id_grado", { size: 20, anchor: "middle", fill: C.sub, bg: BG });
  // grupos 1 ── 0..* estudiantes
  L += conector([[grupos.cx, grupos.b], [est.cx, est.y]], { ini: "||", fin: "o<" });
  L += T(grupos.cx + 16, (grupos.b + est.y) / 2 + 6, "id_grupo", { size: 20, fill: C.sub, bg: BG });
  // estudiantes 1 ── 0..* biometria
  L += conector([[est.cx, est.b], [bio.cx, bio.y]], { ini: "||", fin: "o<" });
  L += T(est.cx + 16, (est.b + bio.y) / 2 + 6, "id_estudiante", { size: 20, fill: C.sub, bg: BG });
  // estudiantes 0..1 ── 0..* asistencias
  const y2 = fila(asis, 1);
  L += conector([[est.r, fila(est, 0)], [1205, fila(est, 0)], [1205, y2], [asis.x, y2]], { ini: "o|", fin: "o<" });
  L += T(1205, y2 + 44, "id_estudiante", { size: 20, anchor: "middle", fill: C.sub, bg: BG });
  // tipo_alimento 0..1 ── 0..* asistencias
  L += conector([[tipo.cx, tipo.b], [asis.cx, asis.y]], { ini: "o|", fin: "o<" });
  L += T(tipo.cx + 16, (tipo.b + asis.y) / 2 + 6, "id_tipo", { size: 20, fill: C.sub, bg: BG });
  // asistencias 1 ── 0..1 alertas
  const xA1 = asis.r - 50, xA2 = alertas.x + 80, yAL = (alertas.b + asis.y) / 2;
  L += conector([[xA1, asis.y], [xA1, yAL], [xA2, yAL], [xA2, alertas.b]], { ini: "||", fin: "o|" });
  L += T((xA1 + xA2) / 2, yAL - 14, "id_asistencia", { size: 20, anchor: "middle", fill: C.sub, bg: BG });

  // ---- nota sobre usuarios ----
  let g = `<rect x="${usu.x}" y="${usu.b + 34}" width="${BW}" height="150" rx="10" fill="${C.notaBg}" stroke="${C.sep}" stroke-width="2"/>`;
  ["La tabla usuarios no tiene llaves foráneas:", "los encargados consultan asistencias y", "alertas, pero no son dueños de esos datos.", "La herencia se guarda en una sola tabla (rol)."]
    .forEach((t, i) => { g += T(usu.x + 22, usu.b + 72 + i * 30, t, { size: 19, fill: C.sub }); });

  // ---- leyenda pata de gallo ----
  const lx = X[0], ly = YB;
  g += recuadro(lx, ly, BW, 330, "CARDINALIDAD");
  [["||", "Uno y solo uno"], ["o|", "Cero o uno"], ["|<", "Uno o muchos"], ["o<", "Cero o muchos"]].forEach((f, i) => {
    const yy = ly + 104 + i * 66;
    g += conector([[lx + 40, yy], [lx + 150, yy]], { fin: f[0] });
    g += T(lx + 180, yy + 7, f[1], { size: 20 });
  });
  g += recuadro(lx, ly + 364, BW, 290, "LLAVES");
  [["PK", "Llave primaria (identifica la fila)"], ["FK", "Llave foránea (apunta a otra tabla)"], ["UQ", "Valor único"]].forEach((k, i) => {
    const yy = ly + 364 + 98 + i * 50;
    g += insignia(lx + 30, yy, k[0]);
    g += T(lx + 90, yy, k[1], { size: 19 });
  });
  g += T(lx + 30, ly + 364 + 238, "· nulo = la llave foránea puede quedar vacía", { size: 19, fill: C.sub });
  g += T(lx + 30, ly + 364 + 266, "· único = no se repite en la tabla", { size: 19, fill: C.sub });
  g += T(lx + 30, ly + 364 + 294, "· ENUM = lista de valores fijos (ver diccionario)", { size: 19, fill: C.sub });

  return envolver(s + L + grados.svg + grupos.svg + tipo.svg + alertas.svg + est.svg + asis.svg + usu.svg + bio.svg + g,
                  Math.max(bio.b, ly + 364 + 290) + 60);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [nombre, svg] of [["diagrama-de-clases-uml", diagramaClases()], ["modelo-relacional", modeloRelacional()]]) {
    fs.writeFileSync(`${OUT}/${nombre}.svg`, svg);
    await sharp(Buffer.from(svg), { density: 108 }).png().toFile(`${OUT}/${nombre}.png`);
    const m = await sharp(`${OUT}/${nombre}.png`).metadata();
    console.log(`OK ${nombre}.png  ${m.width}x${m.height}`);
  }
  console.log(avisos.length ? "AVISOS DE DESBORDE:\n  " + avisos.join("\n  ") : "Sin desbordes de texto.");
})();
