/* ALIMETRIK — Paso a paso: cómo se cargó el proyecto en Jira (Word) */
const fs = require("fs");
const {D,NAVY,MINT,MINTBG,CODEBG,GRIS,MUTED,CORAL,AMBERBG,AMBER,PT,R,H1,H2,BODY,BUL,NUM,
  CODE,CALLOUT,TABLA,SEP,portada,documento} = require("./comun-doc.js");

const SALIDA = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/jira/PASO-A-PASO-JIRA.docx";
const CSV = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/jira/alimetrik-jira-v2.csv";

// datos reales precalculados (python csv maneja los campos multilínea)
const RES = JSON.parse(fs.readFileSync(__dirname+"/jira-resumen.json","utf8"));
const epicas = RES.epicas;
const totalPts = RES.totalPts, totalHijas = RES.totalHijas;

const kids = [];
portada(kids, fs, "El proyecto en Jira, paso a paso",
  "Cómo se cargó la gestión completa del proyecto ALIMETRIK en Jira Cloud:\népicas, historias, tareas, errores, estados, puntos y evidencias",
  "Jira Cloud · alimetrik1704.atlassian.net · proyecto ALI");

// ---- índice ----
kids.push(H1("","Contenido"));
[["1","Qué es Jira y qué se sube (y qué no)"],
 ["2","Crear la cuenta y el sitio"],
 ["3","Definir la estructura del trabajo"],
 ["4","Preparar el archivo CSV de carga"],
 ["5","El asistente de importación y sus errores"],
 ["6","La carga definitiva: por la API de Jira"],
 ["7","Adjuntar las evidencias a sus tareas"],
 ["8","Limpieza y verificación final"],
 ["9","Cómo abrir y presentar el proyecto"],
 ["10","Seguridad de la cuenta"]].forEach(([n,t])=>
  kids.push(new D.Paragraph({spacing:{after:70},children:[
    new D.TextRun({text:n+".  ",font:"Calibri",size:PT(12),bold:true,color:MINT}),
    new D.TextRun({text:t,font:"Calibri",size:PT(12),color:GRIS})]})));

// ---- 1 ----
kids.push(H1("1","Qué es Jira y qué se sube (y qué no)"));
kids.push(BODY([["Jira ",{bold:true}],["es una herramienta de "],["gestión de proyectos",{bold:true}],
  [": organiza el trabajo en épicas, historias, tareas y errores, con estados, responsables y puntos de esfuerzo. "],
  ["Jira NO almacena el código fuente",{bold:true}],
  [": el código vive en un repositorio (GitHub o Bitbucket) que después se enlaza con Jira."]]));
kids.push(BODY("Por eso, «subir el proyecto a Jira» significa cargar la ESTRUCTURA DEL TRABAJO: qué se hizo, en qué orden, con qué esfuerzo y en qué estado quedó. Eso es lo que documenta este paso a paso."));
kids.push(CALLOUT("La idea clave",[["Cada pieza del trabajo real del proyecto (el driver USB, el comparador de huellas, la base de datos, los manuales…) se convirtió en una "],["tarjeta de Jira",{bold:true}],[" con su descripción, sus criterios de aceptación y su estado final."]]));

// ---- 2 ----
kids.push(H1("2","Crear la cuenta y el sitio"));
kids.push(...NUM([
  [["Entrar a "],["https://www.atlassian.com/software/jira",{color:MINT,bold:true}],[" y pulsar «Get it free» (el plan gratuito admite hasta 10 usuarios: suficiente)."]],
  [["Registrarse con el correo del equipo: "],["alimetrik1704@gmail.com",{bold:true}],["."]],
  [["Elegir el nombre del sitio. Quedó: "],["alimetrik1704.atlassian.net",{bold:true,color:MINT}],["."]]]));
kids.push(CALLOUT("Cuidado con el correo",[["El correo de la cuenta es "],["alimetrik1704@gmail.com",{bold:true}],[" (con el 1704, igual que el sitio). Escribirlo mal fue causa de una tarde de errores de autenticación."]],AMBERBG,AMBER));

// ---- 3 ----
kids.push(H1("3","Definir la estructura del trabajo"));
kids.push(BODY("Todo el proyecto se organizó en 7 épicas (los grandes frentes de trabajo) y 41 actividades colgadas de ellas. Cada actividad es de uno de estos tipos:"));
kids.push(...BUL([
  [["Épica",{bold:true,color:MINT}],[" — un frente completo de trabajo (nivel 1 de jerarquía)."]],
  [["Historia",{bold:true}],[" — una funcionalidad vista desde el usuario («Como encargado, quiero…»)."]],
  [["Tarea",{bold:true}],[" — trabajo técnico o de documentación."]],
  [["Error",{bold:true,color:CORAL}],[" — un defecto real que se encontró y se corrigió (con su causa y su solución)."]]]));
kids.push(SEP());
kids.push(TABLA(["#","Épica","Actividades","Puntos"],
  epicas.map((e,i)=>[String(i+1), e.nombre, String(e.n), String(e.pts)])
    .concat([["", [["TOTAL",{bold:true}]], [[String(totalHijas),{bold:true}]], [[String(totalPts),{bold:true}]]]]),
  [700,5260,1800,1600]));
