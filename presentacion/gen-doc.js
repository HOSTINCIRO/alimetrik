/* ALIMETRIK — documento Word didáctico: explicación completa del código.
 * Los fragmentos de código se LEEN de la carpeta codigo/ para que el documento
 * coincida exactamente con lo entregado. */
const fs = require("fs");
const path = require("path");
const D = require("docx");

const BASE = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega";
const COD = path.join(BASE.replace("ALIMETRIK-completo","ALIMETRIK-entrega"), "codigo");

// ---------- paleta ----------
const NAVY = "17212B", MINT = "0CA678", MINTBG = "E6F7F1", CODEBG = "F1F4F6";
const GRIS = "444444", MUTED = "6B7A88", CORAL = "C0392B", AMBERBG = "FDF3DC";

// ---------- lectura de fragmentos reales ----------
function snippetAt(rel, marker, before, after) {
  const lines = fs.readFileSync(path.join(COD, rel), "utf8").split("\n");
  const i = lines.findIndex(l => l.includes(marker));
  if (i < 0) throw new Error("marker no hallado: " + marker + " en " + rel);
  return lines.slice(Math.max(0, i - before), i + after).join("\n").replace(/\t/g, "    ");
}
function wcLines(rel) { return fs.readFileSync(path.join(COD, rel), "utf8").split("\n").length; }

// ---------- helpers docx ----------
const PT = n => n * 2; // half-points
function R(text, o = {}) {
  return new D.TextRun({ text, font: o.font || "Calibri", size: PT(o.size || 11), bold: !!o.bold, italics: !!o.it, color: o.color || GRIS });
}
function P(children, o = {}) {
  return new D.Paragraph({ children: Array.isArray(children) ? children : [R(children, o.run || {})], spacing: { after: o.after ?? 160, before: o.before ?? 0, line: o.line }, alignment: o.align, ...(o.extra || {}) });
}
function H1(num, text) {
  return new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, spacing: { before: 380, after: 160 }, pageBreakBefore: true,
    children: [new D.TextRun({ text: num + "  ", font: "Calibri", size: PT(19), bold: true, color: MINT }),
               new D.TextRun({ text, font: "Calibri", size: PT(19), bold: true, color: NAVY })],
  });
}
function H2(text) {
  return new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 },
    children: [new D.TextRun({ text, font: "Calibri", size: PT(14), bold: true, color: MINT })] });
}
function BODY(runs, o = {}) {
  const ch = (Array.isArray(runs) ? runs : [[runs, {}]]).map(([t, ro]) => R(t, { size: 11, ...ro }));
  return new D.Paragraph({ children: ch, spacing: { after: o.after ?? 140, line: 288 } });
}
function BUL(items) {
  return items.map(it => new D.Paragraph({
    children: (Array.isArray(it) ? it : [[it, {}]]).map(([t, ro]) => R(t, { size: 11, ...ro })),
    numbering: { reference: "vinetas", level: 0 }, spacing: { after: 90, line: 276 },
  }));
}
function CODE(titulo, code) {
  const out = [];
  out.push(new D.Paragraph({ spacing: { before: 140, after: 40 },
    children: [new D.TextRun({ text: "▸ " + titulo, font: "Calibri", size: PT(9.5), bold: true, color: MINT })] }));
  const lines = code.split("\n");
  lines.forEach((l, i) => out.push(new D.Paragraph({
    shading: { type: D.ShadingType.CLEAR, fill: CODEBG },
    spacing: { after: 0, before: 0, line: 220 },
    indent: { left: 200, right: 200 },
    border: i === 0 ? { top: { style: D.BorderStyle.SINGLE, size: 4, color: "D5DDE3" } } :
            (i === lines.length - 1 ? { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: "D5DDE3" } } : undefined),
    children: [new D.TextRun({ text: l.length ? l : " ", font: "Courier New", size: PT(8), color: "1A2733" })],
  })));
  out.push(new D.Paragraph({ children: [], spacing: { after: 100 } }));
  return out;
}
function CALLOUT(titulo, texto, fill = MINTBG, borde = MINT) {
  return new D.Table({
    columnWidths: [9360], width: { size: 9360, type: D.WidthType.DXA },
    borders: { top: { style: D.BorderStyle.SINGLE, size: 6, color: borde }, bottom: { style: D.BorderStyle.SINGLE, size: 6, color: borde }, left: { style: D.BorderStyle.SINGLE, size: 6, color: borde }, right: { style: D.BorderStyle.SINGLE, size: 6, color: borde }, insideHorizontal: { style: D.BorderStyle.NONE }, insideVertical: { style: D.BorderStyle.NONE } },
    rows: [new D.TableRow({ children: [new D.TableCell({
      width: { size: 9360, type: D.WidthType.DXA }, shading: { type: D.ShadingType.CLEAR, fill },
      margins: { top: 140, bottom: 140, left: 200, right: 200 },
      children: [new D.Paragraph({ spacing: { after: 60 }, children: [new D.TextRun({ text: titulo, font: "Calibri", size: PT(10.5), bold: true, color: NAVY })] }),
                 new D.Paragraph({ spacing: { after: 0, line: 276 }, children: (Array.isArray(texto) ? texto : [[texto, {}]]).map(([t, ro]) => R(t, { size: 10.5, ...ro })) })],
    })] })],
  });
}
function TABLA(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const mkCell = (txt, w, esHeader, i) => new D.TableCell({
    width: { size: w, type: D.WidthType.DXA },
    shading: { type: D.ShadingType.CLEAR, fill: esHeader ? NAVY : (i % 2 ? "F5F8FA" : "FFFFFF") },
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    children: [new D.Paragraph({ spacing: { after: 0, line: 252 },
      children: (Array.isArray(txt) ? txt : [[String(txt), {}]]).map(([t, ro]) => R(t, { size: 9.5, bold: esHeader || ro.bold, color: esHeader ? "FFFFFF" : (ro.color || GRIS), font: ro.font })) })],
  });
  return new D.Table({
    columnWidths: widths, width: { size: total, type: D.WidthType.DXA },
    borders: { top: { style: D.BorderStyle.SINGLE, size: 4, color: "C8D2DA" }, bottom: { style: D.BorderStyle.SINGLE, size: 4, color: "C8D2DA" }, left: { style: D.BorderStyle.SINGLE, size: 4, color: "C8D2DA" }, right: { style: D.BorderStyle.SINGLE, size: 4, color: "C8D2DA" }, insideHorizontal: { style: D.BorderStyle.SINGLE, size: 4, color: "DDE5EB" }, insideVertical: { style: D.BorderStyle.SINGLE, size: 4, color: "DDE5EB" } },
    rows: [new D.TableRow({ tableHeader: true, children: headers.map((h, i) => mkCell(h, widths[i], true, 0)) }),
           ...rows.map((r, ri) => new D.TableRow({ children: r.map((c, i) => mkCell(c, widths[i], false, ri)) }))],
  });
}
const SEP = () => new D.Paragraph({ children: [], spacing: { after: 120 } });

