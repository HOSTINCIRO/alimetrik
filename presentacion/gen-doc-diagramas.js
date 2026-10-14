/* ALIMETRIK — Word con el diagrama de clases UML, el modelo relacional y el diccionario de datos.
 * Primero ejecutar gen-diagrama-clases.js (genera las imágenes). */
const fs = require("fs");
const D = require("docx");

const BASE = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/base-de-datos";
const SALIDA = `${BASE}/DIAGRAMA-BASE-DE-DATOS-ALIMETRIK.docx`;
const IMG_CLASES = `${BASE}/diagramas/diagrama-de-clases-uml.png`;
const IMG_REL = `${BASE}/diagramas/modelo-relacional.png`;

const MORADO = "2E2A7A", LILA = "ECE8FC", GRIS = "3A3A4A", MUT = "6B6B80";
const PT = n => n * 2;
const ANCHO = 14544;                       // ancho útil en DXA: 11" − 2 × 0,45"

const R = (t, o = {}) => new D.TextRun({ text: t, font: "Calibri", size: PT(o.size || 10.5),
  bold: !!o.bold, italics: !!o.it, color: o.color || GRIS });
const P = (runs, o = {}) => new D.Paragraph({
  children: (Array.isArray(runs) ? runs : [[runs, {}]]).map(([t, ro]) => R(t, { size: o.size, ...ro })),
  spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 }, alignment: o.align });
const H1 = (t, salto = true) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, pageBreakBefore: salto,
  spacing: { after: 140 }, children: [new D.TextRun({ text: t, font: "Calibri", size: PT(19), bold: true, color: MORADO })] });
const H2 = t => new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 200, after: 80 },
  children: [new D.TextRun({ text: t, font: "Calibri", size: PT(13), bold: true, color: MORADO })] });
const VINETA = runs => new D.Paragraph({ numbering: { reference: "vinetas", level: 0 }, spacing: { after: 70, line: 264 },
  children: (Array.isArray(runs) ? runs : [[runs, {}]]).map(([t, ro]) => R(t, ro)) });

function tabla(encabezados, filas, anchos, unidas = true) {
  const total = anchos.reduce((a, b) => a + b, 0);
  if (total !== ANCHO) throw new Error(`anchos suman ${total}, deben sumar ${ANCHO}`);
  const borde = { style: D.BorderStyle.SINGLE, size: 4, color: "C9C2EE" };
  const celda = (txt, w, cab, i, unir) => new D.TableCell({
    width: { size: w, type: D.WidthType.DXA },
    shading: { type: D.ShadingType.CLEAR, fill: cab ? MORADO : (i % 2 ? "F7F5FF" : "FFFFFF") },
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new D.Paragraph({ spacing: { after: 0, line: 252 }, keepNext: unir,
      children: (Array.isArray(txt) ? txt : [[String(txt), {}]]).map(([t, ro]) =>
        R(t, { size: 9.5, bold: cab || ro.bold, color: cab ? "FFFFFF" : (ro.color || GRIS), it: ro.it })) })],
  });
  return new D.Table({
    columnWidths: anchos, width: { size: total, type: D.WidthType.DXA },
    borders: { top: borde, bottom: borde, left: borde, right: borde, insideHorizontal: borde, insideVertical: borde },
    rows: [new D.TableRow({ tableHeader: true, children: encabezados.map((h, i) => celda(h, anchos[i], true, 0, true)) }),
           ...filas.map((f, ri) => new D.TableRow({ cantSplit: true,
             children: f.map((c, i) => celda(c, anchos[i], false, ri, unidas && ri < filas.length - 1)) }))],
  });
}

function imagenPagina(ruta, ancho, alto) {
  return new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 },
    children: [new D.ImageRun({ type: "png", data: fs.readFileSync(ruta), transformation: { width: ancho, height: alto } })] });
}

/* ------------------------------------------------------------------ */
const kids = [];

// Página 1 y 2: los diagramas a página completa (la "fotocopia")
const anchoPx = 969;                                   // 10,1" a 96 ppp
kids.push(imagenPagina(IMG_CLASES, anchoPx, Math.round(anchoPx * 2475 / 3615)));
kids.push(new D.Paragraph({ children: [new D.PageBreak()] }));
kids.push(imagenPagina(IMG_REL, anchoPx, Math.round(anchoPx * 2147 / 3615)));