kids.push(SEP());
kids.push(BODY([["Los ",],["puntos de historia",{bold:true}],[" miden el esfuerzo relativo de cada actividad (1 = trivial, 13 = muy compleja). Registrar también los "],["errores",{bold:true}],[" con su análisis le da peso al proyecto: demuestra un proceso real de ingeniería, no solo el resultado final."]]));

// ---- 4 ----
kids.push(H1("4","Preparar el archivo CSV de carga"));
kids.push(BODY([["Toda la estructura se escribió en un archivo de hoja de cálculo ("],["alimetrik-jira-v2.csv",{bold:true,color:MINT}],[") con una fila por actividad y estas columnas:"]]));
kids.push(TABLA(["Columna","Qué lleva"],[
  ["ID de la actividad","Un número único por fila (1 a 48)"],
  ["Tipo de actividad","Épica, Historia, Tarea o Error"],
  ["Resumen","El título de la tarjeta (obligatorio en Jira)"],
  ["Descripción","Detalle y criterios de aceptación"],
  ["Elemento principal","El ID de la épica de la que cuelga (vacío en las épicas)"],
  ["Estado","Listo o Por hacer"],
  ["Etiquetas","alimetrik, bug, seguridad, documentacion…"],
  ["Puntos de historia","El esfuerzo estimado"]],[2700,6660]));
kids.push(SEP());
kids.push(CALLOUT("Dos decisiones que evitan problemas",[["(1) Encabezados en "],["español",{bold:true}],[", para que el asistente de Jira en español los asocie solo. (2) La jerarquía se declara con "],["números",{bold:true}],[" (Elemento principal → ID de la épica), no con nombres: es lo que el importador nuevo entiende."]]));

// ---- 5 ----
kids.push(H1("5","El asistente de importación y sus errores"));
kids.push(BODY("El primer intento fue por el asistente de importación de Jira (Configurar espacio → Subir CSV → Asociar campos → Asociar valores). Aparecieron dos errores que vale la pena documentar, porque cualquiera se los va a encontrar:"));
kids.push(H2("Error 1 · «Falta el resumen»"));
kids.push(BODY([["El CSV inicial tenía los encabezados en inglés (Summary) y el Jira estaba en español: el asistente no asoció la columna. "],
  ["Solución:",{bold:true}],[" encabezados en español, o asociar la columna a mano al campo «Resumen»."]]));
kids.push(H2("Error 2 · «Tipo de actividad no válido»"));
kids.push(BODY("Jira valida que cada tipo respete el NIVEL de jerarquía que declaran las columnas de ID y Elemento principal:"));
kids.push(TABLA(["Nivel","Tipos","Papel"],[
  ["1","Épica","Padre: agrupa el trabajo"],
  ["0","Historia, Tarea, Error","El trabajo en sí (cuelga de una épica)"],
  ["−1","Subtarea","Hija de un elemento de nivel 0"]],[1300,3600,4460]));
kids.push(SEP());
kids.push(BODY([["El asistente sugería asociaciones de nivel equivocado (por ejemplo «Subtarea» para una Historia) y todo quedaba marcado en rojo. "],
  ["Solución:",{bold:true}],[" abrir cada desplegable y elegir el tipo del MISMO nivel (Épica→Épica, Historia→Historia, Tarea→Tarea, Error→Error), sin dejar filas vacías y sin usar nunca «Subtarea»."]]));
kids.push(CALLOUT("Por qué al final NO se usó el asistente",[["El espacio de destino creado en las pruebas ni siquiera tenía el tipo «Historia», y el asistente no permite crear tipos de nivel épica. En vez de seguir peleando, se cargó todo por la "],["API oficial de Jira",{bold:true}],[" (capítulo 6), que da control total."]],AMBERBG,AMBER));

// ---- 6 ----
kids.push(H1("6","La carga definitiva: por la API de Jira"));
kids.push(BODY("Jira tiene una interfaz de programación (API REST) con la que se puede hacer todo lo del asistente, pero sin ambigüedades. Los pasos:"));
kids.push(H2("6.1  Crear un token de API"));
kids.push(...NUM([
  [["Entrar a "],["https://id.atlassian.com/manage-profile/security/api-tokens",{color:MINT}],["."]],
  [["«Create API token» → ponerle un nombre → copiar el token."]],
  [["El token acompaña al correo de la cuenta en cada llamada (autenticación básica)."]]]));
kids.push(H2("6.2  Crear el proyecto"));
kids.push(BODY([["Se creó el proyecto "],["ALIMETRIK - Comedor Escolar",{bold:true}],[" (clave "],["ALI",{bold:true,color:MINT}],[") con la plantilla "],["Scrum clásica",{bold:true}],[", elegida porque trae de serie los cuatro tipos necesarios (Épica, Historia, Tarea, Error) más los puntos de historia."]]));
kids.push(...CODE("Llamada de ejemplo (crear el proyecto)",
`curl -u correo:TOKEN -X POST \\
  https://alimetrik1704.atlassian.net/rest/api/3/project \\
  -H "Content-Type: application/json" -d '{
    "key": "ALI", "name": "ALIMETRIK - Comedor Escolar",
    "projectTypeKey": "software",
    "projectTemplateKey": "com.pyxis.greenhopper.jira:gh-simplified-scrum-classic"}'`));