// ==================================================================
const kids = [];

// ---------- PORTADA ----------
kids.push(new D.Paragraph({ children: [], spacing: { after: 1200 } }));
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, children: [new D.ImageRun({ type: "png", data: fs.readFileSync("/tmp/huella-doc.png"), transformation: { width: 165, height: 220 } })] }));
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 300, after: 100 }, children: [new D.TextRun({ text: "ALIMETRIK", font: "Calibri", size: PT(44), bold: true, color: NAVY })] }));
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 80 }, children: [new D.TextRun({ text: "Sistema de comedor escolar con huella dactilar", font: "Calibri", size: PT(17), color: MINT, bold: true })] }));
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 700 }, children: [new D.TextRun({ text: "Explicación completa y didáctica del código, la base de datos y el funcionamiento", font: "Calibri", size: PT(12.5), color: MUTED, italics: true })] }));
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 60 }, children: [new D.TextRun({ text: "ESP32-P4 (Guition)  ·  Lector DigitalPersona U.are.U 4500  ·  ESP-IDF v5.5", font: "Calibri", size: PT(10.5), color: GRIS })] }));
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: "Julio de 2026", font: "Calibri", size: PT(10.5), color: MUTED })] }));

// ---------- INDICE ----------
kids.push(H1("", "Contenido"));
const toc = [
  ["1", "¿Qué es ALIMETRIK?"], ["2", "El hardware: las piezas de la máquina"],
  ["3", "El mapa del código: quién hace qué"], ["4", "El driver del lector de huellas (driver_4500.c)"],
  ["5", "El reconocimiento: minucias y el comparador (components/nbis)"],
  ["6", "La base de datos (db.c y db.h)"], ["7", "El WiFi propio y el servidor web (portal.c)"],
  ["8", "La página web: kiosco y métricas (index.html)"],
  ["9", "El viaje completo de un almuerzo"], ["10", "Los 7 bugs épicos y sus lecciones"],
  ["11", "Cómo compilar, flashear y probar"], ["12", "El sistema en cifras"], ["13", "Glosario para no perderse"],
];
toc.forEach(([n, t]) => kids.push(new D.Paragraph({ spacing: { after: 90 }, children: [
  new D.TextRun({ text: n.padStart(2, " ") + "   ", font: "Courier New", size: PT(11), bold: true, color: MINT }),
  new D.TextRun({ text: t, font: "Calibri", size: PT(11.5), color: NAVY })] })));

// ==================== 1 · QUE ES ====================
kids.push(H1("1", "¿Qué es ALIMETRIK?"));
kids.push(BODY([["ALIMETRIK es un sistema ", {}], ["biométrico", { bold: true, color: MINT }], [" de comedor escolar: cada estudiante pone su dedo en un lector de huellas y el sistema lo reconoce, verifica si le corresponde el servicio (desayuno, almuerzo o refrigerio), le entrega su ración y deja el registro guardado. Si intenta pasar dos veces el mismo día, el sistema lo detecta y lo rechaza con un aviso amarillo: «YA RECIBIÓ SU ALMUERZO HOY».", {}]]));
kids.push(BODY([["Lo especial es ", {}], ["dónde", { it: true }], [" vive todo esto: no hay computador, ni servidor, ni internet, ni nube. El sistema completo —el driver del lector, el reconocimiento de huellas, la base de datos y hasta la página web— corre dentro de un chip más pequeño que una galleta que crea su propia red WiFi. Un celular cualquiera se conecta a esa red y ve el kiosco en vivo.", {}]]));
kids.push(CALLOUT("La idea en una línea", [["Tu huella → números → geometría → almuerzo. ", { bold: true }], ["El dedo se convierte en una foto, la foto en puntos, los puntos se comparan con geometría, y el resultado decide si hay almuerzo.", {}]]));
kids.push(SEP());
kids.push(H2("Qué hace el sistema"));
kids.push(...BUL([
  [["Enrolar", { bold: true }], [" estudiantes: 3 muestras de un dedo quedan asociadas a su nombre.", {}]],
  [["Identificar 1:N", { bold: true }], [": un dedo desconocido se compara contra TODAS las huellas guardadas.", {}]],
  [["Anti-duplicado", { bold: true }], [": una sola ración por servicio por día, por persona.", {}]],
  [["Registrar y medir", { bold: true }], [": cada evento queda guardado y las métricas se ven en el celular.", {}]],
  [["Sobrevivir apagones", { bold: true }], [": todos los datos persisten en memoria flash.", {}]],
]));

// ==================== 2 · HARDWARE ====================
kids.push(H1("2", "El hardware: las piezas de la máquina"));
kids.push(BODY("Solo hay tres piezas físicas, y una de ellas ya la tienes en el bolsillo:"));
kids.push(TABLA(["Pieza", "Qué es", "Datos clave"], [
  [[["ESP32-P4 (Guition)", { bold: true }]], [["El «cerebro»: un microcontrolador con dos procesadores RISC-V.", {}]], [["360 MHz · 32 MB RAM (PSRAM) · 16 MB flash · crea su propio WiFi (chip C6)", {}]]],
  [[["Lector U.are.U 4500", { bold: true }]], [["El «ojo»: lector óptico de huellas de grado bancario, conectado por USB.", {}]], [["512 dpi · imagen de 384 × 290 píxeles · la envía cifrada", {}]]],
  [[["Un celular", { bold: true }]], [["La «pantalla»: se conecta al WiFi de la placa y abre la página web.", {}]], [["Sin apps, sin internet: solo abrir 192.168.4.1", {}]]],
], [2300, 3800, 3260]));
kids.push(SEP());
kids.push(CALLOUT("¿Por qué es sorprendente?", [["Todo el sistema —driver USB, reconocimiento biométrico, base de datos y servidor web— cuesta unos ", {}], ["$25 USD", { bold: true }], [" y consume menos energía que un bombillo LED. Hace 20 años esto requería un computador industrial.", {}]]));