// ---------------- Diccionario de datos ----------------
kids.push(H1("Diccionario de datos"));
kids.push(P([["Cada tabla del modelo con sus campos. Las clases siguen el modelo trabajado en clase (grados, grupos, estudiantes, biometría, asistencias, tipo de alimento, alertas y usuarios) y "],
  ["cada campo corresponde a un dato que el sistema ALIMETRIK maneja", { bold: true }],
  ["; las pocas diferencias con lo que la placa guarda están en el último capítulo. En la columna Llave: PK = llave primaria, FK = llave foránea, UQ = valor único. ENUM = lista de valores fijos, que se detallan en la descripción."]]));

const COLS = [2300, 2100, 1900, 900, 7344];
const ENC = ["Campo", "Tipo", "Llave", "¿Nulo?", "Descripción"];
const dic = [
  ["grados", "Grados escolares del colegio.", [
    ["id_grado", "INT", "PK", "No", "Identificador del grado."],
    ["nombre_grado", "VARCHAR(10)", "", "No", "Nombre del grado (por ejemplo «11»)."]]],
  ["grupos", "Grupos o cursos de cada grado.", [
    ["id_grupo", "INT", "PK", "No", "Identificador del grupo."],
    ["id_grado", "INT", "FK → grados", "No", "Grado al que pertenece el grupo."],
    ["nombre_grupo", "VARCHAR(11)", "", "No", "Nombre del grupo tal como lo muestra el equipo (por ejemplo «11-A»)."]]],
  ["estudiantes", "Beneficiarios del comedor y su autorización para el uso de la huella.", [
    ["id_estudiante", "INT", "PK", "No", "Identificador. Nunca se reutiliza, aunque el estudiante se borre."],
    ["id_grupo", "INT", "FK → grupos", "No", "Grupo del estudiante."],
    ["documento", "VARCHAR(23)", "UQ", "No", "Documento de identidad. No se puede repetir."],
    ["nombre", "VARCHAR(39)", "", "No", "Nombres."],
    ["apellido", "VARCHAR(39)", "", "Sí", "Apellidos."],
    ["activo", "BOOLEAN", "", "No", "Se pone en falso al revocar la autorización. Como revocar también borra las huellas, el kiosco ya no reconoce al estudiante («HUELLA NO RECONOCIDA»). «NO AUTORIZADO» queda para un estudiante identificado que esté inactivo."],
    ["autorizacion", "BOOLEAN", "", "No", "Consentimiento para tratar su huella (Ley 1581 de 2012). Sin él no se puede registrar al estudiante ni enrolar su huella."],
    ["acudiente", "VARCHAR(59)", "", "No", "Persona que firma la autorización (representante legal). Es obligatorio al registrar al estudiante."],
    ["doc_acudiente", "VARCHAR(23)", "", "No", "Documento de identidad del acudiente. Obligatorio al registrar."],
    ["fecha_autoriza", "DATE", "", "No", "Fecha de la autorización. El equipo la toma automáticamente de su reloj al registrar."]]],
  ["biometria", "Plantillas de huella de cada estudiante (3 muestras por dedo).", [
    ["id_huella", "INT", "PK", "No", "Identificador de la plantilla. En la placa no es un campo: cada plantilla se identifica por su posición en huellas.dat."],
    ["id_estudiante", "INT", "FK → estudiantes", "No", "Dueño de la huella. Al borrar al estudiante o revocar su autorización, sus huellas se eliminan (composición)."],
    ["dedo", "VARCHAR(23)", "", "No", "Etiqueta de la muestra (por ejemplo «muestra 1»)."],
    ["plantilla", "BLOB", "", "No", "Minucias de la huella: posición x, y y ángulo de cada una. No se guarda la imagen del dedo."],
    ["num_minucias", "SMALLINT", "", "No", "Cantidad de minucias de la plantilla (en la placa va dentro de la propia plantilla). Para enrolar se exigen al menos 12."]]],
  ["tipo_alimento", "Servicios del comedor y su franja horaria (configurables desde la web).", [
    ["id_tipo", "INT", "PK", "No", "Identificador del servicio."],
    ["nombre", "VARCHAR(23)", "", "No", "Desayuno, Almuerzo, Refrigerio… (hasta 8 servicios)."],
    ["hora_inicio", "TIME", "", "No", "Inicio de la franja."],
    ["hora_fin", "TIME", "", "No", "Fin de la franja. Debe ser posterior a la hora de inicio: el equipo no acepta franjas que crucen la medianoche."],
    ["activo", "BOOLEAN", "", "No", "Un servicio suspendido no entrega raciones."]]],
  ["asistencias", "Cada vez que un estudiante pone el dedo en el lector.", [
    ["id_asistencia", "INT", "PK", "No", "Identificador del registro."],
    ["id_estudiante", "INT", "FK → estudiantes", "Sí", "Estudiante identificado. Queda vacío si la huella no se reconoció."],
    ["id_tipo", "INT", "FK → tipo_alimento", "Sí", "Servicio vigente a esa hora. Queda vacío si fue fuera de horario."],
    ["fecha", "DATE", "", "No", "Día del registro."],
    ["hora", "TIME", "", "No", "Hora del registro."],
    ["resultado", "ENUM", "", "No", "permitido · duplicado · no_autorizado · desconocido · sin_servicio."],
    ["score", "SMALLINT", "", "Sí", "Puntaje de coincidencia de la huella. Desde 14 se considera el mismo dedo."]]],
  ["alertas", "Intentos que no terminaron en entrega de ración.", [
    ["id_alerta", "INT", "PK", "No", "Identificador de la alerta."],
    ["id_asistencia", "INT", "FK → asistencias, UQ", "No", "Asistencia que la originó. Es única: una asistencia genera como máximo una alerta."],
    ["tipo", "ENUM", "", "No", "duplicado · desconocido · no_autorizado · sin_servicio."],
    ["descripcion", "VARCHAR(120)", "", "Sí", "Mensaje mostrado (por ejemplo «YA RECIBIÓ SU ALMUERZO HOY»)."],
    ["fecha_hora", "DATETIME", "", "No", "Momento en que se generó."]]],
  ["usuarios", "Encargados que administran el sistema (administrador y operador).", [
    ["id_usuario", "INT", "PK", "No", "Identificador del usuario."],
    ["usuario", "VARCHAR(23)", "UQ", "No", "Nombre de acceso."],
    ["nombre", "VARCHAR(47)", "", "No", "Nombre completo."],
    ["sal", "BINARY(8)", "", "No", "Valor aleatorio distinto para cada usuario."],
    ["hash_clave", "BINARY(32)", "", "No", "SHA-256 de la sal más la contraseña. La contraseña nunca se guarda."],
    ["rol", "ENUM", "", "No", "administrador u operador: indica de qué subclase es el usuario."],
    ["activo", "BOOLEAN", "", "No", "Un usuario inactivo no puede iniciar sesión."]]],
];
dic.forEach(([nombre, desc, filas]) => {
  kids.push(H2(nombre));
  kids.push(new D.Paragraph({ keepNext: true, spacing: { after: 80 }, children: [R(desc, { it: true, color: MUT })] }));
  kids.push(tabla(ENC, filas.map(f => [
    [[f[0], { bold: f[2].startsWith("PK") }]], f[1], [[f[2], { bold: !!f[2], color: f[2].startsWith("PK") ? "7A5A00" : (f[2].startsWith("FK") ? "1F4E99" : (f[2] === "UQ" ? "1E6B3A" : GRIS)) }]], f[3], f[4]]), COLS));
});

