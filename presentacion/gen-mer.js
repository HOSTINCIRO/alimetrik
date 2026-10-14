/* Diagrama entidad-relación de ALIMETRIK (notación de pie de gallo) */
const sharp = require("sharp");
const fs = require("fs");

const W = 1720, H = 1180;
const NAVY="#17212B", MINT="#0CA678", MINTD="#0B8F68", BORDE="#C8D2DA";
const TXT="#2B3A46", MUT="#6B7A88", BG="#FFFFFF", CAB="#17212B", PK="#B8860B";

function tabla(x, y, titulo, campos, ancho=330){
  const hCab = 42, hFila = 26;
  const alto = hCab + campos.length*hFila + 10;
  let s = `<g>
    <rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="10" fill="#FFFFFF"
          stroke="${BORDE}" stroke-width="2" filter="url(#sombra)"/>
    <path d="M ${x} ${y+hCab} L ${x} ${y+10} Q ${x} ${y} ${x+10} ${y}
             L ${x+ancho-10} ${y} Q ${x+ancho} ${y} ${x+ancho} ${y+10}
             L ${x+ancho} ${y+hCab} Z" fill="${CAB}"/>
    <text x="${x+ancho/2}" y="${y+27}" font-family="Helvetica,Arial" font-size="16"
          font-weight="bold" fill="#FFFFFF" text-anchor="middle">${titulo}</text>`;
  campos.forEach((c,i)=>{
    const fy = y + hCab + 19 + i*hFila;
    const [nombre, tipo, clave] = c;
    const color = clave==="PK" ? MINTD : (clave==="FK" ? PK : TXT);
    const peso  = clave ? "bold" : "normal";
    const icono = clave==="PK" ? "🔑 " : (clave==="FK" ? "🔗 " : "");
    s += `<text x="${x+14}" y="${fy}" font-family="Helvetica,Arial" font-size="12.5"
            font-weight="${peso}" fill="${color}">${icono}${nombre}</text>
          <text x="${x+ancho-14}" y="${fy}" font-family="Helvetica,Arial" font-size="11"
            fill="${MUT}" text-anchor="end">${tipo}</text>`;
    if(i<campos.length-1) s += `<line x1="${x+10}" y1="${fy+7}" x2="${x+ancho-10}" y2="${fy+7}"
            stroke="#EDF1F4" stroke-width="1"/>`;
  });
  s += `</g>`;
  return {svg:s, alto, ancho, x, y};
}

/* patas de gallo: uno (|) y muchos (<) */
function relacion(x1,y1,x2,y2,etiqueta,ladoMuchos="fin"){
  const mx = (x1+x2)/2;
  const d = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
  const dirFin = x2 > mx ? -1 : 1;
  const pata = `M ${x2+dirFin*16} ${y2-9} L ${x2} ${y2} L ${x2+dirFin*16} ${y2+9}
                M ${x2+dirFin*16} ${y2} L ${x2} ${y2}`;
  const dirIni = x1 > mx ? -1 : 1;
  const uno = `M ${x1+dirIni*13} ${y1-9} L ${x1+dirIni*13} ${y1+9}`;
  return `<g>
    <path d="${d}" fill="none" stroke="${MINT}" stroke-width="2.4"/>
    <path d="${pata}" fill="none" stroke="${MINT}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="${uno}" fill="none" stroke="${MINT}" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="${mx-46}" y="${(y1+y2)/2-13}" width="92" height="26" rx="13"
          fill="#E6F7F1" stroke="${MINT}" stroke-width="1.4"/>
    <text x="${mx}" y="${(y1+y2)/2+5}" font-family="Helvetica,Arial" font-size="11.5"
          font-weight="bold" fill="${MINTD}" text-anchor="middle">${etiqueta}</text>
  </g>`;
}

const t = [];
t.push(tabla(90, 210, "ESTUDIANTES", [
  ["id","INT",'PK'], ["documento","VARCHAR(23) UNIQUE"], ["nombre","VARCHAR(39)"],
  ["apellido","VARCHAR(39)"], ["grado","VARCHAR(11)"], ["activo","TINYINT"],
  ["creado","INT"], ["autorizacion","TINYINT"], ["acudiente","VARCHAR(59)"],
  ["doc_acudiente","VARCHAR(23)"], ["fecha_autoriza","CHAR(10)"],
], 350));