// ==================== 3 · MAPA DEL CODIGO ====================
kids.push(H1("3", "El mapa del código: quién hace qué"));
kids.push(BODY([["El código está en la carpeta ", {}], ["codigo/", { font: "Courier New", bold: true }], [" y sigue el patrón ", {}], ["Modelo–Vista–Controlador (MVC)", { bold: true, color: MINT }], [", el mismo que usan las aplicaciones web profesionales. La idea es separar tres responsabilidades que suelen mezclarse:", {}]]));
kids.push(TABLA(["Capa", "Qué es", "En este proyecto"], [
  [[["MODELO", { bold: true }]], [["Los datos y las reglas del negocio. No sabe nada de pantallas.", {}]], [["modelos/ : alumnos, huellas, registros, usuarios y la memoria permanente", { font: "Courier New" }]]],
  [[["VISTA", { bold: true }]], [["Lo que el usuario ve. No decide nada, solo muestra.", {}]], [["vistas/ : las páginas HTML y la conversión de datos a JSON", { font: "Courier New" }]]],
  [[["CONTROLADOR", { bold: true }]], [["El que coordina: recibe la petición, consulta el modelo y entrega la vista.", {}]], [["controladores/ : web, sesiones, red y lector de huellas", { font: "Courier New" }]]],
], [1900, 3600, 3860]));
kids.push(SEP());
kids.push(CALLOUT("¿Por qué separar así?", [["Porque cada parte se puede cambiar sin romper las demás. Si mañana se rediseña la página web, el modelo de datos ", {}], ["no se toca", { bold: true }], [". Si se cambia la forma de guardar los datos, la interfaz sigue igual. Y cada archivo se puede entender por separado: no hay que leer 900 líneas para saber cómo se guarda un alumno.", {}]]));
kids.push(SEP());
kids.push(BODY([["Dentro de cada capa, cada archivo tiene UNA responsabilidad clara:", {}]]));
kids.push(TABLA(["Archivo", "Líneas", "Su misión"], [
  [[["main/controladores/controlador_lector.c", { font: "Courier New" }]], [[String(wcLines("main/controladores/controlador_lector.c")), {}]], [["Habla con el lector por USB: lo enciende, espera el dedo, captura la imagen, la descifra y coordina todo (es el «director de orquesta», contiene app_main).", {}]]],
  [[["main/modelos/*.c", { font: "Courier New" }]], [[String(wcLines("main/modelos/modelo_estudiante.c") + wcLines("main/modelos/almacenamiento.c")), {}]], [["La base de datos: estudiantes, huellas y registros. Vive en RAM para ser rápida y se guarda en flash para sobrevivir apagones.", {}]]],
  [[["main/controladores/*.c", { font: "Courier New" }]], [[String(wcLines("main/controladores/controlador_web.c") + wcLines("main/controladores/controlador_red.c")), {}]], [["Levanta el WiFi propio, el DNS del portal cautivo, el servidor web con su API JSON, el reloj y el estado del enrolamiento.", {}]]],
  [[["main/vistas/vista_sistema.html", { font: "Courier New" }]], [[String(wcLines("main/vistas/vista_sistema.html")), {}]], [["La página web completa (kiosco, métricas, alumnos, registros). Va incrustada dentro del chip.", {}]]],
  [[["componentes/reconocimiento/nbis_wrap.c", { font: "Courier New" }]], [[String(wcLines("componentes/reconocimiento/nbis_wrap.c")), {}]], [["El «cazador de minucias» (usa MINDTCT del NIST) y NUESTRO comparador de huellas escrito desde cero.", {}]]],
  [[["componentes/reconocimiento/lfs/*.c", { font: "Courier New" }]], [["~26.000", {}]], [["MINDTCT: el extractor de minucias del NIST (la agencia de estándares de EE.UU.), el mismo que usa el FBI. Código abierto adaptado al chip.", {}]]],
  [[["partitions.csv", { font: "Courier New" }]], [[String(wcLines("partitions.csv")), {}]], [["El «plano» de la memoria flash: cuánto espacio es para el programa y cuánto para los datos (8 MB para la base de datos).", {}]]],
  [[["sdkconfig.defaults", { font: "Courier New" }]], [[String(wcLines("sdkconfig.defaults")), {}]], [["La configuración del chip: velocidad de la RAM, tamaños de memoria, opciones del USB.", {}]]],
], [2650, 950, 5760]));
kids.push(SEP());
kids.push(H2("Tres trabajadores en paralelo (tareas de FreeRTOS)"));
kids.push(BODY([["El chip ejecuta un mini sistema operativo (FreeRTOS) donde varias «tareas» trabajan a la vez, como empleados con turnos. Las tres importantes:", {}]]));
kids.push(...BUL([
  [["driver_task", { font: "Courier New", bold: true }], [" — vive pendiente del lector: espera el dedo, captura la imagen (1,5 s) y la pone en una cola. Queda libre de inmediato para el siguiente dedo.", {}]],
  [["procesador_task", { font: "Courier New", bold: true }], [" — saca imágenes de la cola y hace el trabajo pesado (extraer minucias ~4 s, comparar, guardar) SIN bloquear al lector.", {}]],
  [["httpd (servidor web)", { font: "Courier New", bold: true }], [" — atiende las peticiones del celular. Responde en milisegundos porque nadie lo bloquea.", {}]],
]));
kids.push(CALLOUT("¿Por qué en paralelo?", [["Al principio TODO pasaba en una sola fila: capturar + procesar + guardar = 6-9 segundos con el lector sordo. La gente creía que estaba dañado y volvía a poner el dedo. Separarlo en dos tareas con una cola en medio (patrón «productor-consumidor») bajó la interacción a 1,5 s.", {}]]));