// ---------------- Relaciones ----------------
kids.push(H1("Relaciones del modelo"));
kids.push(P("Las diez relaciones del diagrama de clases, con su tipo UML, su multiplicidad y cómo se guardan en la base de datos. Están las cinco interacciones UML: asociación, agregación, composición, herencia y dependencia."));
const REL = [2700, 1700, 1500, 5644, 3000];
kids.push(tabla(["Relación", "Tipo UML", "Multiplicidad", "Cómo se lee", "En la base de datos"], [
  ["GRADOS ◇— GRUPOS", "Agregación", "1 a 1..*", "Un grado agrupa uno o varios grupos (11 → 11-A, 11-B). Cada grupo es de un solo grado.", "grupos.id_grado"],
  ["GRUPOS ◇— ESTUDIANTES", "Agregación", "1 a 0..*", "Un grupo contiene cero o más estudiantes. El estudiante sigue existiendo si cambia de grupo; por eso es agregación y no composición.", "estudiantes.id_grupo"],
  ["ESTUDIANTES ◆— BIOMETRÍA", "Composición", "1 a 0..*", "Un estudiante posee sus huellas. Si se borra al estudiante o se revoca su autorización, sus huellas desaparecen con él.", "biometria.id_estudiante (borrado en cascada)"],
  ["ESTUDIANTES — ASISTENCIAS", "Asociación", "0..1 a 0..*", "Un estudiante recibe muchas asistencias. Una asistencia tiene como máximo un estudiante: ninguno si la huella no se reconoció.", "asistencias.id_estudiante (puede ser nulo)"],
  ["TIPO_ALIMENTO — ASISTENCIAS", "Asociación", "0..1 a 0..*", "Cada asistencia corresponde al servicio vigente a esa hora. Fuera de horario no corresponde a ninguno.", "asistencias.id_tipo (puede ser nulo)"],
  ["ASISTENCIAS — ALERTAS", "Asociación", "1 a 0..1", "Una asistencia genera como máximo una alerta, cuando el resultado no es «permitido».", "alertas.id_asistencia (única)"],
  ["ASISTENCIAS ⇢ BIOMETRÍA", "Dependencia «usa»", "—", "Para registrar una asistencia se compara la huella contra las plantillas guardadas. Es un uso, no una pertenencia: no lleva llave.", "Sin llave"],
  ["USUARIOS ⇢ ASISTENCIAS", "Dependencia «consulta»", "—", "Los encargados consultan los registros y las métricas del día.", "Sin llave"],
  ["USUARIOS ⇢ ALERTAS", "Dependencia «consulta»", "—", "Los encargados revisan los duplicados bloqueados y las huellas no reconocidas.", "Sin llave"],
  ["ESTUDIANTES — ALERTAS (del tablero)", "Asociación derivada", "0..1 a 0..*", "En el tablero aparece la línea Estudiantes–Alertas con «*?». Un estudiante tiene muchas alertas y una alerta puede no tener estudiante (huella no reconocida). No se dibuja como línea propia porque se obtiene pasando por ASISTENCIAS.", "Sin llave propia (asistencias.id_estudiante)"],
  ["ADMINISTRADOR, OPERADOR ▷ USUARIOS", "Herencia", "—", "Los dos son usuarios: heredan sus datos y el inicio de sesión. El administrador además gestiona estudiantes, huellas, servicios y usuarios; el operador maneja el kiosco y consulta.", "usuarios.rol (una sola tabla)"],
].map(f => [[[f[0], { bold: true }]], f[1], f[2], f[3], f[4]]), REL));

