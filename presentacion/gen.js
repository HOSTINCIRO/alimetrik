/* ALIMETRIK — presentación para grado 11: cómo funciona el sistema por dentro */
const pptxgen = require("pptxgenjs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");

// ---------- paleta (identidad ALIMETRIK) ----------
const BG = "0F1720", CARD = "17212B", CARD2 = "1E2B38", LINE = "263644";
const TXT = "E8EEF3", MUTED = "93A4B3";
const MINT = "20C997", MINTD = "12B886", AMBER = "F6C453", CORAL = "FF6B6B", BLUE = "58A6FF";
const F = "Arial";

// ---------- iconos ----------
async function icon(name, colorHex, size = 512) {
  const svg = renderToStaticMarkup(React.createElement(FA[name], { color: "#" + colorHex, size }));
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

// ---------- huella estilizada (SVG propio) ----------
async function huellaPNG(colorHex, strokeW = 7) {
  let paths = "";
  const cx = 200, cy = 300;
  for (let i = 0; i < 9; i++) {
    const rx = 26 + i * 19, ry = rx * 1.28;
    const dash = i % 3 === 1 ? `stroke-dasharray="${40 + i * 12} ${14 + i * 3}"` : (i % 3 === 2 ? `stroke-dasharray="${70 + i * 9} ${10}"` : "");
    paths += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#${colorHex}" stroke-width="${strokeW}" stroke-linecap="round" ${dash} opacity="${0.95 - i * 0.04}"/>`;
  }
  for (let i = 0; i < 4; i++) {
    const rx = 210 + i * 22;
    paths += `<path d="M ${cx - rx} ${cy + 120} A ${rx} ${rx * 1.25} 0 0 1 ${cx + rx} ${cy + 120}" fill="none" stroke="#${colorHex}" stroke-width="${strokeW}" stroke-linecap="round" stroke-dasharray="90 16" opacity="${0.5 - i * 0.09}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -20 520 700">${paths}</svg>`;
  const png = await sharp(Buffer.from(svg)).resize(900, 1160).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

// ---------- helpers de diapositiva ----------
let pageNum = 0;
function base(pres, titulo, kicker) {
  const s = pres.addSlide();
  s.background = { color: BG };
  pageNum++;
  if (kicker) s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.32, w: 11, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: MINT, charSpacing: 2, margin: 0 });
  if (titulo) s.addText(titulo, { x: 0.6, y: 0.58, w: 12.1, h: 0.75, fontFace: F, fontSize: 33, bold: true, color: TXT, margin: 0 });
  s.addText("ALIMETRIK · cómo funciona por dentro", { x: 0.6, y: 7.12, w: 5, h: 0.3, fontFace: F, fontSize: 9, color: MUTED, margin: 0 });
  s.addText(String(pageNum), { x: 12.6, y: 7.12, w: 0.5, h: 0.3, fontFace: F, fontSize: 9, color: MUTED, align: "right", margin: 0 });
  return s;
}
function card(s, x, y, w, h, fill = CARD) {
  s.addShape("roundRect", { x, y, w, h, rectRadius: 0.09, fill: { color: fill }, line: { color: LINE, width: 1 } });
}
function iconCircle(s, data, x, y, d = 0.62, circleColor = CARD2) {
  s.addShape("ellipse", { x, y, w: d, h: d, fill: { color: circleColor }, line: { color: LINE, width: 1 } });
  const pad = d * 0.22;
  s.addImage({ data, x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad });
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

  // pre-render de recursos
  const huellaMint = await huellaPNG(MINT);
  const huellaDim = await huellaPNG("2A4A44", 6);
  const ic = {};
  const lista = [
    ["FaFingerprint", MINT], ["FaMicrochip", MINT], ["FaMicrochip", BLUE], ["FaMobileAlt", MINT], ["FaWifi", MINT],
    ["FaDatabase", MINT], ["FaKey", AMBER], ["FaBug", CORAL], ["FaCheckCircle", MINT],
    ["FaExclamationTriangle", AMBER], ["FaIdCard", CORAL], ["FaUsers", AMBER], ["FaUtensils", MINT],
    ["FaRulerCombined", BLUE], ["FaGraduationCap", MINT], ["FaCode", MINT], ["FaSquareRootAlt", AMBER],
    ["FaSearch", BLUE], ["FaBolt", AMBER], ["FaLock", CORAL], ["FaUnlock", MINT],
    ["FaUsb", BLUE], ["FaVolumeUp", MINT], ["FaChalkboardTeacher", BLUE], ["FaBookOpen", AMBER],
    ["FaClock", CORAL], ["FaFlask", MINT],
  ];
  for (const [n, c] of lista) ic[n + "_" + c] = await icon(n, c);
  const I = (n, c) => ic[n + "_" + c];

  // ============ 1 · PORTADA ============
  {
    const s = pres.addSlide(); pageNum++;
    s.background = { color: BG };
    s.addImage({ data: huellaMint, x: 8.15, y: 0.7, w: 4.7, h: 6.1, transparency: 8 });
    s.addText("SISTEMA BIOMÉTRICO REAL · CHARLA PARA GRADO 11", { x: 0.7, y: 1.55, w: 7.2, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: MINT, charSpacing: 2, margin: 0 });
    s.addText("ALIMETRIK", { x: 0.7, y: 1.95, w: 7.4, h: 1.15, fontFace: F, fontSize: 66, bold: true, color: TXT, margin: 0 });
    s.addText("El comedor que te reconoce por tu huella", { x: 0.7, y: 3.15, w: 7.2, h: 0.55, fontFace: F, fontSize: 22, color: TXT, margin: 0 });
    s.addText([
      { text: "Cómo construimos —con un chip de $25 y mucho código— una máquina que ", options: {} },
      { text: "mira tu dedo, sabe quién eres y te entrega tu almuerzo", options: { bold: true, color: MINT } },
      { text: ". Sin carné, sin listas, sin trampa.", options: {} },
    ], { x: 0.7, y: 3.85, w: 6.9, h: 1.1, fontFace: F, fontSize: 15, color: MUTED, margin: 0 });
    card(s, 0.7, 5.35, 6.4, 1.05, CARD);
    s.addText([
      { text: "Hoy vas a ver:  ", options: { bold: true, color: TXT } },
      { text: "píxeles → matemáticas → geometría → almuerzo", options: { color: MINT, bold: true } },
    ], { x: 0.95, y: 5.35, w: 6.0, h: 1.05, fontFace: F, fontSize: 15, valign: "middle", margin: 0 });
    s.addNotes("Bienvenida. Pregunta inicial para el grupo: ¿cuántos han perdido el carné alguna vez? Hoy vamos a ver cómo se construye desde cero un sistema que usa el cuerpo como identificación, con el mismo tipo de tecnología de los bancos, pero hecho con un chip pequeño y económico.");
  }

  // ============ 2 · EL PROBLEMA ============
  {
    const s = base(pres, "El problema de todos los comedores", "1 · ¿por qué existe esto?");
    const probs = [
      ["FaIdCard", CORAL, "Carnés que se pierden o se prestan", "«Se me quedó en la casa, profe»"],
      ["FaUsers", AMBER, "Filas lentas y listas en papel", "Buscar un nombre entre 500 demora"],
      ["FaUtensils", MINT, "Dobles raciones", "¿Quién controla si alguien repite?"],
    ];
    let y = 1.7;
    for (const [n, c, t, d] of probs) {
      card(s, 0.6, y, 6.1, 1.28);
      iconCircle(s, I(n, c), 0.85, y + 0.33);
      s.addText(t, { x: 1.7, y: y + 0.18, w: 4.9, h: 0.45, fontFace: F, fontSize: 16, bold: true, color: TXT, margin: 0 });
      s.addText(d, { x: 1.7, y: y + 0.63, w: 4.9, h: 0.45, fontFace: F, fontSize: 13, color: MUTED, margin: 0 });
      y += 1.5;
    }
    card(s, 7.15, 1.7, 5.55, 4.5, CARD2);
    s.addImage({ data: I("FaFingerprint", MINT), x: 9.45, y: 2.15, w: 0.95, h: 0.95 });
    s.addText("La idea", { x: 7.45, y: 3.25, w: 4.95, h: 0.5, fontFace: F, fontSize: 22, bold: true, color: TXT, align: "center", margin: 0 });
    s.addText("Tu dedo ES tu carné", { x: 7.45, y: 3.75, w: 4.95, h: 0.55, fontFace: F, fontSize: 26, bold: true, color: MINT, align: "center", margin: 0 });
    s.addText("No se pierde, no se presta,\nno se puede falsificar fácil,\ny siempre lo llevas puesto.", { x: 7.45, y: 4.4, w: 4.95, h: 1.4, fontFace: F, fontSize: 15, color: MUTED, align: "center", margin: 0 });
    s.addNotes("Plantear los tres dolores clásicos. Cerrar con la idea: la biometría convierte algo que ERES en tu identificación. Preguntar: ¿qué otras cosas del cuerpo servirían? (cara, iris, voz...)");
  }

  // ============ 3 · EL HARDWARE ============
  {
    const s = base(pres, "Las tres piezas del sistema", "2 · el hardware");
    const items = [
      ["FaMicrochip", "El cerebro: ESP32-P4", "Un computador más pequeño que una galleta:\n2 procesadores a 360 MHz, 32 MB de RAM\ny 16 MB de memoria permanente.", "~ $25 USD"],
      ["FaFingerprint", "El ojo: lector U.are.U 4500", "El mismo tipo de lector que usan bancos\ny notarías. Toma una foto de 512 puntos\npor pulgada de tu dedo.", "USB"],
      ["FaMobileAlt", "La pantalla: tu celular", "La placa crea su propia red WiFi y sirve\nuna página web. Cualquier celular se\nconecta y ve todo en vivo.", "0 apps"],
    ];
    let x = 0.6;
    for (const [n, t, d, tag] of items) {
      card(s, x, 1.75, 3.95, 4.35);
      iconCircle(s, I(n, MINT), x + 1.55, 2.1, 0.85);
      s.addText(t, { x: x + 0.25, y: 3.15, w: 3.45, h: 0.75, fontFace: F, fontSize: 17, bold: true, color: TXT, align: "center", margin: 0 });
      s.addText(d, { x: x + 0.25, y: 3.9, w: 3.45, h: 1.45, fontFace: F, fontSize: 12.5, color: MUTED, align: "center", margin: 0 });
      s.addShape("roundRect", { x: x + 1.28, y: 5.42, w: 1.4, h: 0.42, rectRadius: 0.2, fill: { color: CARD2 }, line: { color: MINT, width: 1 } });
      s.addText(tag, { x: x + 1.28, y: 5.42, w: 1.4, h: 0.42, fontFace: F, fontSize: 13, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });
      x += 4.2;
    }
    s.addText("Sin internet, sin computador, sin nube: todo el sistema vive dentro del chip.", { x: 0.6, y: 6.4, w: 12.1, h: 0.4, fontFace: F, fontSize: 15, italic: true, color: MINT, align: "center", margin: 0 });
    s.addNotes("Enfatizar la escala: el 'servidor' completo cabe en la palma de la mano y cuesta menos que una salida al cine. Los mismos principios de un datacenter, en miniatura.");
  }

  // ============ 4 · PIXELES ============
  {
    const s = base(pres, "¿Cómo ve el computador tu huella?", "3 · de dedo a números");
    // rejilla de píxeles ilustrativa (patrón de crestas)
    const gx = 0.75, gy = 1.9, cell = 0.42, cols = 10, rows = 9;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = Math.round(128 + 120 * Math.sin((c + r * 0.7) * 0.72));
        const vv = Math.max(15, Math.min(240, v));
        const hex = vv.toString(16).padStart(2, "0").repeat(3);
        s.addShape("rect", { x: gx + c * cell, y: gy + r * cell, w: cell - 0.02, h: cell - 0.02, fill: { color: hex } });
        if ((r === 2 && c >= 3 && c <= 6)) {
          s.addText(String(vv), { x: gx + c * cell - 0.06, y: gy + r * cell, w: cell + 0.1, h: cell, fontFace: F, fontSize: 8.5, bold: true, color: vv > 128 ? "222222" : "EEEEEE", align: "center", valign: "middle", margin: 0 });
        }
      }
    }
    s.addText("↑ cada casilla es un píxel: un número de 0 (negro) a 255 (blanco)", { x: 0.75, y: gy + rows * cell + 0.12, w: 4.6, h: 0.55, fontFace: F, fontSize: 11.5, color: MUTED, margin: 0 });
    // texto derecha
    const tx = 5.9;
    card(s, tx, 1.9, 6.8, 2.5);
    s.addText([
      { text: "La foto del lector mide ", options: { color: TXT } },
      { text: "384 × 290 píxeles", options: { bold: true, color: MINT } },
      { text: " = ", options: { color: TXT } },
      { text: "111.360 números", options: { bold: true, color: MINT } },
      { text: ".\n\nLas crestas", options: { bold: true, color: TXT } },
      { text: " (las líneas en relieve de tu dedo) salen oscuras; los ", options: { color: TXT } },
      { text: "valles", options: { bold: true, color: TXT } },
      { text: ", claros. Para el chip, tu huella es solo una tabla gigante de números.", options: { color: TXT } },
    ], { x: tx + 0.3, y: 2.1, w: 6.2, h: 2.1, fontFace: F, fontSize: 15, margin: 0 });
    card(s, tx, 4.65, 6.8, 1.55, CARD2);
    s.addImage({ data: I("FaBolt", AMBER), x: tx + 0.35, y: 5.05, w: 0.7, h: 0.7 });
    s.addText([
      { text: "Dato: ", options: { bold: true, color: AMBER } },
      { text: "el chip captura y arma esa foto en medio segundo — 111.360 números organizados más rápido que un parpadeo.", options: { color: TXT } },
    ], { x: tx + 1.25, y: 4.85, w: 5.3, h: 1.15, fontFace: F, fontSize: 14, valign: "middle", margin: 0 });
    s.addNotes("Concepto clave: digitalización. Todo lo que un computador 've' son números. Conectar con la clase de informática: una imagen en escala de grises es una matriz. Los números de la fila resaltada son valores reales de brillo.");
  }

  // ============ 5 · PIPELINE ============
  {
    const s = base(pres, "El viaje de tu dedo (en 6 paradas)", "4 · el pipeline");
    const pasos = [
      ["FaFingerprint", MINT, "1 · Pones el dedo", "El sensor lo detecta\nal instante"],
      ["FaUsb", BLUE, "2 · Viaja por USB", "La foto llega al chip\n¡cifrada!"],
      ["FaUnlock", MINT, "3 · Se descifra", "Matemática XOR\ncon llave secreta"],
      ["FaSearch", BLUE, "4 · Minucias", "Se extraen 20-50\npuntos únicos"],
      ["FaRulerCombined", BLUE, "5 · Se compara", "Geometría contra\ntodos los enrolados"],
      ["FaCheckCircle", MINT, "6 · Veredicto", "Permitido, duplicado\no desconocido"],
    ];
    const w = 3.75, h = 1.95, gapx = 0.45, gapy = 0.5;
    const x0 = 0.75, y0 = 1.95;
    pasos.forEach(([n, c, t, d], i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = x0 + col * (w + gapx), y = y0 + row * (h + gapy);
      card(s, x, y, w, h);
      iconCircle(s, I(n, c), x + 0.22, y + 0.24, 0.58);
      s.addText(t, { x: x + 0.95, y: y + 0.22, w: w - 1.1, h: 0.42, fontFace: F, fontSize: 15.5, bold: true, color: TXT, margin: 0 });
      s.addText(d, { x: x + 0.95, y: y + 0.68, w: w - 1.1, h: 0.95, fontFace: F, fontSize: 12.5, color: MUTED, margin: 0 });
      if (i !== 2 && i !== 5) s.addText("→", { x: x + w - 0.05, y: y + h / 2 - 0.3, w: 0.55, h: 0.6, fontFace: F, fontSize: 26, bold: true, color: MINT, align: "center", valign: "middle", margin: 0 });
    });
    s.addText("Tu parte dura 1,5 segundos: pones el dedo, la pantalla dice «HUELLA LEÍDA, retira» — y el resto lo hace el chip solo.", { x: 0.75, y: 6.55, w: 12, h: 0.4, fontFace: F, fontSize: 14, italic: true, color: MINT, margin: 0 });
    s.addNotes("Recorrer las 6 paradas. Punto interesante: el paso 2 (la imagen viaja cifrada) sorprende — el fabricante cifra la imagen DENTRO del cable USB para que nadie la espíe. En las siguientes diapositivas profundizamos los pasos 3, 4 y 5.");
  }

  // ============ 6 · CIFRADO ============
  {
    const s = base(pres, "La imagen llega cifrada (como mensaje secreto)", "5 · paso 3: descifrar");
    // mini-grid cifrada
    const cell = 0.34;
    const drawGrid = (x0, y0, fn) => {
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
        const vv = fn(r, c);
        const hex = vv.toString(16).padStart(2, "0").repeat(3);
        s.addShape("rect", { x: x0 + c * cell, y: y0 + r * cell, w: cell - 0.02, h: cell - 0.02, fill: { color: hex } });
      }
    };
    let seed = 7;
    const rnd = () => { seed = (seed * 73 + 41) % 97; return 20 + Math.round(seed * 2.2); };
    drawGrid(0.9, 2.25, () => rnd());
    s.addText("así LLEGA\n(ruido puro)", { x: 0.82, y: 4.45, w: 2.2, h: 0.7, fontFace: F, fontSize: 12, color: CORAL, bold: true, align: "center", margin: 0 });
    iconCircle(s, I("FaKey", AMBER), 3.55, 2.95, 0.75, CARD2);
    s.addText("XOR con\nla llave", { x: 3.25, y: 3.75, w: 1.4, h: 0.6, fontFace: F, fontSize: 11.5, bold: true, color: AMBER, align: "center", margin: 0 });
    drawGrid(5.15, 2.25, (r, c) => Math.max(15, Math.min(240, Math.round(128 + 120 * Math.sin((c + r * 0.7) * 0.72)))));
    s.addText("así QUEDA\n(¡una huella!)", { x: 5.05, y: 4.45, w: 2.3, h: 0.7, fontFace: F, fontSize: 12, color: MINT, bold: true, align: "center", margin: 0 });
    // explicación
    card(s, 7.85, 1.95, 4.9, 4.35);
    s.addText("¿Por qué?", { x: 8.15, y: 2.15, w: 4.3, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: TXT, margin: 0 });
    s.addText("Para que nadie que 'pinche' el cable USB pueda robar huellas.", { x: 8.15, y: 2.55, w: 4.35, h: 0.7, fontFace: F, fontSize: 13.5, color: MUTED, margin: 0 });
    s.addText("¿Cómo funciona el XOR?", { x: 8.15, y: 3.35, w: 4.3, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: TXT, margin: 0 });
    s.addText([
      { text: "Es como sumarle a cada píxel un número secreto que solo tú sabes restar. ", options: { color: TXT } },
      { text: "El mismo truco dos veces te devuelve el original:\n", options: { color: TXT } },
      { text: "dato ⊕ llave ⊕ llave = dato", options: { bold: true, color: MINT, fontFace: "Courier New" } },
    ], { x: 8.15, y: 3.75, w: 4.35, h: 1.5, fontFace: F, fontSize: 13.5, margin: 0 });
    s.addText("La llave la genera una fórmula llamada LFSR: produce números que parecen aleatorios pero son repetibles.", { x: 8.15, y: 5.35, w: 4.35, h: 0.85, fontFace: F, fontSize: 12, italic: true, color: MUTED, margin: 0 });
    s.addNotes("Este es el gancho de criptografía. XOR es la operación más simple del cifrado y la base de sistemas reales. Demostración mental: 5 XOR 3 = 6, y 6 XOR 3 = 5 otra vez. El descifrado nos tomó días: si se pierde UN byte, todo lo que sigue queda revuelto.");
  }

  // ============ 7 · MINUCIAS ============
  {
    const s = base(pres, "Minucias: los puntos que te hacen único", "6 · paso 4: la firma escondida");
    s.addImage({ data: huellaMint, x: 0.85, y: 1.8, w: 3.6, h: 4.65, transparency: 25 });
    // puntos de minucias sobre la huella
    const term = [[2.1, 2.6], [3.5, 3.1], [1.7, 4.2], [3.9, 4.9], [2.5, 5.7]];
    const bif = [[2.9, 2.2], [1.5, 3.3], [3.3, 4.1], [2.2, 4.9]];
    for (const [x, y] of term) s.addShape("ellipse", { x, y, w: 0.22, h: 0.22, fill: { color: MINT }, line: { color: BG, width: 1.5 } });
    for (const [x, y] of bif) s.addShape("ellipse", { x, y, w: 0.22, h: 0.22, fill: { color: AMBER }, line: { color: BG, width: 1.5 } });
    // leyenda
    card(s, 5.0, 1.9, 3.4, 1.6);
    s.addShape("ellipse", { x: 5.3, y: 2.15, w: 0.2, h: 0.2, fill: { color: MINT } });
    s.addText("Terminación: una cresta se acaba", { x: 5.62, y: 2.03, w: 2.7, h: 0.45, fontFace: F, fontSize: 12, color: TXT, margin: 0 });
    s.addShape("ellipse", { x: 5.3, y: 2.75, w: 0.2, h: 0.2, fill: { color: AMBER } });
    s.addText("Bifurcación: una cresta se parte en dos", { x: 5.62, y: 2.63, w: 2.7, h: 0.6, fontFace: F, fontSize: 12, color: TXT, margin: 0 });
    // datos
    card(s, 5.0, 3.75, 7.75, 2.5);
    s.addText([
      { text: "Cada dedo tiene 20 a 50 minucias, y su patrón es único: ", options: { color: TXT } },
      { text: "ni los gemelos idénticos lo comparten", options: { bold: true, color: MINT } },
      { text: ".\n\nDe cada una guardamos solo 3 datos: ", options: { color: TXT } },
      { text: "posición (x, y) y ángulo (θ)", options: { bold: true, color: AMBER } },
      { text: " de la cresta en ese punto.", options: { color: TXT } },
    ], { x: 5.3, y: 3.95, w: 7.15, h: 1.55, fontFace: F, fontSize: 15, margin: 0 });
    s.addText("Privacidad: la foto de tu huella NO se guarda — solo esta lista de puntos. Con ella no se puede reconstruir tu dedo.", { x: 5.3, y: 5.55, w: 7.15, h: 0.6, fontFace: F, fontSize: 12.5, italic: true, color: MUTED, margin: 0 });
    card(s, 8.55, 1.9, 4.2, 1.6, CARD2);
    s.addText([
      { text: "22 – 54\n", options: { bold: true, fontSize: 30, color: MINT } },
      { text: "minucias reales medidas en nuestras pruebas", options: { fontSize: 12, color: MUTED } },
    ], { x: 8.8, y: 2.05, w: 3.7, h: 1.3, fontFace: F, align: "center", margin: 0 });
    s.addNotes("El extractor se llama MINDTCT y lo hizo el NIST (la agencia de estándares de EE.UU.) para el FBI — usamos su código abierto adaptado a nuestro chip. Punto de privacidad importante: guardamos coordenadas, no imágenes.");
  }

  // ============ 8 · GEOMETRIA ============
  {
    const s = base(pres, "Comparar huellas = pura geometría", "7 · paso 5: ¿misma persona?");
    // panel visual: dos nubes de puntos y lineas de coincidencia
    card(s, 0.6, 1.85, 5.9, 4.5);
    const pares = [
      [1.5, 2.6, 1.68, 2.78], [2.4, 2.3, 2.58, 2.48], [3.4, 2.7, 3.58, 2.86],
      [1.9, 3.6, 2.08, 3.78], [3.0, 3.9, 3.18, 4.06], [4.3, 3.4, 4.48, 3.55],
      [2.6, 4.9, 2.78, 5.06], [4.0, 5.1, 4.18, 5.24],
    ];
    for (const [x1, y1, x2, y2] of pares) {
      s.addShape("line", { x: Math.min(x1, x2) + 0.09, y: Math.min(y1, y2) + 0.09, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: MINT, width: 1.25, dashType: "dash" } });
      s.addShape("ellipse", { x: x1, y: y1, w: 0.18, h: 0.18, fill: { color: MINT } });
      s.addShape("ellipse", { x: x2, y: y2, w: 0.18, h: 0.18, fill: { color: BG, transparency: 100 }, line: { color: CORAL, width: 2 } });
    }
    s.addShape("ellipse", { x: 5.0, y: 2.2, w: 0.18, h: 0.18, fill: { color: BG, transparency: 100 }, line: { color: CORAL, width: 2 } });
    s.addShape("ellipse", { x: 1.2, y: 5.3, w: 0.18, h: 0.18, fill: { color: MINT } });
    s.addText([
      { text: "● huella guardada   ", options: { color: MINT, bold: true } },
      { text: "○ huella recién leída", options: { color: CORAL, bold: true } },
    ], { x: 0.9, y: 5.75, w: 5.3, h: 0.35, fontFace: F, fontSize: 12, margin: 0 });
    // pasos
    const pasos = [
      ["1", "Elige un par de puntos como ancla (uno de cada huella)"],
      ["2", "Rota y mueve TODOS los puntos con seno y coseno (¡trigonometría!)"],
      ["3", "Cuenta cuántos caen cerca: distancia < 11 px (Pitágoras) y ángulo < 20°"],
      ["4", "Repite con cada ancla posible y quédate con el mejor conteo = SCORE"],
    ];
    let y = 1.95;
    for (const [n, t] of pasos) {
      s.addShape("ellipse", { x: 6.8, y: y + 0.06, w: 0.46, h: 0.46, fill: { color: MINTD } });
      s.addText(n, { x: 6.8, y: y + 0.06, w: 0.46, h: 0.46, fontFace: F, fontSize: 16, bold: true, color: BG, align: "center", valign: "middle", margin: 0 });
      s.addText(t, { x: 7.45, y, w: 5.3, h: 0.85, fontFace: F, fontSize: 13.5, color: TXT, valign: "top", margin: 0 });
      y += 0.92;
    }
    card(s, 6.8, 5.7, 5.95, 0.85, CARD2);
    s.addText([
      { text: "8 conexiones en el dibujo → score 8.  ", options: { color: TXT, bold: true } },
      { text: "Las clases de trigonometría SÍ sirven.", options: { color: MINT, bold: true, italic: true } },
    ], { x: 7.05, y: 5.7, w: 5.5, h: 0.85, fontFace: F, fontSize: 13.5, valign: "middle", margin: 0 });
    s.addNotes("Aquí está el corazón matemático: rotaciones con seno/coseno y distancia euclidiana (Pitágoras). El algoritmo prueba cada pareja de anclas — son miles de intentos — y el chip lo hace en 30 milisegundos. Escribimos este comparador desde cero cuando el del NIST falló en nuestro procesador de 32 bits.");
  }

  // ============ 9 · UMBRAL ============
  {
    const s = base(pres, "El umbral mágico: 14 coincidencias", "8 · ¿cuándo decimos que sí?");
    // barras custom
    const bx = 0.9, by = 5.9, bw = 1.5, scale = 0.145; // px por unidad
    const datos = [["Mismo dedo\n(3 muestras)", 24, MINT], ["Mismo dedo\n(1 muestra)", 13, AMBER], ["Dedo\ndistinto", 8, CORAL]];
    datos.forEach(([lbl, v, c], i) => {
      const x = bx + i * (bw + 0.75);
      const h = v * scale;
      s.addShape("roundRect", { x, y: by - h, w: bw, h, rectRadius: 0.05, fill: { color: c } });
      s.addText(String(v), { x, y: by - h - 0.45, w: bw, h: 0.4, fontFace: F, fontSize: 20, bold: true, color: c, align: "center", margin: 0 });
      s.addText(lbl, { x: x - 0.2, y: by + 0.12, w: bw + 0.4, h: 0.65, fontFace: F, fontSize: 11.5, color: MUTED, align: "center", margin: 0 });
    });
    // linea de umbral
    const uy = by - 14 * scale;
    s.addShape("line", { x: bx - 0.25, y: uy, w: (bw + 0.75) * 3 - 0.4, h: 0, line: { color: TXT, width: 2, dashType: "dash" } });
    s.addText("umbral = 14", { x: 5.15, y: uy - 0.4, w: 1.7, h: 0.32, fontFace: F, fontSize: 12.5, bold: true, color: TXT, align: "center", margin: 0 });
    // texto derecha
    card(s, 7.6, 1.9, 5.15, 2.1);
    s.addText([
      { text: "score ≥ 14 → ", options: { bold: true, color: TXT } },
      { text: "misma persona ✓\n", options: { bold: true, color: MINT } },
      { text: "score < 14 → ", options: { bold: true, color: TXT } },
      { text: "desconocido ✗", options: { bold: true, color: CORAL } },
    ], { x: 7.9, y: 2.1, w: 4.6, h: 0.85, fontFace: F, fontSize: 17, margin: 0 });
    s.addText("Con una sola muestra quedábamos AL FILO (13-14). La solución: enrolar 3 fotos del mismo dedo y comparar contra las tres.", { x: 7.9, y: 3.0, w: 4.6, h: 0.9, fontFace: F, fontSize: 13, color: MUTED, margin: 0 });
    card(s, 7.6, 4.25, 5.15, 2.15, CARD2);
    s.addText("El dilema del umbral", { x: 7.9, y: 4.45, w: 4.6, h: 0.4, fontFace: F, fontSize: 15, bold: true, color: TXT, margin: 0 });
    s.addText([
      { text: "Muy bajo → ", options: { color: TXT } },
      { text: "deja pasar impostores", options: { bold: true, color: CORAL } },
      { text: " (falso positivo)\n", options: { color: MUTED } },
      { text: "Muy alto → ", options: { color: TXT } },
      { text: "te rechaza a TI", options: { bold: true, color: AMBER } },
      { text: " (falso negativo)", options: { color: MUTED } },
    ], { x: 7.9, y: 4.9, w: 4.6, h: 1.3, fontFace: F, fontSize: 13.5, margin: 0 });
    s.addNotes("Las barras son medidas reales de nuestro sistema. Este dilema (falso positivo vs falso negativo) existe en TODA la biometría: el FaceID del iPhone, los bancos... Es una decisión de ingeniería, no hay respuesta perfecta. Preguntar: ¿qué preferirían para un banco? ¿y para el comedor?");
  }

  // ============ 10 · MEMORIA ============
  {
    const s = base(pres, "La memoria que sobrevive apagones", "9 · la base de datos");
    card(s, 0.6, 1.85, 5.9, 3.35);
    iconCircle(s, I("FaChalkboardTeacher", BLUE), 0.95, 2.15, 0.7);
    s.addText("RAM = el tablero del salón", { x: 1.85, y: 2.25, w: 4.4, h: 0.45, fontFace: F, fontSize: 17, bold: true, color: TXT, margin: 0 });
    s.addText("Rapidísima para trabajar, pero al cortarse la luz se borra TODO.\n\nAquí viven las huellas mientras el sistema compara (32 MB).", { x: 0.95, y: 3.0, w: 5.2, h: 1.9, fontFace: F, fontSize: 13.5, color: MUTED, margin: 0 });
    card(s, 6.85, 1.85, 5.9, 3.35);
    iconCircle(s, I("FaBookOpen", AMBER), 7.2, 2.15, 0.7);
    s.addText("Flash = el cuaderno", { x: 8.1, y: 2.25, w: 4.4, h: 0.45, fontFace: F, fontSize: 17, bold: true, color: TXT, margin: 0 });
    s.addText("Mil veces más lenta para escribir, pero lo escrito QUEDA aunque desconectes la placa un año.\n\nAquí se guardan alumnos, huellas y registros de almuerzo.", { x: 7.2, y: 3.0, w: 5.2, h: 1.9, fontFace: F, fontSize: 13.5, color: MUTED, margin: 0 });
    card(s, 0.6, 5.45, 12.15, 1.15, CARD2);
    s.addImage({ data: I("FaBolt", AMBER), x: 0.95, y: 5.72, w: 0.6, h: 0.6 });
    s.addText([
      { text: "Dato loco: ", options: { bold: true, color: AMBER } },
      { text: "mientras se escribe en la flash, el chip ENTERO se congela un instante (¡ejecuta su código desde esa misma memoria!). Por eso el sistema guarda “por pedacitos”: anexa solo el registro nuevo en vez de reescribir todo.", options: { color: TXT } },
    ], { x: 1.75, y: 5.5, w: 10.8, h: 1.05, fontFace: F, fontSize: 13.5, valign: "middle", margin: 0 });
    s.addNotes("Analogía tablero/cuaderno. El dato del congelamiento es real y nos costó encontrarlo: cada almuerzo registrado congelaba el sistema 2 segundos hasta que cambiamos la estrategia de guardado. Lección de estructuras de datos aplicada.");
  }

  // ============ 11 · WIFI ============
  {
    const s = base(pres, "Crea su propio WiFi (sin internet)", "10 · la pantalla es tu celular");
    // diagrama placa -> ondas -> celular
    card(s, 0.9, 2.6, 3.1, 2.9);
    s.addImage({ data: I("FaMicrochip", MINT), x: 1.85, y: 3.0, w: 1.15, h: 1.15 });
    s.addText("ESP32-P4\ncrea la red «ALIMETRIK»", { x: 1.05, y: 4.3, w: 2.8, h: 0.9, fontFace: F, fontSize: 13, bold: true, color: TXT, align: "center", margin: 0 });
    // ondas
    for (let i = 0; i < 3; i++) {
      s.addShape("arc", { x: 4.35 + i * 0.5, y: 3.35 - i * 0.28, w: 0.9 + i * 0.55, h: 1.4 + i * 0.55, angleRange: [300, 60], line: { color: MINT, width: 2.5 }, fill: { color: BG, transparency: 100 } });
    }
    card(s, 6.6, 2.6, 3.1, 2.9);
    s.addImage({ data: I("FaMobileAlt", MINT), x: 7.55, y: 3.0, w: 1.15, h: 1.15 });
    s.addText("tu celular abre\n192.168.4.1", { x: 6.75, y: 4.3, w: 2.8, h: 0.9, fontFace: F, fontSize: 13, bold: true, color: TXT, align: "center", margin: 0 });
    // texto derecha
    card(s, 10.05, 1.95, 2.7, 4.35, CARD2);
    s.addText("El servidor web vive DENTRO del chip", { x: 10.25, y: 2.2, w: 2.3, h: 1.0, fontFace: F, fontSize: 14, bold: true, color: MINT, margin: 0 });
    s.addText("Sirve la página del kiosco, la lista de alumnos y las métricas en 7 milisegundos.", { x: 10.25, y: 3.25, w: 2.3, h: 1.4, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
    s.addText("Sin planes de datos, sin nube, sin apps.", { x: 10.25, y: 4.85, w: 2.3, h: 1.1, fontFace: F, fontSize: 12, italic: true, color: TXT, margin: 0 });
    s.addText("Una página web completa servida desde algo más pequeño que una moneda de $500.", { x: 0.9, y: 6.05, w: 9.0, h: 0.5, fontFace: F, fontSize: 14.5, italic: true, color: MINT, margin: 0 });
    s.addNotes("Aclarar la diferencia entre WiFi e internet: la placa genera una red local propia (como un router en miniatura). El celular no navega a Google — habla directamente con el chip. Anécdota: el 'peaje' de 250 ms por un detalle del protocolo TCP que arreglamos con 1 línea.");
  }

  // ============ 12 · REGLA DE ORO ============
  {
    const s = base(pres, "La regla de oro: 1 huella = 1 almuerzo", "11 · el kiosco en acción");
    // mockup kiosco
    card(s, 0.7, 1.85, 5.6, 4.6, CARD2);
    s.addText("ALMUERZO · 12:07", { x: 1.0, y: 2.05, w: 5.0, h: 0.35, fontFace: F, fontSize: 12, bold: true, color: MUTED, align: "center", charSpacing: 1.5, margin: 0 });
    s.addShape("roundRect", { x: 1.05, y: 2.5, w: 4.9, h: 1.6, rectRadius: 0.1, fill: { color: "10321F" }, line: { color: MINT, width: 2 } });
    s.addImage({ data: I("FaCheckCircle", MINT), x: 1.3, y: 2.95, w: 0.7, h: 0.7 });
    s.addText([
      { text: "Juan Pérez\n", options: { fontSize: 19, bold: true, color: TXT } },
      { text: "ALMUERZO ENTREGADO ✓", options: { fontSize: 13, bold: true, color: MINT } },
    ], { x: 2.15, y: 2.7, w: 3.7, h: 1.2, fontFace: F, valign: "middle", margin: 0 });
    s.addShape("roundRect", { x: 1.05, y: 4.3, w: 4.9, h: 1.6, rectRadius: 0.1, fill: { color: "3A2E10" }, line: { color: AMBER, width: 2 } });
    s.addImage({ data: I("FaExclamationTriangle", AMBER), x: 1.3, y: 4.75, w: 0.7, h: 0.7 });
    s.addText([
      { text: "Juan Pérez\n", options: { fontSize: 19, bold: true, color: TXT } },
      { text: "YA RECIBIÓ SU ALMUERZO HOY", options: { fontSize: 13, bold: true, color: AMBER } },
    ], { x: 2.15, y: 4.5, w: 3.7, h: 1.2, fontFace: F, valign: "middle", margin: 0 });
    // reglas
    const reglas = [
      ["FaFingerprint", MINT, "Sin dedo no hay almuerzo", "El registro SOLO nace de una huella leída — no se puede inventar desde un teclado."],
      ["FaClock", CORAL, "Uno por servicio, por día", "El sistema recuerda quién ya pasó HOY por ESTE servicio. Mañana, contador a cero."],
      ["FaVolumeUp", MINT, "Sonido para no mirar", "Bip agudo = entregado. Doble tono grave = rechazado. La fila no se detiene."],
    ];
    let y = 1.95;
    for (const [n, c, t, d] of reglas) {
      iconCircle(s, I(n, c), 6.75, y + 0.05, 0.6);
      s.addText(t, { x: 7.55, y, w: 5.2, h: 0.4, fontFace: F, fontSize: 15.5, bold: true, color: TXT, margin: 0 });
      s.addText(d, { x: 7.55, y: y + 0.42, w: 5.2, h: 0.85, fontFace: F, fontSize: 12.5, color: MUTED, margin: 0 });
      y += 1.5;
    }
    s.addNotes("Mostrar el flujo real: primer dedo de Juan → verde; segundo intento → ámbar con la advertencia. Es una captura fiel de cómo se ve el kiosco. La regla anti-duplicado es la que le ahorra plata al comedor.");
  }

  // ============ 13 · BUGS ============
  {
    const s = base(pres, "Cacería de bugs: historias reales", "12 · lo que no sale en los tutoriales");
    const bugs = [
      ["El lector zombi", "Si nadie ponía el dedo en 60 s, un 'timeout' dejaba el USB en un estado fantasma: TODO fallaba... en el mismo milisegundo, para siempre.", "La pista: dos mensajes del log con timestamp IDÉNTICO. El arreglo: limpiar el canal USB tras cada timeout."],
      ["El peaje fantasma", "Cada clic en la página tardaba EXACTAMENTE 250 ms de más. ¿Casualidad? No: dos reglas del protocolo TCP (Nagle + delayed-ACK) se esperaban mutuamente.", "El arreglo: 1 línea de código (TCP_NODELAY). Resultado: 35 veces más rápido."],
      ["El mensaje invisible", "El aviso «HUELLA LEÍDA» se mostraba solo 230 ms y otro mensaje lo pisaba. El celular refresca cada segundo: NADIE lo vio jamás.", "La gente creía que el sistema no servía. Era un problema de comunicación, no de función."],
    ];
    let x = 0.6;
    for (const [t, d, fix] of bugs) {
      card(s, x, 1.8, 3.98, 4.45);
      iconCircle(s, I("FaBug", CORAL), x + 0.28, 2.05, 0.6);
      s.addText(t, { x: x + 1.02, y: 2.1, w: 2.85, h: 0.55, fontFace: F, fontSize: 16.5, bold: true, color: CORAL, valign: "middle", margin: 0 });
      s.addText(d, { x: x + 0.28, y: 2.85, w: 3.42, h: 1.85, fontFace: F, fontSize: 12, color: TXT, margin: 0 });
      s.addText(fix, { x: x + 0.28, y: 4.75, w: 3.42, h: 1.35, fontFace: F, fontSize: 11.5, italic: true, color: MINT, margin: 0 });
      x += 4.22;
    }
    s.addText("Moraleja: el log no miente. Mide primero, adivina nunca.", { x: 0.6, y: 6.45, w: 12.1, h: 0.45, fontFace: F, fontSize: 16, bold: true, italic: true, color: AMBER, align: "center", margin: 0 });
    s.addNotes("La parte favorita del público. Cada bug es 100% real y tiene una lección: (1) los sistemas fallan en los bordes — qué pasa cuando NO pasa nada en 60s; (2) el rendimiento se mide, no se supone; (3) un sistema que funciona pero no comunica, para el usuario NO funciona. Depurar es ser detective: evidencia, hipótesis, experimento.");
  }

  // ============ 14 · NUMEROS ============
  {
    const s = base(pres, "El sistema en números", "13 · medido en la vida real");
    const stats = [
      ["1,5 s", "dura tu interacción:\ndedo, luz, «retira»", MINT],
      ["30 ms", "comparar 2 huellas\n(miles de rotaciones)", BLUE],
      ["111.360", "píxeles analizados\npor cada lectura", AMBER],
      ["3", "muestras por dedo\nal enrolarte", MINT],
      ["7 ms", "responde la página web\ndesde el chip", BLUE],
      ["0", "veces que necesita\ninternet o nube", CORAL],
    ];
    let i = 0;
    for (const [v, l, c] of stats) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.7 + col * 4.2, y = 1.95 + row * 2.25;
      card(s, x, y, 3.95, 2.0);
      s.addText(v, { x: x + 0.2, y: y + 0.22, w: 3.55, h: 0.95, fontFace: F, fontSize: 44, bold: true, color: c, align: "center", margin: 0 });
      s.addText(l, { x: x + 0.2, y: y + 1.2, w: 3.55, h: 0.7, fontFace: F, fontSize: 12.5, color: MUTED, align: "center", margin: 0 });
      i++;
    }
    s.addNotes("Todos los números salen de mediciones reales por el puerto serial. Buen momento para explicar qué es un milisegundo: en el tiempo de un parpadeo (300 ms) el chip compara tu huella contra 10 personas.");
  }

  // ============ 15 · LO QUE APRENDES ============
  {
    const s = base(pres, "Todo esto ya lo estás estudiando", "14 · y tú, ¿qué puedes hacer?");
    const areas = [
      ["FaSquareRootAlt", AMBER, "Matemáticas", "Trigonometría (rotar puntos), Pitágoras (distancias), XOR (criptografía). No es relleno: es el corazón del sistema."],
      ["FaCode", MINT, "Programación", "Lenguaje C, tareas en paralelo, bases de datos, páginas web. Todo con herramientas 100% gratis."],
      ["FaMicrochip", BLUE, "Electrónica", "USB, WiFi, memorias, sensores. Un chip de $25 hace lo que hace 20 años costaba millones."],
      ["FaFlask", MINT, "Método científico", "Cada bug se cazó igual: evidencia → hipótesis → experimento → conclusión. Programar es ser detective."],
    ];
    let i = 0;
    for (const [n, c, t, d] of areas) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 6.25, y = 1.85 + row * 2.15;
      card(s, x, y, 6.0, 1.95);
      iconCircle(s, I(n, c), x + 0.28, y + 0.3, 0.68);
      s.addText(t, { x: x + 1.15, y: y + 0.22, w: 4.6, h: 0.45, fontFace: F, fontSize: 16.5, bold: true, color: TXT, margin: 0 });
      s.addText(d, { x: x + 1.15, y: y + 0.68, w: 4.6, h: 1.15, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
      i++;
    }
    card(s, 0.6, 6.1, 12.25, 0.85, CARD2);
    s.addImage({ data: I("FaGraduationCap", MINT), x: 0.95, y: 6.25, w: 0.55, h: 0.55 });
    s.addText([
      { text: "Carreras donde harás cosas así: ", options: { color: TXT } },
      { text: "Ing. de Sistemas · Electrónica · Mecatrónica · Ciberseguridad · Ciencia de Datos", options: { bold: true, color: MINT } },
    ], { x: 1.7, y: 6.1, w: 11.0, h: 0.85, fontFace: F, fontSize: 14, valign: "middle", margin: 0 });
    s.addNotes("Mensaje final motivacional: nada de esto requirió laboratorios millonarios. Un chip económico, software libre y las matemáticas del colegio. La barrera de entrada a crear tecnología nunca ha sido tan baja.");
  }

  // ============ 16 · CIERRE ============
  {
    const s = pres.addSlide(); pageNum++;
    s.background = { color: BG };
    s.addImage({ data: huellaDim, x: 9.0, y: 1.2, w: 3.9, h: 5.05 });
    s.addText("¿Preguntas?", { x: 0.8, y: 2.3, w: 7.5, h: 1.0, fontFace: F, fontSize: 54, bold: true, color: TXT, margin: 0 });
    s.addText("Pon el dedo y lo averiguamos.", { x: 0.8, y: 3.4, w: 7.5, h: 0.6, fontFace: F, fontSize: 21, color: MINT, margin: 0 });
    card(s, 0.8, 4.5, 7.3, 1.3, CARD);
    s.addText([
      { text: "El resumen en una línea:\n", options: { fontSize: 12, color: MUTED } },
      { text: "tu huella → números → geometría → almuerzo", options: { fontSize: 19, bold: true, color: MINT } },
    ], { x: 1.1, y: 4.62, w: 6.8, h: 1.1, fontFace: F, valign: "middle", margin: 0 });
    s.addText("ALIMETRIK · sistema de comedor escolar con huella · ESP32-P4 + DigitalPersona 4500", { x: 0.8, y: 6.9, w: 11.5, h: 0.35, fontFace: F, fontSize: 10.5, color: MUTED, margin: 0 });
    s.addNotes("Cierre. Si hay demo en vivo: invitar a 2-3 estudiantes a enrolarse y pasar por el 'almuerzo'. El efecto del duplicado en amarillo siempre saca risas.");
  }

  await pres.writeFile({ fileName: "ALIMETRIK-grado11.pptx" });
  console.log("PPTX generado OK:", pageNum, "diapositivas");
})().catch(e => { console.error(e); process.exit(1); });