// ==================== 4 · DRIVER ====================
kids.push(H1("4", "El driver del lector de huellas (driver_4500.c)"));
kids.push(BODY([["Un ", {}], ["driver", { bold: true }], [" es el traductor entre el chip y un aparato externo. El lector 4500 no venía con driver para ESP32 —no existía en el mundo—, así que lo escribimos partiendo del driver de Linux (proyecto libfprint) y del análisis del protocolo USB.", {}]]));
kids.push(H2("4.1  Cómo se habla con el lector"));
kids.push(BODY([["El 4500 se controla escribiendo y leyendo ", {}], ["registros", { bold: true }], [" (casillas numeradas dentro del aparato) a través de USB. Los importantes: ", {}], ["MODE (0x4E)", { font: "Courier New" }], [" le dice qué hacer (esperar dedo, capturar, reposar) y ", {}], ["HWSTAT (0x07)", { font: "Courier New" }], [" reporta su estado. Además el lector avisa eventos por «interrupciones»: ", {}], ["0x0101 = hay dedo", { font: "Courier New" }], [", ", {}], ["0x0200 = se quitó el dedo", { font: "Courier New" }], [".", {}]]));
kids.push(...CODE("controlador_lector.c — esperar el aviso del lector (intr_wait)", snippetAt("main/controladores/controlador_lector.c", "static esp_err_t intr_wait", 1, 17)));
kids.push(BODY([["Línea por línea: se prepara un «sobre» de 64 bytes (", {}], ["s_intr", { font: "Courier New" }], ["), se envía al lector (", {}], ["submit", { font: "Courier New" }], [") y la tarea se duerme hasta que llegue la respuesta (", {}], ["xSemaphoreTake", { font: "Courier New" }], [" = «despiértame cuando pase algo»). Los dos primeros bytes del sobre traen el código del evento.", {}]]));
kids.push(H2("4.2  La captura: una sola lectura gigante"));
kids.push(BODY([["Cuando llega el evento «hay dedo», se ordena ", {}], ["MODE_CAPTURE", { font: "Courier New" }], [" y la imagen completa (111.360 bytes + cabeceras) se lee en UNA sola transferencia USB. Descubrimos a golpes que leerla por pedazos pierde bytes: el lector transmite sin memoria intermedia, como alguien que dicta sin pausas — si te distraes un segundo, perdiste palabras para siempre.", {}]]));
kids.push(H2("4.3  El descifrado: la imagen viene revuelta"));
kids.push(BODY([["El fabricante cifra la imagen dentro del cable para que nadie pueda espiarla. El descifrado usa ", {}], ["XOR", { bold: true, color: MINT }], [": a cada píxel se le «suma» un número secreto que solo quien tiene la llave sabe «restar». La llave la produce un LFSR, una fórmula que genera números aparentemente aleatorios pero repetibles:", {}]]));
kids.push(...CODE("controlador_lector.c — el generador de llaves (LFSR portado de libfprint)", snippetAt("main/controladores/controlador_lector.c", "static uint32_t update_key", 1, 12)));
kids.push(BODY([["No hay que entender cada bit: la idea es que ambos lados (lector y chip) ejecutan la MISMA fórmula, así que generan la MISMA secuencia de llaves, y XOR dos veces con el mismo número devuelve el original: ", {}], ["dato ⊕ llave ⊕ llave = dato", { font: "Courier New", bold: true }], [".", {}]]));
kids.push(H2("4.4  Esperar a que el dedo se vaya (la cortesía del sensor)"));
kids.push(...CODE("controlador_lector.c — esperar_dedo_fuera()", snippetAt("main/controladores/controlador_lector.c", "static void esperar_dedo_fuera", 3, 20)));
kids.push(BODY("Sin esta función, un dedo que se queda apoyado se captura en bucle infinito: el LED parpadea como loco y salen lecturas repetidas. La regla: una puesta de dedo = exactamente una lectura."));
kids.push(H2("4.5  El plan de emergencia (recuperación USB)"));
kids.push(BODY([["¿Qué pasa si una transferencia USB se queda esperando para siempre? Antes: el lector moría hasta reiniciar. Ahora hay una «escalera de recuperación»: limpiar el canal (", {}], ["ep_limpiar", { font: "Courier New" }], ["), reiniciar el protocolo del lector y, como último recurso, reiniciar el chip (la base de datos no se pierde: está en flash).", {}]]));
kids.push(...CODE("controlador_lector.c — limpiar un canal USB atascado", snippetAt("main/controladores/controlador_lector.c", "static void ep_limpiar", 5, 14)));

// ==================== 5 · RECONOCIMIENTO ====================
kids.push(H1("5", "El reconocimiento: minucias y el comparador"));
kids.push(H2("5.1  Las minucias: tu firma escondida"));
kids.push(BODY([["Una huella no se compara píxel por píxel (con solo girar el dedo 2° fallaría todo). Se buscan las ", {}], ["minucias", { bold: true, color: MINT }], [": los puntos donde una cresta TERMINA o se BIFURCA. Cada dedo tiene 20-50 y su patrón es único — ni los gemelos idénticos lo comparten. De cada minucia se guardan solo 3 números: posición (x, y) y ángulo (θ).", {}]]));
kids.push(CALLOUT("Privacidad por diseño", [["La foto de la huella NO se guarda: solo la lista de puntos. Con esa lista no se puede reconstruir el dedo. Cada plantilla ocupa apenas 2,4 KB.", {}]]));
kids.push(SEP());
kids.push(BODY([["La extracción la hace ", {}], ["MINDTCT", { bold: true }], [", el algoritmo del NIST que usa el FBI (código abierto, en ", {}], ["components/nbis/lfs/", { font: "Courier New" }], ["). Analiza la dirección de las crestas en cada zona, binariza la imagen (blanco/negro puro), la adelgaza a líneas de 1 píxel y recorre esas líneas buscando finales y bifurcaciones.", {}]]));
kids.push(H2("5.2  El comparador propio: geometría del colegio"));
kids.push(BODY([["El comparador oficial del NIST (bozorth3) falló en nuestro chip de 32 bits, así que escribimos uno desde cero en ", {}], ["nbis_wrap.c", { font: "Courier New" }], [". El algoritmo es geometría pura:", {}]]));
kids.push(...BUL([
  [["1. ", { bold: true, color: MINT }], ["Toma un par de minucias como «ancla» (una de cada huella) y supón que son el mismo punto.", {}]],
  [["2. ", { bold: true, color: MINT }], ["Rota y traslada TODOS los puntos de una huella para alinear las anclas (seno y coseno: trigonometría).", {}]],
  [["3. ", { bold: true, color: MINT }], ["Cuenta cuántos puntos caen cerca de un punto de la otra: distancia < 11 px (Pitágoras) y ángulo < 20°.", {}]],
  [["4. ", { bold: true, color: MINT }], ["Repite con cada ancla posible; el mejor conteo es el SCORE.", {}]],
]));
kids.push(...CODE("reconocimiento/nbis_wrap.c — el corazón del comparador (fragmento)", snippetAt("componentes/reconocimiento/nbis_wrap.c", "int fp_comparar", 1, 26)));
kids.push(BODY([["Para no comparar cada punto contra todos (lentísimo), los puntos se meten en una ", {}], ["rejilla espacial", { bold: true }], [": el espacio se divide en casillas de 11 px y solo se miran las 9 casillas vecinas. Eso bajó la comparación de 4,8 segundos a 30 milisegundos (¡160 veces!).", {}]]));
kids.push(H2("5.3  El umbral: ¿cuándo decimos que sí?"));
kids.push(TABLA(["Caso (medido en pruebas reales)", "Score típico", "Veredicto"], [
  [[["Mismo dedo, enrolado con 3 muestras", {}]], [["20 – 30", { bold: true, color: MINT }]], [["Reconocido ✓", {}]]],
  [[["Mismo dedo, 1 sola muestra", {}]], [["13 – 14", { bold: true, color: "B8860B" }]], [["¡Al filo! Por eso son 3 muestras", {}]]],
  [[["Dedo distinto", {}]], [["≤ 10", { bold: true, color: CORAL }]], [["Rechazado ✗", {}]]],
], [4800, 2100, 2460]));
kids.push(SEP());
kids.push(BODY([["El umbral es ", {}], ["14 coincidencias", { bold: true }], [". Subirlo rechaza a gente legítima (falso negativo); bajarlo deja pasar impostores (falso positivo). Es el mismo dilema del FaceID de un iPhone o la huella de un banco: una decisión de ingeniería, no una verdad matemática.", {}]]));