kids.push(H2("Notas de notación"));
[
  [["Multiplicidad: ", { bold: true }], ["«*» significa «muchos». Algunos textos lo dibujan como ∞; en UML se escribe *."]],
  [["Rombos: ", { bold: true }], ["el rombo va en el lado del todo. Vacío (◇) = agregación: la parte puede existir sola. Lleno (◆) = composición: la parte muere con el todo."]],
  [["Herencia: ", { bold: true }], ["el triángulo vacío apunta a la clase padre. USUARIOS es abstracta ({abstracta}, nombre en cursiva): no existen usuarios genéricos, todo usuario es administrador u operador."]],
  [["Dependencia: ", { bold: true }], ["la flecha punteada va de la clase que usa hacia la clase usada."]],
  [["Llaves foráneas: ", { bold: true }], ["en el diagrama de clases se muestran los campos FK para que se vea cómo cada relación llega a la base de datos."]],
  [["Rombos del tablero: ", { bold: true }], ["en el tablero los rombos se dibujaron rellenos. Aquí GRADOS ◇ GRUPOS se dejó como agregación (rombo vacío), igual que el diagrama de referencia, porque un grupo puede reorganizarse de grado sin perder su existencia; la composición (◆) se usa solo donde la parte muere con el todo (ESTUDIANTES ◆ BIOMETRÍA)."]],
  [["«Reg.» y «generan» del tablero: ", { bold: true }], ["en el tablero USUARIOS se une con ASISTENCIAS («Reg.») y con ALERTAS («generan»). En el equipo la asistencia la registra el lector de huellas en el kiosco, sin guardar qué usuario estaba de turno, y la alerta la genera la propia asistencia. Por eso aquí los usuarios se unen con dependencias «consulta» y no con llaves foráneas."]],
].forEach(v => kids.push(VINETA(v)));