kids.push(H2("6.3  Crear las épicas y las actividades"));
kids.push(BODY("Un script recorrió el CSV y creó cada fila con la API (primero las 7 épicas, luego las 41 actividades). A cada actividad se le asignó su épica con el campo parent:"));
kids.push(...CODE("Llamada de ejemplo (crear una historia colgada de su épica)",
`curl -u correo:TOKEN -X POST \\
  https://alimetrik1704.atlassian.net/rest/api/3/issue \\
  -H "Content-Type: application/json" -d '{
    "fields": {
      "project":  {"key": "ALI"},
      "issuetype":{"id": "10005"},          /* Historia */
      "summary":  "Comparador de huellas propio",
      "parent":   {"key": "ALI-2"},          /* su épica */
      "labels":   ["alimetrik","biometria"] }}'`));
kids.push(H2("6.4  Estados y puntos"));
kids.push(...BUL([
  [["Las 38 actividades terminadas (y las 7 épicas) se pasaron al estado "],["Listo",{bold:true,color:MINT}],[" con la API de transiciones; las 3 mejoras futuras quedaron en "],["Por hacer",{bold:true}],["."]],
  [["Los puntos de historia se escribieron en el campo correspondiente de cada actividad ("],["188 puntos en total",{bold:true}],[")."]]]));

// ---- 7 ----
kids.push(H1("7","Adjuntar las evidencias a sus tareas"));
kids.push(BODY("Los entregables del proyecto se adjuntaron a la tarjeta de Jira que les corresponde, también por la API (18 archivos en total):"));
kids.push(TABLA(["Tarjeta","Evidencia adjunta"],[
  ["ALI-42","Manual de usuario (Word)"],
  ["ALI-43","Manual técnico (Word)"],
  ["ALI-44","Explicación del código (Word)"],
  ["ALI-19","Modelo entidad-relación (PNG) y esquema SQL"],
  ["ALI-46","Presentación del proyecto (PDF)"],
  ["ALI-47","Las 12 capturas de pantalla de la entrega"]],[1800,7560]));

// ---- 8 ----
kids.push(H1("8","Limpieza y verificación final"));
kids.push(...BUL([
  [["Se eliminaron el proyecto de pruebas fallidas y el proyecto de ejemplo de Jira (van a la papelera, recuperables 60 días)."]],
  [["Verificación por la API: "],["48/48 elementos creados",{bold:true}],[", "],["41/41 actividades colgadas de su épica",{bold:true}],[" (cero huérfanas), 45 en Listo y 3 en Por hacer."]]]));
kids.push(CALLOUT("Regla de oro",[["Después de cualquier carga masiva, "],["verificar contando",{bold:true}],[": total de elementos, elementos sin padre y estados. Cinco minutos que evitan presentar un tablero a medias."]]));

// ---- 9 ----
kids.push(H1("9","Cómo abrir y presentar el proyecto"));
kids.push(...NUM([
  [["Abrir "],["https://alimetrik1704.atlassian.net/browse/ALI",{bold:true,color:MINT}],["."]],
  [["Iniciar sesión con "],["alimetrik1704@gmail.com",{bold:true}],["."]],
  [["En el menú lateral, elegir la vista según lo que se quiera mostrar."]]]));
kids.push(TABLA(["Vista","Qué muestra","Cuándo usarla"],[
  ["Backlog","Las 7 épicas con sus actividades agrupadas y estados","La mejor vista general"],
  ["Cronograma","Las épicas en línea de tiempo","Para presentar al profesor"],
  ["Tablero","Columnas Por hacer / En curso / Listo","Para mostrar el flujo de trabajo"]],[1700,4460,3200]));

// ---- 10 ----
kids.push(H1("10","Seguridad de la cuenta"));
kids.push(...BUL([
  [["Revocar el token de API",{bold:true}],[" cuando termine la carga (misma página donde se creó): un token es una llave de entrada completa."]],
  [["No compartir contraseñas por chat ni mensajes",{bold:true}],["; si ocurre, cambiarla de inmediato."]],
  [["La cuenta la comparte el equipo: acordar quién la administra y activar la verificación en dos pasos si el trabajo continúa."]]]));
kids.push(SEP());
kids.push(CALLOUT("Resumen en una frase",[["El trabajo real del proyecto ALIMETRIK quedó convertido en un tablero de gestión profesional: "],
  ["7 épicas, 41 actividades con jerarquía, estados y puntos, y 18 evidencias adjuntas",{bold:true}],[" — cargado por la API oficial de Jira y verificado."]]));

D.Packer.toBuffer(documento(kids, "ALIMETRIK · El proyecto en Jira, paso a paso")).then(b=>{
  fs.writeFileSync(SALIDA, b);
  console.log("OK:", SALIDA, b.length, "bytes");
});