// ==================== 6 · BASE DE DATOS ====================
kids.push(H1("6", "La base de datos (db.c y db.h)"));
kids.push(H2("6.1  Tres tablas, como tres cuadernos"));
kids.push(BODY([["La base de datos guarda tres tipos de «fichas» (en C se llaman ", {}], ["struct", { font: "Courier New", bold: true }], ["): estudiantes, huellas y registros. Una struct es como un formulario con casillas de tamaño fijo:", {}]]));
kids.push(...CODE("modelo_estudiante.h — la ficha de un estudiante", snippetAt("main/modelos/modelo_estudiante.h", "typedef struct {", 0, 10)));
kids.push(BODY([["Cada casilla tiene tamaño fijo (", {}], ["nombre[40]", { font: "Courier New" }], [" = máximo 40 letras) para que todas las fichas midan lo mismo: así la ficha n.º 57 se encuentra con una multiplicación, sin buscar.", {}]]));
kids.push(TABLA(["Tabla", "Qué guarda", "Capacidad", "Tamaño por ficha"], [
  [[["estudiantes", { font: "Courier New" }]], [["id, documento, nombre, grado, activo", {}]], [["1.000", {}]], [["~124 bytes", {}]]],
  [[["huellas", { font: "Courier New" }]], [["a qué estudiante pertenece + la plantilla de minucias", {}]], [["3.000", {}]], [["~2,4 KB", {}]]],
  [[["registros", { font: "Courier New" }]], [["quién, qué servicio, resultado, score, fecha y hora", {}]], [["2.000 (rota)", {}]], [["~100 bytes", {}]]],
], [1900, 4360, 1500, 1600]));
kids.push(SEP());
kids.push(H2("6.2  Dos memorias: la rápida y la permanente"));
kids.push(BODY([["Las tablas viven en ", {}], ["RAM (PSRAM)", { bold: true }], [" —rapidísima, pero se borra sin luz, como un tablero— y cada cambio se copia a la ", {}], ["flash", { bold: true }], [" —mil veces más lenta para escribir, pero permanente, como un cuaderno—. La flash se organiza con un sistema de archivos (FATFS, el mismo formato de una memoria USB) en la partición «almacen» de 8 MB:", {}]]));
kids.push(TABLA(["Archivo en flash", "Contenido"], [
  [[["/almacen/estud.dat", { font: "Courier New" }]], [["[cuántos][ficha][ficha][ficha]…", { font: "Courier New" }]]],
  [[["/almacen/huellas.dat", { font: "Courier New" }]], [["[cuántas][huella][huella]…", { font: "Courier New" }]]],
  [[["/almacen/registros.dat", { font: "Courier New" }]], [["[cuántos][registro][registro]…", { font: "Courier New" }]]],
], [3200, 6160]));
kids.push(SEP());
kids.push(CALLOUT("El dato loco (y el bug que causó)", [["Mientras se escribe en la flash, el chip ENTERO se congela un instante — ¡ejecuta su programa desde esa misma memoria! Al principio guardábamos TODO en cada cambio (2,7 s congelado por huella). La solución: ", {}], ["anexar", { bold: true }], [" (append) solo la ficha nueva al final del archivo: dos escrituras chiquitas de milisegundos.", {}]], AMBERBG, "D4A017"));
kids.push(SEP());
kids.push(...CODE("almacenamiento.c — anexar un registro (la escritura inteligente)", snippetAt("main/modelos/almacenamiento.c", "bool alm_anexar", 1, 21)));
kids.push(H2("6.3  El cerrojo: para que dos no escriban a la vez"));
kids.push(BODY([["El lector y el servidor web tocan la base de datos AL MISMO TIEMPO. Sin protección, uno podría leer una ficha a medio escribir. La solución es un ", {}], ["mutex", { bold: true, color: MINT }], [" (cerrojo): como el baño de un avión — entra uno, se cierra, y el resto espera. Regla de oro aprendida a golpes: el cerrojo se toma por el MENOR tiempo posible; si lo retienes durante un trabajo largo, la página web se congela.", {}]]));
kids.push(H2("6.4  La API de la base de datos"));
kids.push(TABLA(["Función", "Qué hace"], [
  [[["db_init()", { font: "Courier New" }]], [["Monta la flash y carga las 3 tablas a RAM al encender.", {}]]],
  [[["db_add_estudiante(...)", { font: "Courier New" }]], [["Crea la ficha de un alumno y la guarda.", {}]]],
  [[["db_add_huella(id, dedo, plantilla)", { font: "Courier New" }]], [["Asocia una plantilla de minucias a un alumno (anexa a flash).", {}]]],
  [[["db_identificar(plantilla)", { font: "Courier New" }]], [["LA ESTRELLA: compara contra TODAS las huellas y devuelve el mejor candidato con su score.", {}]]],
  [[["db_ya_registrado_hoy(id, servicio, fecha)", { font: "Courier New" }]], [["El anti-duplicado: ¿ya recibió ESTE servicio HOY?", {}]]],
  [[["db_registrar(...)", { font: "Courier New" }]], [["Escribe el registro del evento (permitido/duplicado/…).", {}]]],
  [[["db_borrar_estudiante(id)", { font: "Courier New" }]], [["Elimina al alumno Y todas sus huellas.", {}]]],
  [[["db_lock() / db_unlock()", { font: "Courier New" }]], [["El cerrojo de la sección 6.3.", {}]]],
], [3900, 5460]));