// ---------------- Correspondencia con el equipo ----------------
kids.push(H1("Del diagrama a la placa"));
kids.push(P([["ALIMETRIK es un sistema embebido: no usa un servidor MySQL, sino que guarda sus tablas como archivos en la memoria flash de la placa ESP32-P4. Esta tabla muestra dónde vive cada clase en el equipo y "],
  ["en qué se diferencia del diagrama", { bold: true }], ["."]]));
const COR = [2600, 4600, 7344];
kids.push(tabla(["Clase del diagrama", "Dónde la guarda el equipo", "Diferencia con el diagrama"], [
  ["GRADOS y GRUPOS", "Dentro de cada estudiante, en el campo grado (por ejemplo «11-A») de estudian.dat.", "El diagrama los separa en dos tablas para no repetir el mismo texto en cada estudiante (normalización)."],
  ["ESTUDIANTES", "estudian.dat (hasta 1000 estudiantes).", "Igual, pero con id_grupo en lugar del texto del grado."],
  ["BIOMETRÍA", "huellas.dat (hasta 3000 plantillas).", "Igual. Se guarda solo la plantilla de minucias, nunca la imagen de la huella."],
  ["TIPO_ALIMENTO", "servicio.dat (hasta 8 servicios), configurable desde la web.", "Las horas se guardan como minutos desde la medianoche (06:00 = 360)."],
  ["ASISTENCIAS", "registro.dat (hasta 2000 registros; al llenarse se descarta el 10 % más antiguo).", "El equipo guarda el nombre del servicio en lugar de su id."],
  ["ALERTAS", "No hay archivo aparte: son las asistencias cuyo resultado no es «permitido». Se ven en Métricas y en Registros.", "El diagrama las separa para poder describirlas y consultarlas por sí solas."],
  ["USUARIOS, ADMINISTRADOR, OPERADOR", "usuarios.dat (hasta 16 usuarios), con el campo rol: 0 = operador, 1 = administrador.", "Igual: la herencia se guarda en una sola tabla con el campo rol."],
].map(f => [[[f[0], { bold: true }]], f[1], f[2]]), COR));

kids.push(H2("Modelo de diseño y modelo físico"));
kids.push(P([["Este documento presenta el modelo de diseño completo (8 clases). El archivo "], ["esquema-mysql.sql", { bold: true }],
  [" y los pantallazos de phpMyAdmin de la entrega corresponden a la implementación física de 5 tablas (usuarios, estudiantes, huellas, registros y servicios), que es lo que el equipo realmente guarda. Las dos versiones describen el mismo sistema: el modelo de diseño separa grados, grupos y alertas para no repetir datos y para explicar el sistema; el físico los guarda dentro de estudiantes y registros."]]));

/* ------------------------------------------------------------------ */
const doc = new D.Document({
  creator: "ALIMETRIK", title: "Diagrama de la base de datos ALIMETRIK",
  numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: D.LevelFormat.BULLET, text: "•",
    alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 230 } } } }] }] },
  styles: { default: { document: { run: { font: "Calibri", size: PT(10.5), color: GRIS } } },
    paragraphStyles: [{ id: "PiePagina", name: "Pie de página ALIMETRIK", basedOn: "Normal",
      run: { font: "Calibri", size: PT(8.5), color: MUT } }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840, orientation: D.PageOrientation.LANDSCAPE },
      margin: { top: 648, bottom: 648, left: 648, right: 648, footer: 300 } } },
    footers: { default: new D.Footer({ children: [new D.Paragraph({ style: "PiePagina", alignment: D.AlignmentType.CENTER, children: [
      new D.TextRun({ text: "ALIMETRIK · Modelo de la base de datos   ·   pág. ", font: "Calibri", size: PT(8.5), color: MUT }),
      new D.TextRun({ children: [D.PageNumber.CURRENT], font: "Calibri", size: PT(8.5), color: MUT })] })] }) },
    children: kids,
  }],
});
D.Packer.toBuffer(doc).then(b => { fs.writeFileSync(SALIDA, b); console.log("OK:", SALIDA, b.length, "bytes"); });