t.push(tabla(690, 150, "HUELLAS", [
  ["id","INT",'PK'], ["estudiante_id","INT",'FK'], ["dedo","VARCHAR(23)"],
  ["plantilla","BLOB (2404 B)"],
], 330));

t.push(tabla(690, 430, "REGISTROS", [
  ["id","INT",'PK'], ["estudiante_id","INT",'FK'], ["servicio","VARCHAR(23)"],
  ["resultado","VARCHAR(19)"], ["score","INT"], ["fecha","CHAR(10)"], ["hora","CHAR(8)"],
], 330));

t.push(tabla(1230, 430, "SERVICIOS", [
  ["id","INT",'PK'], ["nombre","VARCHAR(23)"], ["inicio","SMALLINT"],
  ["fin","SMALLINT"], ["activo","TINYINT"],
], 330));

t.push(tabla(1230, 790, "USUARIOS", [
  ["id","INT",'PK'], ["usuario","VARCHAR(23) UNIQUE"], ["nombre","VARCHAR(47)"],
  ["sal","BLOB(8)"], ["hash","BLOB(32)"], ["rol","TINYINT"], ["activo","TINYINT"],
], 330));

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <filter id="sombra" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#17212B" flood-opacity="0.13"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="${BG}"/>
<text x="${W/2}" y="62" font-family="Helvetica,Arial" font-size="30" font-weight="bold"
      fill="${NAVY}" text-anchor="middle">ALIMETRIK · Modelo Entidad–Relación</text>
<text x="${W/2}" y="92" font-family="Helvetica,Arial" font-size="14.5" fill="${MUT}"
      text-anchor="middle">Sistema de comedor escolar con identificación biométrica</text>
<text x="${W/2}" y="118" font-family="Helvetica,Arial" font-size="12" fill="${MUT}"
      text-anchor="middle">Notación de pie de gallo (crow's foot) · 🔑 clave primaria · 🔗 clave foránea</text>`;

// relaciones
svg += relacion(440, 300, 690, 235, "1 : N");     // estudiantes -> huellas
svg += relacion(440, 380, 690, 520, "1 : N");     // estudiantes -> registros
svg += relacion(1230, 520, 1020, 560, "clasifica"); // servicios -> registros (logica)

t.forEach(x => svg += x.svg);

// leyenda
svg += `<g>
  <rect x="90" y="790" width="480" height="290" rx="10" fill="#F7FAFB" stroke="${BORDE}" stroke-width="1.6"/>
  <text x="112" y="822" font-family="Helvetica,Arial" font-size="15" font-weight="bold" fill="${NAVY}">Cardinalidad de las relaciones</text>
  <text x="112" y="852" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">• Un ESTUDIANTE tiene N HUELLAS (3 muestras del mismo dedo).</text>
  <text x="112" y="876" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">  Al borrarlo se eliminan en cascada (derecho de supresión).</text>
  <text x="112" y="906" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">• Un ESTUDIANTE genera N REGISTROS de entrega.</text>
  <text x="112" y="930" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">  estudiante_id = 0 cuando la huella no se reconoce.</text>
  <text x="112" y="960" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">• SERVICIOS define las franjas horarias; cada REGISTRO</text>
  <text x="112" y="984" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">  guarda el nombre del servicio vigente al pasar el dedo.</text>
  <text x="112" y="1014" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">• USUARIOS es independiente: administra el sistema, no</text>
  <text x="112" y="1038" font-family="Helvetica,Arial" font-size="12.5" fill="${TXT}">  participa en la operación del comedor.</text>
  <text x="112" y="1064" font-family="Helvetica,Arial" font-size="11.5" fill="${MUT}">Restricción: (estudiante_id, servicio, fecha) único con resultado 'permitido' → anti-duplicado.</text>
</g>`;
svg += `</svg>`;

fs.writeFileSync("/tmp/mer.svg", svg);
sharp(Buffer.from(svg)).png().toFile(
  "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/base-de-datos/diagramas/modelo-entidad-relacion.png"
).then(()=>console.log("diagrama entidad-relación generado"));