// ==================== 7 · PORTAL ====================
kids.push(H1("7", "El WiFi propio y el servidor web (portal.c)"));
kids.push(H2("7.1  La placa crea su propia red"));
kids.push(BODY([["El P4 no tiene radio WiFi, pero la placa trae un segundo chip (ESP32-C6) que sí. Se comunican por un canal llamado SDIO. El código levanta un ", {}], ["SoftAP", { bold: true }], [": la placa se vuelve un mini-router que emite la red abierta «ALIMETRIK» con dirección fija ", {}], ["192.168.4.1", { font: "Courier New", bold: true }], [".", {}]]));
kids.push(H2("7.2  El truco del portal cautivo (DNS)"));
kids.push(BODY([["¿Por qué al conectarte el celular a veces abre solo la página? Porque la placa corre un mini-servidor ", {}], ["DNS", { bold: true }], [" que responde a CUALQUIER nombre de sitio con su propia dirección. El celular pregunta «¿dónde queda google.com?» y la placa contesta «aquí, en 192.168.4.1» — así toda ruta lleva al kiosco:", {}]]));
kids.push(...CODE("controlador_red.c — el DNS que responde todo con la IP del kiosco", snippetAt("main/controladores/controlador_red.c", "static void tarea_dns", 1, 16)));
kids.push(H2("7.3  La API: el idioma entre el chip y el celular"));
kids.push(BODY([["La página del celular no adivina nada: cada segundo le pregunta al chip por HTTP y recibe ", {}], ["JSON", { bold: true }], [" (texto con estructura). Estos son los «teléfonos internos» del sistema:", {}]]));
kids.push(TABLA(["Método y ruta", "Qué hace"], [
  [[["GET  /", { font: "Courier New" }]], [["Entrega la página web completa (vive incrustada en la flash).", {}]]],
  [[["GET  /api/estado", { font: "Courier New" }]], [["El corazón: métricas, reloj, servicio actual, estado del lector, último evento y cifras de HOY. La página lo pide cada segundo.", {}]]],
  [[["GET  /api/estudiantes", { font: "Courier New" }]], [["Lista de alumnos con cuántas huellas tiene cada uno.", {}]]],
  [[["GET  /api/registros", { font: "Courier New" }]], [["Los últimos 60 eventos con nombre resuelto.", {}]]],
  [[["POST /api/estudiantes", { font: "Courier New" }]], [["Crea un alumno (desde el formulario «+ Nuevo»).", {}]]],
  [[["POST /api/estudiantes/borrar", { font: "Courier New" }]], [["Elimina un alumno y sus huellas.", {}]]],
  [[["POST /api/enrolar", { font: "Courier New" }]], [["«El próximo dedo es del alumno X»: arranca el enrolamiento de 3 muestras (se cancela solo a los 90 s).", {}]]],
  [[["POST /api/hora", { font: "Courier New" }]], [["El celular le regala la hora a la placa (el chip no tiene reloj con pila).", {}]]],
], [3400, 5960]));
kids.push(SEP());
kids.push(H2("7.4  El reloj y los servicios por horario"));
kids.push(...CODE("controlador_red.c — ¿qué servicio toca ahora?", snippetAt("main/controladores/controlador_red.c", "const char *red_servicio_actual", 1, 11)));
kids.push(BODY([["La página web fija la hora automáticamente al abrirse (envía la del celular). Con la hora, el sistema sabe si son las 12:30 → «Almuerzo», y el anti-duplicado trabaja por servicio y fecha.", {}]]));

// ==================== 8 · PAGINA WEB ====================
kids.push(H1("8", "La página web: kiosco y métricas (index.html)"));
kids.push(BODY([["Toda la interfaz es UN archivo HTML (con su CSS y JavaScript) incrustado en la flash del chip. Tiene 5 pestañas: ", {}], ["Comedor", { bold: true, color: MINT }], [" (el kiosco de entrega, con tarjeta gigante verde/ámbar y sonidos), ", {}], ["Métricas", { bold: true }], [" (cifras de hoy y cobertura), ", {}], ["Alumnos", { bold: true }], [", ", {}], ["Registros", { bold: true }], [" y ", {}], ["+ Nuevo", { bold: true }], [".", {}]]));
kids.push(H2("8.1  El latido: polling cada segundo"));
kids.push(...CODE("vista_sistema.html — pedir datos sin quedarse colgado jamás", snippetAt("main/vistas/vista_sistema.html", "async function j(u,o,ms)", 0, 11)));
kids.push(BODY([["Cada segundo la página llama a ", {}], ["/api/estado", { font: "Courier New" }], [" y repinta lo que cambió. El «AbortController» es el seguro: si la placa tarda más de 6 segundos, la petición se cancela y el próximo intento la reemplaza — la página nunca se queda «pensando» eternamente.", {}]]));
kids.push(H2("8.2  El sonido del kiosco"));
kids.push(...CODE("vista_sistema.html — bips generados con matemáticas (WebAudio)", snippetAt("main/vistas/vista_sistema.html", "function beep(res)", 0, 13)));
kids.push(BODY([["No hay archivos de audio: los tonos se generan con osciladores. Entregado = dos notas agudas ascendentes (880 y 1318 Hz — ¡La y Mi de la escala musical!); rechazado = doble tono grave. El personal del comedor no necesita mirar la pantalla.", {}]]));

// ==================== 9 · EL VIAJE ====================
kids.push(H1("9", "El viaje completo de un almuerzo"));
kids.push(BODY("Juntemos todas las piezas. Juan pone su dedo a las 12:07:"));
kids.push(TABLA(["⏱", "Qué pasa", "Quién lo hace"], [
  [[["0,00 s", { bold: true }]], [["El lector detecta el dedo (interrupción 0x0101) y avisa.", {}]], [["driver_task", { font: "Courier New" }]]],
  [[["0,25 s", { bold: true }]], [["Pausa de asentamiento (el dedo se acomoda) y arranca la captura.", {}]], [["driver_task", { font: "Courier New" }]]],
  [[["0,75 s", { bold: true }]], [["Imagen completa leída por USB en una sola transferencia. Se descifra (XOR/LFSR) y pasa el control de calidad.", {}]], [["driver_task", { font: "Courier New" }]]],
  [[["1,00 s", { bold: true }]], [["La pantalla dice «HUELLA LEÍDA. Retira el dedo». La imagen entra a la cola. EL LECTOR QUEDA LIBRE.", {}]], [["driver_task", { font: "Courier New" }]]],
  [[["1-5 s", { bold: true }]], [["En paralelo: MINDTCT extrae ~35 minucias (≈4 s).", {}]], [["procesador_task", { font: "Courier New" }]]],
  [[["5,1 s", { bold: true }]], [["Identificación 1:N: el comparador prueba contra todas las huellas (30 ms cada una). Mejor score: 24 → ¡es Juan!", {}]], [["procesador_task", { font: "Courier New" }]]],
  [[["5,2 s", { bold: true }]], [["Anti-duplicado: ¿Juan ya tiene «Almuerzo» hoy? No → resultado «permitido». La pantalla muestra el verde y suena el bip.", {}]], [["procesador_task", { font: "Courier New" }]]],
  [[["5,8 s", { bold: true }]], [["El registro se anexa a la flash. Aunque se vaya la luz, quedó guardado.", {}]], [["procesador_task", { font: "Courier New" }]]],
  [[["+1 s", { bold: true }]], [["El celular (que pregunta cada segundo) pinta: «Juan Pérez — ALMUERZO ENTREGADO ✓ · 12:07».", {}]], [["index.html", { font: "Courier New" }]]],
], [1100, 6100, 2160]));
kids.push(SEP());
kids.push(CALLOUT("Si Juan intenta repetir", [["Mismo camino, pero ", {}], ["db_ya_registrado_hoy()", { font: "Courier New" }], [" encuentra el registro de las 12:07 → resultado «duplicado» → tarjeta ámbar «YA RECIBIÓ SU ALMUERZO HOY» + doble tono grave. Y también queda registrado el intento.", {}]], AMBERBG, "D4A017"));

// ==================== 10 · BUGS ====================
kids.push(H1("10", "Los 7 bugs épicos y sus lecciones"));
kids.push(BODY("Ningún sistema real nace funcionando. Estos fueron los mejores enemigos que enfrentamos — cada uno con su lección de ingeniería:"));
kids.push(TABLA(["Bug", "Qué pasaba", "La lección"], [
  [[["El boot loop fantasma", { bold: true }]], [["El WiFi arrancaba ANTES que el programa principal y se comía la memoria: el chip reiniciaba infinitamente sin llegar ni a la primera línea nuestra.", {}]], [["El orden de arranque importa. Controla TÚ cuándo arranca cada cosa.", {}]]],
  [[["El lector zombi", { bold: true }]], [["Un timeout dejaba una transferencia USB «en vuelo»; todo fallaba en el MISMO milisegundo, para siempre.", {}]], [["Todo lo que se empieza se debe poder cancelar. La pista estaba en dos logs con timestamp idéntico.", {}]]],
  [[["El congelamiento por flash", { bold: true }]], [["Guardar reescribía TODA la base de datos: 2,7 s con el chip entero congelado, cada vez.", {}]], [["Anexar, no reescribir. Las estructuras de datos importan.", {}]]],
  [[["El peaje de 250 ms", { bold: true }]], [["Cada clic tardaba EXACTAMENTE 250 ms de más: dos reglas del protocolo TCP se esperaban mutuamente (Nagle + delayed-ACK).", {}]], [["Los números demasiado exactos no son casualidad. 1 línea (TCP_NODELAY) = 35× más rápido.", {}]]],
  [[["El mensaje invisible", { bold: true }]], [["«HUELLA LEÍDA» duraba 230 ms en pantalla; el celular refresca cada 1000 ms: NADIE lo vio jamás. La gente creía que el sistema no servía.", {}]], [["Si el usuario no ve la confirmación, para él no funcionó. La comunicación ES parte de la función.", {}]]],
  [[["El dedo pegado", { bold: true }]], [["Quien dejaba el dedo apoyado generaba capturas en bucle: parpadeos, lecturas repetidas, caos.", {}]], [["Diseña para el uso real, no para el ideal: la gente no lee manuales.", {}]]],
  [[["El score al filo", { bold: true }]], [["Con 1 muestra, el mismo dedo daba 13-14 puntos… y el umbral era 14. Lotería.", {}]], [["Mide con datos reales, no de laboratorio. 3 muestras devolvieron el margen.", {}]]],
], [2100, 4300, 2960]));
kids.push(SEP());
kids.push(CALLOUT("La moraleja de todas", [["El log no miente. Cada bug se cazó igual: ", {}], ["evidencia → hipótesis → experimento → conclusión", { bold: true }], [". Depurar es aplicar el método científico con cronómetro.", {}]]));

// ==================== 11 · COMPILAR ====================
kids.push(H1("11", "Cómo compilar, flashear y probar"));
kids.push(BODY([["Se necesita el entorno gratuito de Espressif (", {}], ["ESP-IDF v5.5", { font: "Courier New" }], ["). Con la placa conectada por USB:", {}]]));
kids.push(...CODE("Terminal — compilar y grabar el firmware", [
  "# 1) activar el entorno de compilación",
  "source ~/esp/esp-idf/export.sh",
  "",
  "# 2) compilar (convierte el código C en un binario para el chip)",
  "idf.py build",
  "",
  "# 3) grabarlo en la placa por el puerto serie",
  "idf.py -p /dev/cu.usbserial-110 -b 460800 flash",
].join("\n")));
kids.push(BODY([["Al arrancar, el sistema ", {}], ["se prueba a sí mismo", { bold: true }], [" y lo cuenta por el puerto serie: verifica el comparador con minucias de referencia (debe dar 29/37/10), monta la base de datos, levanta el WiFi y hasta se hace peticiones HTTP a sí mismo midiendo la latencia (~7 ms). Si algo está mal, se ve ahí antes de tocar un dedo.", {}]]));
kids.push(CALLOUT("Para usarlo", [["1) Conecta el celular a la red WiFi «ALIMETRIK» · 2) Abre ", {}], ["192.168.4.1", { font: "Courier New", bold: true }], [" en el navegador · 3) Crea alumnos en «+ Nuevo» · 4) En «Alumnos», toca «+ huella» y pon 3 veces el dedo · 5) Pestaña «Comedor» y ¡a atender la fila!", {}]]));

// ==================== 12 · CIFRAS ====================
kids.push(H1("12", "El sistema en cifras"));
kids.push(TABLA(["Métrica", "Valor", "Detalle"], [
  [[["Interacción de la persona", {}]], [["1,5 s", { bold: true, color: MINT }]], [["desde que pone el dedo hasta «retira»", {}]]],
  [[["Captura + descifrado", {}]], [["0,5 – 1 s", { bold: true }]], [["111.360 píxeles en una sola transferencia USB", {}]]],
  [[["Extracción de minucias", {}]], [["2,3 – 4,9 s", { bold: true }]], [["corre en paralelo, no bloquea al lector", {}]]],
  [[["Comparar 2 huellas", {}]], [["~30 ms", { bold: true, color: MINT }]], [["miles de hipótesis de rotación con rejilla espacial", {}]]],
  [[["Respuesta de la página web", {}]], [["4 – 12 ms", { bold: true }]], [["medido por la propia placa (loopback)", {}]]],
  [[["Enrolar un alumno completo", {}]], [["~13 s", { bold: true }]], [["3 muestras guiadas por la pantalla", {}]]],
  [[["Guardar un registro", {}]], [["~0,5 s", { bold: true }]], [["anexado al final del archivo en flash", {}]]],
  [[["Capacidad", {}]], [["1.000 alumnos", { bold: true }]], [["3.000 huellas y 2.000 registros rotativos", {}]]],
  [[["Costo del hardware", {}]], [["~$25 USD", { bold: true, color: MINT }]], [["más el lector de huellas", {}]]],
  [[["Dependencia de internet", {}]], [["CERO", { bold: true, color: CORAL }]], [["todo vive y se decide dentro del chip", {}]]],
], [3100, 1900, 4360]));

// ==================== 13 · GLOSARIO ====================
kids.push(H1("13", "Glosario para no perderse"));
kids.push(TABLA(["Término", "En palabras simples"], [
  [[["API", { bold: true }]], [["El «menú de peticiones» que un programa le ofrece a otro. Aquí: las rutas /api/... que el celular le pide al chip.", {}]]],
  [[["Bit / Byte", { bold: true }]], [["Un bit es un 0 o un 1. Un byte son 8 bits: alcanza para un número de 0 a 255 (¡como un píxel!).", {}]]],
  [[["Driver", { bold: true }]], [["El traductor entre el sistema y un aparato: sabe qué bytes enviarle al lector para que haga cosas.", {}]]],
  [[["Firmware", { bold: true }]], [["El programa que vive grabado dentro de un chip.", {}]]],
  [[["Flash", { bold: true }]], [["Memoria permanente (como una USB): lenta para escribir, pero no se borra sin luz.", {}]]],
  [[["FreeRTOS / tarea", { bold: true }]], [["Mini sistema operativo del chip. Una tarea es un «trabajador» que ejecuta su labor en paralelo con otros.", {}]]],
  [[["HTTP / JSON", { bold: true }]], [["HTTP: el idioma de las páginas web. JSON: texto con estructura para pasar datos, ej. {\"nombre\":\"Juan\"}.", {}]]],
  [[["Interrupción (IRQ)", { bold: true }]], [["Un «¡oye, pasó algo!» que un aparato le grita al procesador (ej.: 0x0101 = hay un dedo).", {}]]],
  [[["LFSR", { bold: true }]], [["Fórmula que genera números que parecen aleatorios pero son repetibles: perfecta para llaves de cifrado.", {}]]],
  [[["Minucia", { bold: true }]], [["Punto donde una cresta de la huella termina o se bifurca. La «firma» del dedo.", {}]]],
  [[["Mutex (cerrojo)", { bold: true }]], [["Candado de software: mientras un trabajador lo tiene, los demás esperan. Evita datos a medio escribir.", {}]]],
  [[["Píxel", { bold: true }]], [["Un puntito de una imagen digital. Aquí, un número de 0 (negro) a 255 (blanco).", {}]]],
  [[["Polling", { bold: true }]], [["Preguntar repetidamente «¿hay algo nuevo?». La página lo hace cada segundo.", {}]]],
  [[["PSRAM", { bold: true }]], [["RAM extra del chip (32 MB): rápida y grande, pero se borra al apagar.", {}]]],
  [[["Score", { bold: true }]], [["El puntaje de parecido entre dos huellas: cuántas minucias coinciden tras alinearlas.", {}]]],
  [[["SoftAP", { bold: true }]], [["Modo en que el chip se vuelve un mini-router y crea su propia red WiFi.", {}]]],
  [[["Struct", { bold: true }]], [["En C: un «formulario» con casillas de tamaño fijo. Nuestras fichas de alumno son structs.", {}]]],
  [[["Timeout", { bold: true }]], [["Tiempo máximo de espera. Si se vence, hay que limpiar lo que quedó a medias (¡lección del lector zombi!).", {}]]],
  [[["Umbral", { bold: true }]], [["La raya que separa el «sí es la misma persona» (score ≥ 14) del «no lo es».", {}]]],
  [[["USB host", { bold: true }]], [["Actuar como el «jefe» del puerto USB (como un PC), dando energía y órdenes a los aparatos conectados.", {}]]],
  [[["XOR (⊕)", { bold: true }]], [["Operación que mezcla dos números y es reversible: dato ⊕ llave ⊕ llave = dato. Base del cifrado.", {}]]],
], [2200, 7160]));

kids.push(SEP());
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 400 }, children: [new D.TextRun({ text: "tu huella → números → geometría → almuerzo", font: "Calibri", size: PT(13), bold: true, color: MINT })] }));
kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: "ALIMETRIK · construido con herramientas libres y matemáticas del colegio", font: "Calibri", size: PT(9.5), color: MUTED, italics: true })] }));

// ---------- documento ----------
const doc = new D.Document({
  numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: D.LevelFormat.BULLET, text: "•", alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 230 } } } }] }] },
  styles: { default: { document: { run: { font: "Calibri", size: PT(11), color: GRIS } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1200, bottom: 1200, left: 1440, right: 1440 } } },
    footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [
      new D.TextRun({ text: "ALIMETRIK — explicación del código   ·   pág. ", font: "Calibri", size: PT(8.5), color: MUTED }),
      new D.TextRun({ children: [D.PageNumber.CURRENT], font: "Calibri", size: PT(8.5), color: MUTED }),
    ] })] }) },
    children: kids,
  }],
});

D.Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(BASE, "EXPLICACION-DEL-CODIGO.docx"), buf);
  console.log("DOCX generado OK");
});
