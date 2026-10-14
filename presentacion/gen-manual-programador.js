/* ALIMETRIK — MANUAL DEL PROGRAMADOR (Word)
 * Los conteos de líneas se leen del código real al generar el documento. */
const fs = require("fs");
const path = require("path");
const {D,NAVY,MINT,MINTBG,CODEBG,GRIS,MUTED,CORAL,AMBERBG,AMBER,PT,R,H1,H2,BODY,BUL,NUM,
  CODE,CALLOUT,TABLA,SEP,portada,documento} = require("./comun-doc.js");

const RAIZ = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4";
const MAIN = path.join(RAIZ, "test-driver-4500/main");
const SALIDA = path.join(RAIZ, "ALIMETRIK-entrega/manuales/MANUAL-DEL-PROGRAMADOR.docx");
const lineas = rel => fs.readFileSync(path.join(MAIN, rel), "utf8").split("\n").length - 1;

/* ---- mini-formato: **negrita** y `código` dentro de una cadena ---- */
function rich(s) {
  const out = []; const re = /(\*\*[^*]+\*\*|`[^`]+`)/g; let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push([s.slice(last, m.index), {}]);
    const t = m[0];
    out.push(t.startsWith("**") ? [t.slice(2, -2), { bold: true }] : [t.slice(1, -1), { font: "Courier New" }]);
    last = m.index + t.length;
  }
  if (last < s.length) out.push([s.slice(last), {}]);
  return out.length ? out : [["", {}]];
}
const P = s => BODY(rich(s));
const L = items => BUL(items.map(rich));
const N = items => NUM(items.map(rich));
const NOTA = (t, s, tipo) => CALLOUT(t, rich(s), tipo === "a" ? AMBERBG : MINTBG, tipo === "a" ? AMBER : MINT);
const tb = (enc, filas, anchos) => TABLA(enc, filas.map(f => f.map(c => Array.isArray(c) ? c : rich(String(c)))), anchos);
const COD = (t, s) => CODE(t, s);

const k = [];

/* ================= PORTADA ================= */
portada(k, fs, "Manual del programador",
  "Cómo está construido el firmware, cómo se compila y se prueba, y cómo extenderlo sin romperlo",
  "ESP32-P4 (Guition) · Lector DigitalPersona U.are.U 4500 · ESP-IDF v5.5 · Lenguaje C",
  "Versión 1.0 · Octubre de 2026");

/* ================= ÍNDICE ================= */
k.push(H1("", "Contenido"));
["Introducción y a quién va dirigido", "Preparar el entorno y obtener el código", "Mapa del código",
 "Arranque del programa", "Modelos: la capa de datos", "Controladores: el lector de huellas",
 "Controladores: red, sesiones y servidor web", "Vistas: la interfaz web", "El motor de reconocimiento",
 "Concurrencia y memoria", "Recetas: cómo extender el sistema", "Reglas de oro y errores que no se deben repetir",
 "Pruebas y depuración", "Convenciones del código", "Control de versiones y entrega",
 "Anexo A: referencia de funciones", "Anexo B: constantes y límites"]
  .forEach((t, i) => k.push(new D.Paragraph({ spacing: { after: 60 }, children: [
    new D.TextRun({ text: (i < 15 ? String(i + 1) : (i === 15 ? "A" : "B")) + ".  ", font: "Calibri", size: PT(12), bold: true, color: MINT }),
    new D.TextRun({ text: t, font: "Calibri", size: PT(12), color: GRIS })] })));

/* ================= 1 ================= */
k.push(H1("1", "Introducción y a quién va dirigido"));
k.push(P("Este manual es para la persona que va a **leer, modificar o ampliar el código** de ALIMETRIK. Complementa a los otros documentos: el manual de usuario explica cómo se usa el sistema; el manual técnico, cómo se instala y se mantiene; y este explica **cómo está hecho por dentro**."));
k.push(H2("1.1  Qué se necesita saber"));
k.push(...L([
  "**Lenguaje C** (punteros, estructuras, cadenas con terminador nulo). Todo el firmware está en C.",
  "**FreeRTOS** a nivel básico: tareas, colas, semáforos y cerrojos (mutex). El sistema corre varias tareas a la vez.",
  "**ESP-IDF 5.5**, el entorno de Espressif: `idf.py`, componentes, `sdkconfig`, particiones.",
  "**HTML, CSS y JavaScript** sencillos, sin frameworks, para tocar la interfaz web.",
  "Nociones de **HTTP/JSON**. La interfaz y el equipo se hablan con una API REST propia.",
]));
k.push(H2("1.2  Qué es ALIMETRIK en una página"));
k.push(P("Una placa **ESP32-P4** lee la huella de un estudiante con un lector **DigitalPersona U.are.U 4500** por USB, la compara contra las plantillas guardadas, decide si le toca ración (según el servicio vigente por hora y si ya la recibió hoy) y lo registra. Todo vive en la placa: crea su propia red WiFi (`ALIMETRIK`) y sirve una web de administración en `http://192.168.4.1`. No necesita internet ni servidor."));
k.push(...COD("Flujo de una verificación (de principio a fin)", [
  "dedo en el lector",
  "  -> tarea del lector    captura la imagen (~1,5 s) y la encola",
  "  -> tarea procesadora   extrae minucias (2,3 a 4,9 s)",
  "  -> bio_identificar()   compara contra todas las plantillas (~30 ms c/u)",
  "  -> decidir resultado   permitido | duplicado | no_autorizado |",
  "                         desconocido | sin_servicio",
  "  -> reg_*()             guarda el registro (append en flash)",
  "  -> lector_mensaje_*()  deja el aviso que el celular consulta cada segundo"].join("\n")));
k.push(NOTA("Antes de tocar nada", "Lea el capítulo 12 (reglas de oro). Cada una de esas reglas costó horas de depuración en hardware real, y la mayoría de los errores nuevos son una de ellas vuelta a cometer."));

/* ================= 2 ================= */
k.push(H1("2", "Preparar el entorno y obtener el código"));
k.push(P("La instalación de ESP-IDF 5.5 (Linux, macOS o Windows) está explicada paso a paso en el capítulo 2 del **manual técnico**. Aquí se parte de que `idf.py` ya funciona."));
k.push(H2("2.1  Descargar el código"));
k.push(...COD("Clonar y preparar (una sola vez)", [
  "git clone https://github.com/HOSTINCIRO/alimetrik.git",
  "cd alimetrik/test-driver-4500",
  "source ~/esp/esp-idf/export.sh      # en Windows: ESP-IDF Command Prompt",
  "idf.py reconfigure                  # descarga esp_hosted y esp_wifi_remote",
  "./parches/aplicar-parches.sh        # OBLIGATORIO, ver el recuadro",
  "idf.py build                        # 5 a 10 minutos la primera vez"].join("\n")));
k.push(NOTA("El parche de esp_hosted es obligatorio", "El componente `esp_hosted` arranca solo, **antes** de `app_main()`, y agota la memoria interna. Sin el parche la placa entra en un bucle de reinicios (`assert esp_startup_start_app`) y **nunca llega al programa**. El parche (carpeta `parches/`) vacía ese arranque automático; el firmware lo inicia a mano desde `controlador_red.c`. La carpeta `managed_components/` no se guarda en git, así que el parche **se pierde cada vez que se vuelve a descargar** el componente: hay que reaplicarlo.", "a"));
k.push(H2("2.2  El ciclo de trabajo diario"));
k.push(...COD("Compilar, grabar y mirar el resultado", [
  "idf.py build",
  "# liberar el puerto si algo lo tiene abierto:",
  "for p in $(lsof -t /dev/cu.usbserial-110); do kill -9 $p; done",
  "idf.py -p /dev/cu.usbserial-110 -b 460800 flash"].join("\n")));
k.push(...L([
  "**El número del puerto cambia** según el puerto USB del computador (`-110`, `-210`…). Búsquelo con `ls /dev/cu.usb*` cada vez.",
  "**No use idf.py monitor en scripts**: es interactivo. Para capturar el arranque use el script de Python del capítulo 13.",
  "Reflashear la aplicación **no borra los datos**: viven en otra partición (`almacen`). Solo `erase_flash` los borra.",
]));
k.push(H2("2.3  Herramientas útiles"));
k.push(tb(["Herramienta", "Para qué"], [
  ["`idf.py build / flash`", "Compilar y grabar."],
  ["`pyserial` (Python)", "Capturar el log por el puerto serie con reinicio automático."],
  ["`pandoc`, LibreOffice, Node.js", "Solo para regenerar los documentos Word y la presentación (carpeta `presentacion/`)."],
  ["`gh` (GitHub CLI)", "Publicar el código en GitHub."],
], [3000, 6360]));

/* ================= 3 ================= */
k.push(H1("3", "Mapa del código"));
k.push(P("El firmware sigue la arquitectura **MVC** (Modelos, Vistas, Controladores), dentro de `test-driver-4500/main/`. Cada capa tiene una responsabilidad y una dirección de dependencia: **los modelos no saben nada de los controladores**, y las vistas solo formatean datos."));
const fila = (rel, resp) => [`\`${rel}\``, String(lineas(rel)), resp];
k.push(tb(["Archivo", "Líneas", "Responsabilidad"], [
  fila("main.c", "Punto de entrada: monta la memoria, carga los modelos y arranca el lector, la red y la web."),
  fila("modelos/almacenamiento.c", "Memoria permanente (FATFS): cerrojo, guardado atómico, anexado y carga de tablas."),
  fila("modelos/modelo_estudiante.c", "Estudiantes, consentimiento (Ley 1581), migración de formato, secuencia de ids."),
  fila("modelos/modelo_biometrico.c", "Plantillas de huella e identificación 1:N."),
  fila("modelos/modelo_registro.c", "Bitácora de entregas, anti-duplicado y rotación."),
  fila("modelos/modelo_usuario.c", "Usuarios del sistema, contraseñas con SHA-256 y sal."),
  fila("modelos/modelo_servicio.c", "Servicios y horarios configurables."),
  fila("vistas/vista_json.c", "Serializadores a JSON y escape de texto."),
  fila("vistas/vista_sistema.html", "Interfaz principal (una sola página con 6 pestañas)."),
  fila("vistas/vista_login.html", "Inicio de sesión."),
  fila("vistas/vista_terminos.html", "Política de tratamiento de datos biométricos."),
  fila("controladores/controlador_lector.c", "Driver del lector 4500, captura, calidad, enrolamiento, tareas en paralelo."),
  fila("controladores/controlador_web.c", "Servidor HTTP, todas las rutas, permisos y la autoprueba."),
  fila("controladores/controlador_auth.c", "Sesiones por cookie y control de acceso por rol."),
  fila("controladores/controlador_red.c", "Red WiFi propia, DNS cautivo, reloj."),
], [3500, 800, 5060]));
k.push(SEP());
k.push(BODY(rich(`Además: \`components/nbis/\` contiene el motor de reconocimiento (extracción de minucias del NIST, más el comparador propio en \`nbis_wrap.c\`, ${lineas("../components/nbis/nbis_wrap.c")} líneas). Los archivos de cabecera (\`.h\`) están junto a cada \`.c\`.`)));
k.push(H2("3.1  Quién puede llamar a quién"));
k.push(...COD(null, [
  "controladores  ──usan──>  modelos     (lector, web y auth leen y escriben datos)",
  "controladores  ──usan──>  vistas      (la web serializa con vista_json)",
  "vistas         ──usan──>  modelos     (los tipos: estudiante_t, registro_t...)",
  "modelos        ──NO usan──> controladores   <- regla: la capa de datos es independiente"].join("\n")));
k.push(P("Una excepción deliberada: `controlador_red.c` llama a `srv_en_minuto()` del modelo de servicios para saber qué servicio corresponde a la hora actual. Es una llamada de controlador a modelo, que está permitida."));
k.push(H2("3.2  Los componentes de ESP-IDF que se usan"));
k.push(tb(["Componente", "Para qué"], [
  ["`usb` (host)", "Hablar con el lector de huellas por el puerto USB-OTG."],
  ["`fatfs`, `wear_levelling`", "Sistema de archivos en la partición `almacen` (8 MB)."],
  ["`esp_wifi`, `esp_hosted`, `esp_wifi_remote`", "WiFi: la radio es un chip ESP32-C6 aparte, comunicado por SDIO."],
  ["`esp_http_server`", "El servidor web."],
  ["`mbedtls`", "SHA-256 para las contraseñas y números aleatorios."],
  ["`esp_psram`", "32 MB de memoria externa para las tablas y las plantillas."],
], [4000, 5360]));

/* ================= 4 ================= */
k.push(H1("4", "Arranque del programa"));
k.push(P("`app_main()` en `main.c` hace todo en este orden. Respetarlo importa: cada paso depende del anterior."));
k.push(...N([
  "**alm_montar()**: monta la partición de datos. Si falla, el sistema no puede operar y se detiene.",
  "**Cargar los modelos**: `usr_cargar()`, `est_cargar()`, `bio_cargar()`, `reg_cargar()`, `srv_cargar()`. Cada uno lee su archivo a memoria PSRAM. Si no hay usuarios, `usr_cargar()` crea el administrador inicial.",
  "**Mantenimiento opcional** (banderas de `main.c`): borrado de datos de prueba, reinicio total, prueba de guardado masivo.",
  "**lector_iniciar()**: levanta el subsistema USB y las tareas del lector.",
  "**red_iniciar_wifi()** y **red_iniciar_dns()**: crea la red `ALIMETRIK` y el DNS que la convierte en portal cautivo.",
  "**web_iniciar()** y **web_autoprueba()**: arranca el servidor y se hace peticiones a sí mismo para comprobar que responde.",
]));
k.push(P("Al terminar, `app_main()` **retorna**: de ahí en adelante todo corre en las tareas creadas. La tarea principal no se queda en un bucle."));
k.push(H2("4.1  Banderas de mantenimiento"));
k.push(tb(["Bandera (en main.c)", "Qué hace al poner 1, grabar y reiniciar"], [
  ["`BORRAR_HUELLAS_Y_REGISTROS`", "Borra todas las huellas y la bitácora; conserva estudiantes."],
  ["`BORRAR_ALUMNOS_DE_PRUEBA`", "Borra los estudiantes cuyo documento empieza por `TEST`."],
  ["`REINICIAR_TODOS_LOS_DATOS`", "Deja el sistema en blanco: estudiantes, huellas y registros."],
  ["`PRUEBA_GUARDADO_MASIVO`", "Un número N: da de alta N estudiantes seguidos y reporta tiempo y memoria."],
], [3600, 5760]));
k.push(NOTA("Procedimiento", "Ponga la bandera en 1, grabe, compruebe en el log que se ejecutó, **vuelva a ponerla en 0 y regrabe**. Si se deja en 1, la acción se repite en cada arranque.", "a"));

/* ================= 5 ================= */
k.push(H1("5", "Modelos: la capa de datos"));
k.push(H2("5.1  Dónde y cómo se guardan los datos"));
k.push(P("Cada tabla es un **archivo binario** en la partición `almacen` (FATFS, 8 MB, con nivelación de desgaste). El formato es simple: un entero `n` (cuántos elementos hay) seguido de `n` estructuras de tamaño fijo, tal como están en memoria."));
k.push(tb(["Archivo", "Contiene", "Estructura", "Máximo"], [
  ["`estudian.dat`", "Estudiantes", "`estudiante_t`", "1000"],
  ["`huellas.dat`", "Plantillas de huella", "`huella_t`", "3000"],
  ["`registro.dat`", "Bitácora de entregas", "`registro_t`", "2000 (rota)"],
  ["`usuarios.dat`", "Usuarios del sistema", "`usuario_t`", "16"],
  ["`servicio.dat`", "Servicios y horarios", "`servicio_t`", "8"],
  ["`secuenc.dat`", "Último id de estudiante entregado", "entero", "—"],
], [2300, 3200, 2200, 1660]));
k.push(SEP());
k.push(H2("5.2  La capa de almacenamiento"));
k.push(P("`almacenamiento.c` es la **única** que toca archivos. Los demás modelos le piden guardar y cargar. Tres operaciones y un cerrojo:"));
k.push(tb(["Función", "Qué hace y por qué existe"], [
  ["`alm_guardar_tabla()`", "Reescribe una tabla completa de forma **atómica**: escribe `archivo.tmp`, verifica `fwrite`, `fflush` y `fclose`, y solo entonces borra el original y renombra. Si algo falla, el archivo bueno queda intacto."],
  ["`alm_anexar()`", "Agrega **un solo elemento** al final y actualiza el contador. Es la operación normal de guardado: reescribir toda la tabla congelaba el equipo casi 2 segundos."],
  ["`alm_cargar_tabla()`", "Lee la tabla completa a memoria al arrancar."],
  ["`alm_lock()` / `alm_unlock()`", "Cerrojo **recursivo** que protege todas las tablas (varias tareas las usan a la vez)."],
], [2800, 6560]));
k.push(NOTA("Por qué importa", "Escribir en la memoria flash **detiene el procesador** unos milisegundos (la caché se apaga). Reescribir una tabla grande por cada alta bloqueaba todo el firmware, incluido el servidor web, y el celular mostraba error aunque el dato sí se había guardado. Por eso el guardado normal es **anexar un elemento**, y la reescritura completa solo se hace al borrar o al rotar la bitácora.", "a"));

k.push(H2("5.3  Las estructuras de datos"));
k.push(...COD("modelos/modelo_estudiante.h", [
  "typedef struct {",
  "    uint32_t id;",
  "    char     documento[24];",
  "    char     nombre[40];     char apellido[40];     char grado[12];",
  "    uint8_t  activo;         uint32_t creado;",
  "    /* Consentimiento informado (la huella es dato sensible) */",
  "    uint8_t  autorizacion;   /* 1 = autorizó el tratamiento biométrico */",
  "    char     acudiente[60];  /* representante legal que autoriza */",
  "    char     doc_acudiente[24];",
  "    char     fecha_autoriza[12];   /* AAAA-MM-DD */",
  "} estudiante_t;"].join("\n")));
k.push(...COD("modelos/modelo_biometrico.h y modelo_registro.h", [
  "typedef struct {                      typedef struct {",
  "    uint32_t      estudiante_id;          uint32_t id;",
  "    char          dedo[24];               uint32_t estudiante_id;  /* 0 = nadie */",
  "    fp_template_t plantilla;              char     servicio[24];",
  "} huella_t;                               char     resultado[20];",
  "                                          int      score;",
  "                                          char     fecha[12];  /* AAAA-MM-DD */",
  "                                          char     hora[10];   /* HH:MM:SS  */",
  "                                      } registro_t;"].join("\n")));
k.push(P("Una plantilla (`fp_template_t`) guarda hasta **200 minucias** como posición `x`, `y` y ángulo: unos 2,4 KB. Con 3 muestras por estudiante son unos 7,3 KB por estudiante. **Nunca se guarda la imagen de la huella**, solo esos puntos."));
k.push(NOTA("Cambiar una estructura rompe los archivos", "Los archivos son copia directa de la memoria. Si cambia `estudiante_t` (añade o mueve un campo), los datos ya guardados se leerán corruptos. Hay que **migrar**: ver la receta 11.1.", "a"));

k.push(H2("5.4  Reglas de negocio de cada modelo"));
k.push(H2("Estudiantes"));
k.push(...L([
  "`est_crear()` **rechaza el alta sin autorización** de tratamiento de datos. Es un requisito legal (Ley 1581 de 2012): no se puede quitar.",
  "El documento debe ser único; un duplicado se rechaza.",
  "Los **ids nunca retroceden**: el último id entregado se guarda en `secuenc.dat`. Si no, al borrar al último estudiante y reiniciar, su id se reasignaba a otra persona y los registros históricos quedaban atribuidos a ella.",
  "El alta usa `alm_anexar()` y, si falla, se **deshace** en memoria. La API responde 507 con el espacio libre.",
  "`est_revocar_autorizacion()` es el derecho de supresión: borra las huellas y marca al estudiante sin autorización e inactivo.",
]));
k.push(H2("Biometría"));
k.push(...L([
  "`bio_agregar()` **exige autorización vigente** del estudiante: sin ella no se puede enrolar.",
  "`bio_identificar()` compara contra todas las plantillas y devuelve el estudiante con el mayor puntaje, si supera el umbral (14).",
  "`bio_borrar_de()` compacta la tabla bajo el cerrojo pero **escribe el archivo fuera de él**: la escritura puede pasar de varios MB y no debe bloquear al servidor.",
]));
k.push(H2("Registros"));
k.push(...L([
  "`reg_ya_entregado(est, servicio, fecha)` es el **anti-duplicado**: solo cuenta resultados `permitido`.",
  "Al llegar a 2000 registros la bitácora **rota**: descarta el 10 % más antiguo (200) de una vez, para no reescribir el archivo en cada registro.",
  "`reg_hay_servicio()` distingue un servicio real de «Fuera de horario» y «Sin hora».",
]));
k.push(H2("Usuarios"));
k.push(...L([
  "La contraseña se guarda como **SHA-256(sal ‖ contraseña)**, con una sal aleatoria de 8 bytes por usuario. Nunca se guarda la contraseña.",
  "La comparación es de **tiempo constante** (`iguales()`), para no revelar información por el tiempo de respuesta.",
  "`usr_borrar()` no deja que el sistema se quede sin administrador. Al borrar un usuario se cierran sus sesiones (`auth_cerrar_sesiones_de`).",
  "`usr_clave_por_defecto()` informa si el administrador aún usa `admin123`, sin registrar un «intento fallido».",
]));
k.push(H2("Servicios"));
k.push(...L([
  "Hasta 8; cada uno con nombre, inicio y fin en **minutos desde la medianoche** (06:00 = 360).",
  "Las franjas de los servicios activos **no pueden solaparse** (`se_solapa()`).",
  "Se exige `inicio < fin`: **no se acepta una franja que cruce la medianoche** al crearla o editarla (aunque `srv_en_minuto()` sabría resolverla).",
  "`srv_en_minuto()` **copia** el nombre en un búfer del llamador. Nunca devuelve un puntero a la tabla (ver capítulo 12).",
  "Valores especiales: `SRV_SIN_SERVICIO` («Fuera de horario») y `SRV_SIN_HORA` («Sin hora», cuando el reloj no se ha fijado).",
]));

/* ================= 6 ================= */
k.push(H1("6", "Controladores: el lector de huellas"));
k.push(P("`controlador_lector.c` (el archivo más grande) tiene el driver USB propio del DigitalPersona 4500, portado del proyecto libfprint, y la lógica que decide qué hacer con cada huella. El protocolo USB completo está documentado en `PROTOCOLO-4500.md`."));
k.push(H2("6.1  Las tareas"));
k.push(tb(["Tarea", "Prioridad", "Núcleo", "Pila", "Qué hace"], [
  ["`usb_host`", "2", "0", "4 KB", "Atiende la librería USB host."],
  ["`usb_client`", "3", "0", "5 KB", "Detecta el lector al conectarlo."],
  ["`lector`", "4", "1", "16 KB", "Captura la imagen del dedo y la encola."],
  ["`procesador`", "3", "1", "32 KB", "Extrae minucias, identifica o enrola, registra."],
  ["`dns`", "4", "—", "4 KB", "Portal cautivo."],
  ["servidor HTTP", "—", "—", "8 KB", "**Un solo hilo** atiende todas las peticiones."],
], [2000, 1300, 1000, 1000, 4060]));
k.push(SEP());
k.push(P("**Por qué dos tareas separadas:** capturar tarda ~1,5 s y extraer las minucias entre 2,3 y 4,9 s. Si fueran una sola, el lector estaría sordo mientras se procesa. Se comunican con dos colas de punteros a `trabajo_t` (`s_q_libres` y `s_q_listos`, con 2 trabajos): mientras el procesador trabaja con una captura, el lector ya puede tomar la siguiente."));
k.push(H2("6.2  Qué pasa con cada dedo"));
k.push(...N([
  "El lector avisa que hay un dedo (interrupción `0x0101`). Se espera 250 ms a que el dedo asiente.",
  "Se pasa al modo de captura y se lee la imagen de **384 × 290 píxeles** en **un solo** transfer USB de 115 456 bytes.",
  "Se pide enseguida `AWAIT_FINGER_OFF`: si no, el LED del lector parpadea sin parar durante el procesamiento.",
  "La imagen llega cifrada con un LFSR; se descifra (la semilla se cancela, por eso es fija).",
  "**Control de calidad** (`capturar_una()`): se rechaza solo si cubre menos del 35 % del sensor.",
  "Se deja el aviso pegajoso «HUELLA LEÍDA. Retira el dedo» y se encola el trabajo.",
  "El procesador extrae las minucias. Se exigen **12 como mínimo al enrolar** y **6 al identificar**.",
  "Según el modo: **enrolar** (guarda la muestra) o **identificar** y decidir el resultado.",
]));
k.push(H2("6.3  Cómo se decide el resultado"));
k.push(...COD("Orden de las decisiones (procesar en controlador_lector.c)", [
  "si no hubo coincidencia              -> \"desconocido\"",
  "si el estudiante está inactivo       -> \"no_autorizado\"",
  "si no hay servicio vigente           -> \"sin_servicio\"   (no cuenta como ración)",
  "si ya recibió este servicio hoy      -> \"duplicado\"",
  "en otro caso                         -> \"permitido\""].join("\n")));
k.push(H2("6.4  Control de calidad: la regla que no se debe cambiar"));
k.push(NOTA("No rechace por «ruido»", "Hubo una versión que rechazaba la captura si la variación entre líneas consecutivas superaba un umbral, creyendo que era ruido de descifrado. Pero esa variación **es el contraste de las crestas**: una huella nítida la maximiza. El resultado fue que se rechazaban **las mejores capturas** y el lector «no agarraba» ningún dedo. El criterio correcto es la **cobertura** (`calc_cobertura()`: porcentaje de franjas del sensor con contraste suficiente) y solo se rechaza por debajo del 35 %. Un tope absoluto de 25 000 protege solo contra una imagen ilegible.", "a"));
k.push(H2("6.5  Enrolamiento"));
k.push(...L([
  "La web pide enrolar a un estudiante (`lector_enrolamiento_pedir(id)`). Se toman **3 muestras** del mismo dedo (`ENROL_MUESTRAS`).",
  "El id se **fija al detectar el dedo** (latch): así, aunque la web cancele o cambie de estudiante a media captura, la muestra se guarda al estudiante correcto.",
  "Se vence solo a los **90 segundos** sin muestra.",
  "Al revocar o borrar a un estudiante se cancela su enrolamiento pendiente.",
  "Con una sola muestra el puntaje real quedaba al filo del umbral (13 a 14 contra 14); con tres, los aciertos suben a 20-30. Por eso son tres.",
]));
k.push(H2("6.6  Recuperación de fallos del USB"));
k.push(P("Un fallo del lector no debe dejar el equipo muerto. La escalera de recuperación:"));
k.push(...N([
  "Tras **todo** tiempo de espera de una transferencia USB se llama `ep_limpiar(ep)` (detener, vaciar y limpiar el endpoint).",
  "Con **2 fallos seguidos** de captura: limpiar los endpoints y volver a iniciar el lector (`uru_init`).",
  "Con **2 recuperaciones fallidas**: `esp_restart()`. Los datos están a salvo en la flash.",
]));
k.push(NOTA("El síntoma de una transferencia colgada", "Si no se limpia el endpoint tras un tiempo de espera, queda una transferencia «en vuelo» y **todas** las siguientes fallan en el mismo milisegundo, para siempre. En el log se ve `modo AWAIT_FINGER_ON` y `captura fallida` con la misma marca de tiempo.", "a"));
k.push(H2("6.7  Los mensajes hacia la pantalla"));
k.push(P("El lector no habla con la web directamente: deja mensajes que el celular consulta cada segundo (`GET /api/estado`). Hay tres niveles, y **su prioridad importa**:"));
k.push(tb(["Función", "Uso", "Comportamiento"], [
  ["`lector_mensaje()`", "Instrucción al usuario («Pon el dedo»).", "Pisa cualquier otro mensaje."],
  ["`lector_mensaje_reposo()`", "Estado de espera.", "Respeta el mensaje pegajoso."],
  ["`lector_mensaje_resultado()`", "Resultado de una huella.", "**Pegajoso 5 s**: no lo pisa nada."],
], [3000, 3300, 3060]));
k.push(SEP());
k.push(P("**Regla:** toda acción física del usuario necesita una confirmación visible de **al menos un ciclo de consulta** (1 s). Un aviso que otro mensaje pisa en menos de un segundo no se ve nunca, y el usuario cree que el sistema no reaccionó y vuelve a intentar."));

/* ================= 7 ================= */
k.push(H1("7", "Controladores: red, sesiones y servidor web"));
k.push(H2("7.1  Red y reloj (controlador_red.c)"));
k.push(...L([
  "Crea la red **ALIMETRIK** (abierta por defecto; `RED_CLAVE` en `main.c` permite ponerle clave de 8 o más caracteres).",
  "`esp_hosted_init()` se llama **a mano** aquí, después de que la memoria esté lista (ver el parche del capítulo 2).",
  "Un servidor **DNS** responde a cualquier nombre con `192.168.4.1`: es lo que hace que el celular abra el portal solo al conectarse.",
  "El equipo **no tiene reloj con batería**. La web fija la hora al cargar con la del celular (`POST /api/hora`, solo administrador) y `red_fijar_hora()` la guarda como una diferencia contra el contador interno.",
  "`red_servicio_actual()` devuelve el servicio vigente según esa hora, o «Sin hora» si nadie la fijó todavía.",
]));
k.push(H2("7.2  Sesiones y permisos (controlador_auth.c)"));
k.push(...L([
  "Inicio de sesión: usuario y contraseña → token aleatorio de **128 bits** (32 caracteres hexadecimales) en la cookie `sesion` con `HttpOnly` y `SameSite=Lax`.",
  "Hasta **8 sesiones** a la vez; caducan a las **8 horas de inactividad** (`AUTH_CADUCIDAD_MIN` = 480).",
  "Dos roles: **operador** (kiosco y consulta) y **administrador** (todo lo demás).",
]));
k.push(...COD("La puerta de cada ruta protegida", [
  "if (!auth_exigir(r, true)) return ESP_OK;    /* true = solo administrador */",
  "/* auth_exigir ya respondió 401 (sin sesión) o 403 (sin permiso) */"].join("\n")));
k.push(H2("7.3  El servidor web (controlador_web.c)"));
k.push(P("Configuración: 32 rutas como máximo (hoy hay 26), pila de 8 KB, y una función de apertura que activa **TCP_NODELAY** en cada conexión. Sin esa opción, el algoritmo de Nagle sumado a la confirmación diferida de TCP añadía **250 ms** a cada respuesta pequeña (medido: de 245 ms a 4-12 ms)."));
k.push(tb(["Ruta", "Método", "Permiso", "Función"], [
  ["`/`", "GET", "sesión (si no, a /login)", "Página principal"],
  ["`/login`, `/terminos`", "GET", "público", "Inicio de sesión y política"],
  ["`/api/login`", "POST", "público", "Iniciar sesión"],
  ["`/api/estado-acceso`", "GET", "público", "¿Hay sesión? ¿clave por defecto?"],
  ["`/api/logout`", "POST", "—", "Cerrar sesión"],
  ["`/api/sesion`, `/api/clave`", "GET, POST", "sesión", "Mi usuario; cambiar mi clave"],
  ["`/api/estado`", "GET", "sesión", "Métricas, lector y último registro"],
  ["`/api/resumen`", "GET", "sesión", "Servicio vigente y atendidos de hoy"],
  ["`/api/estudiantes`", "GET", "sesión", "Listar"],
  ["`/api/estudiantes`", "POST", "**admin**", "Alta (exige autorización)"],
  ["`/api/estudiantes/borrar`, `/revocar`", "POST", "**admin**", "Baja; revocar y borrar huellas"],
  ["`/api/registros`", "GET", "sesión", "Últimos registros"],
  ["`/api/enrolar`, `/enrolar/cancelar`", "POST", "**admin**", "Iniciar o cancelar el enrolamiento"],
  ["`/api/servicios`", "GET", "sesión", "Listar servicios"],
  ["`/api/servicios`, `/borrar`, `/restaurar`", "POST", "**admin**", "Crear, editar, borrar, restaurar"],
  ["`/api/usuarios`", "GET, POST", "**admin**", "Listar y crear"],
  ["`/api/usuarios/borrar`", "POST", "**admin**", "Borrar un usuario"],
  ["`/api/hora`, `/api/info`", "POST, GET", "**admin**", "Fijar hora; información del equipo"],
], [3300, 1200, 2000, 2860]));
k.push(SEP());
k.push(H2("Cómo se escribe un controlador de ruta"));
k.push(P("Todos siguen el mismo patrón, con cuatro ayudantes del archivo: `leer_cuerpo()`, `json_campo()` (extrae un valor del JSON), `enviar_json()` y `enviar_error()`. Un ejemplo real, recortado, de `a_servicios_guardar`:"));
k.push(...COD(null, [
  "static esp_err_t a_servicios_guardar(httpd_req_t *r)",
  "{",
  "    if (!auth_exigir(r, true)) return ESP_OK;         /* solo administrador */",
  "    char cuerpo[340], nombre[24] = \"\", ini[10] = \"\", fin[10] = \"\";",
  "    leer_cuerpo(r, cuerpo, sizeof(cuerpo));",
  "    json_campo(cuerpo, \"nombre\", nombre, sizeof(nombre));",
  "    json_campo(cuerpo, \"inicio\", ini, sizeof(ini));",
  "    json_campo(cuerpo, \"fin\", fin, sizeof(fin));",
  "",
  "    int m_ini = srv_texto_a_minutos(ini), m_fin = srv_texto_a_minutos(fin);",
  "    if (!nombre[0])",
  "        return enviar_error(r, \"400 Bad Request\", \"Indique el nombre del servicio\");",
  "    if (m_ini >= m_fin)",
  "        return enviar_error(r, \"400 Bad Request\", \"El inicio debe ser anterior al fin\");",
  "    if (!srv_crear(nombre, m_ini, m_fin))",
  "        return enviar_error(r, \"409 Conflict\", \"El horario se cruza con otro\");",
  "    return enviar_json(r, \"{\\\"ok\\\":true}\");",
  "}"].join("\n")));
k.push(NOTA("Códigos de respuesta que usa el sistema", "**400** datos inválidos · **401** sin sesión · **403** sin permiso · **409** conflicto (documento repetido, horarios que se cruzan) · **507** sin espacio para guardar. La interfaz los muestra al usuario tal cual, por eso los mensajes están escritos para personas."));

/* ================= 8 ================= */
k.push(H1("8", "Vistas: la interfaz web"));
k.push(H2("8.1  Cómo llegan las páginas al navegador"));
k.push(P("Los tres archivos HTML **se incrustan dentro del firmware** (`EMBED_TXTFILES` en `main/CMakeLists.txt`) y el servidor los envía desde la memoria del programa. No hay sistema de archivos web ni librerías externas: nada se descarga de internet. Cada página se manda con `Cache-Control: no-store`, pero tras actualizar la interfaz conviene **cerrar y volver a abrir la pestaña** del celular, porque algunos navegadores retienen la versión anterior."));
k.push(...COD("En controlador_web.c", [
  "extern const char vista_sistema_start[] asm(\"_binary_vista_sistema_html_start\");",
  "extern const char vista_sistema_end[]   asm(\"_binary_vista_sistema_html_end\");"].join("\n")));
k.push(P("**Consecuencia:** cualquier cambio en un `.html` exige **recompilar y regrabar** el firmware. Para iterar el diseño más rápido, se puede abrir el HTML en el computador con un servidor que simule la API (en `capturas/servidor_capturas.py` hay uno de ejemplo)."));
k.push(H2("8.2  La página principal"));
k.push(P("Es una sola página con seis pestañas (`data-v` en cada `.tab`): **Comedor** (el kiosco de entrega, pestaña de operación diaria), **Métricas**, **Alumnos**, **Registros**, **+ Nuevo** y **Configuración** (solo administrador: marcada con la clase `solo-admin`)."));
k.push(...L([
  "**Todo el JavaScript va en el mismo archivo**, sin librerías. La función `j()` envuelve `fetch` con **límite de 6 s** en las consultas y **20 s** en las escrituras, y redirige a `/login` si recibe un 401.",
  "**Consulta periódica:** el kiosco consulta `/api/estado` cada segundo. La variable `escribiendo` la **pausa** mientras se guarda algo, para no acumular peticiones sobre un servidor de un solo hilo.",
  "Tras un alta, se llama a `cargarEst()` para refrescar la lista. Antes no se hacía y parecía que «no guardaba».",
  "El kiosco muestra la tarjeta grande en **verde** (entregado), **ámbar** (ya recibió) o **rojo** (denegado), con un sonido distinto, generado con la API de audio del navegador.",
]));
k.push(H2("8.3  Colores y estilo"));
k.push(P("Todos los colores están en variables CSS al principio de cada archivo, en `:root`. La paleta actual es **gris grafito con acento plata**, parecida al lector de huellas."));
k.push(tb(["Variable", "Valor", "Uso"], [
  ["`--bg`", "`#17181a`", "Fondo de la página"],
  ["`--card`, `--card2`", "`#222427`, `#2b2e32`", "Tarjetas y cabeceras de tabla"],
  ["`--line`", "`#3a3e43`", "Bordes"],
  ["`--txt`, `--muted`", "`#eceef0`, `#9aa1a8`", "Texto y texto atenuado"],
  ["`--pri`, `--pri2`", "`#b9c0c7`, `#a6adb5`", "Acento plata (botones, pestaña activa)"],
  ["`--ok`, `--dup`, `--no`", "verde, ámbar, rojo", "**Semáforo del kiosco: no cambiar a gris**"],
], [2500, 3000, 3860]));
k.push(SEP());
k.push(NOTA("Los colores del semáforo son una señal de trabajo", "El personal del comedor lee verde, ámbar y rojo **de reojo y a distancia**. Convertirlos al gris de la marca rompería la operación. Si cambia la paleta, cambie solo el fondo, las tarjetas y el acento; deje el semáforo.", "a"));
k.push(NOTA("Un error de CSS que ya ocurrió", "La barra «Enrolando a…» se veía **siempre**. La regla `.hide{display:none}` perdía contra `.enrollbar{display:flex}` porque ambas tenían la misma especificidad y la segunda iba después. La solución fue `.hide{display:none !important}`. Si añade un elemento que se oculta y se muestra, use la clase `.hide`."));

/* ================= 9 ================= */
k.push(H1("9", "El motor de reconocimiento"));
k.push(P("Vive en `components/nbis/` y tiene dos partes:"));
k.push(tb(["Parte", "Qué es"], [
  ["**Extracción** (`fp_extraer`)", "MINDTCT, de NBIS del NIST (dominio público): toma la imagen en gris y devuelve las **minucias** (terminaciones y bifurcaciones de las crestas) con su posición y ángulo."],
  ["**Comparación** (`fp_comparar`)", "Comparador **propio** (`nbis_wrap.c`): cuenta cuántas minucias de dos plantillas coinciden tras alinearlas."],
], [2800, 6560]));
k.push(SEP());
k.push(H2("9.1  Por qué un comparador propio"));
k.push(P("NBIS trae su propio comparador (`bozorth3`), pero **diverge en procesadores de 32 bits**: en el ESP32-P4 entraba en un bucle infinito y daba puntaje máximo a todo. Se comprobó que la misma entrada funciona en un Mac de 64 bits. Se descartó como causa los datos, los tamaños de arreglos, la precisión de punto flotante y la coherencia de memoria. En vez de seguir persiguiéndolo se escribió un comparador más simple."));
k.push(H2("9.2  Cómo compara fp_comparar"));
k.push(...N([
  "Para **cada par de minucias** (una de cada plantilla) supone que son la misma y calcula el giro y desplazamiento que las alinearía.",
  "Aplica esa alineación rígida a todas las demás y **cuenta correspondencias**: pares a menos de **11 píxeles** (`FP_DIST_TOL`) y con ángulo a menos de **20 grados** (`FP_ANG_TOL`).",
  "Se queda con la hipótesis que más correspondencias consigue.",
]));
k.push(P("Para no comparar todos los puntos contra todos se usa una **rejilla espacial** de 40 × 32 celdas (cada celda del tamaño de la tolerancia): buscar el vecino pasa a ser casi inmediato. Eso bajó la comparación de **4,8 segundos a 30-45 milisegundos**. Las funciones seno y coseno se precalculan en tablas."));
k.push(H2("9.3  El umbral y sus números reales"));
k.push(tb(["Situación", "Correspondencias"], [
  ["Mismo dedo, medido en laboratorio", "22 a 29"],
  ["Mismo dedo real contra **una** muestra", "13 a 14 (al filo)"],
  ["Mismo dedo real contra **tres** muestras", "20 a 30"],
  ["Dedos distintos", "10 o menos"],
  ["**Umbral** `FP_MATCH_THRESHOLD`", "**14**"],
], [5000, 4360]));
k.push(SEP());
k.push(NOTA("Si sube o baja el umbral", "Subirlo reduce el riesgo de confundir a dos personas, pero aumenta los rechazos de personas legítimas. Bajarlo hace lo contrario. Con el margen actual (10 contra 20 o más) no hace falta tocarlo. Si lo cambia, vuelva a medir con dedos reales: no con la imagen de prueba."));
k.push(H2("9.4  Costos que hay que tener presentes"));
k.push(...L([
  "**La identificación es lineal:** ~30-35 ms × número de plantillas. Con 100 estudiantes y 3 muestras cada uno son unos 9-10 segundos. Si el colegio crece, hay que optimizar (por ejemplo, filtrar por número de minucias antes de comparar).",
  "**Una misma huella enrolada bajo dos estudiantes** hace que el sistema responda con uno de los dos nombres. No es un error del programa: en las pruebas use un dedo distinto por estudiante.",
  "NBIS se compila con **-O2 explícito** (el proyecto va en `-Og`). Sin eso, la extracción tardaba 4,7 s; con eso, 2,3 a 4,4 s.",
]));

/* ================= 10 ================= */
k.push(H1("10", "Concurrencia y memoria"));
k.push(H2("10.1  Dos tipos de memoria"));
k.push(tb(["Memoria", "Tamaño", "Qué va aquí"], [
  ["**Interna**", "~620 KB (160 KB reservados para DMA)", "Pilas de las tareas, el búfer de captura USB, lo que necesita velocidad."],
  ["**PSRAM** (externa)", "32 MB", "Las tablas de datos, las plantillas, los arreglos grandes del motor de reconocimiento."],
], [2300, 3000, 4060]));
k.push(SEP());
k.push(...L([
  "Las tablas se reservan con `heap_caps_calloc(..., MALLOC_CAP_SPIRAM)`.",
  "El **búfer de captura USB debe estar en memoria interna**: en PSRAM el transfer falla con error 268. Por eso se reservan 160 KB internos (`SPIRAM_MALLOC_RESERVE_INTERNAL`).",
  "NBIS declara arreglos globales enormes: se llevan a PSRAM con `EXT_RAM_BSS_ATTR`.",
  "La pila de la tarea principal es de 48 KB (`ESP_MAIN_TASK_STACK_SIZE`), heredada de las primeras versiones, donde la extracción de minucias corría allí. Hoy corre en la tarea `procesador` (32 KB).",
]));
k.push(H2("10.2  El cerrojo de datos"));
k.push(P("Varias tareas tocan las mismas tablas: el procesador registra entregas, el servidor web lista y edita. Todas pasan por `alm_lock()`. Es **recursivo**, así una función que ya lo tiene puede llamar a otra que también lo pide."));
k.push(NOTA("Cerrojos cortos", "El servidor web tiene **un solo hilo**. Si alguien retiene el cerrojo durante un trabajo largo (identificar, escribir mucho a la flash, enviar datos por la red), la web se congela justo cuando el usuario pone el dedo. Regla: **tome el cerrojo, copie o modifique lo mínimo, suéltelo, y haga el trabajo lento después**. Para responder con un JSON grande, constrúyalo bajo el cerrojo en un búfer de PSRAM y **envíelo sin cerrojo**.", "a"));
k.push(H2("10.3  Configuración clave (sdkconfig.defaults)"));
k.push(tb(["Opción", "Por qué"], [
  ["`ESP32P4_SELECTS_REV_LESS_V3`, `REV_MIN_100`", "El chip es revisión v1.3; ESP-IDF 5.5 compila por defecto para v3.x y **la placa no arranca**."],
  ["`SPIRAM_MODE_HEX`, `SPEED_200M`", "La PSRAM de esta placa."],
  ["`SPIRAM_MALLOC_RESERVE_INTERNAL=163840`", "Reserva interna para el búfer DMA del USB."],
  ["`ESP_MAIN_TASK_STACK_SIZE=49152`", "Pila grande de la tarea principal (herencia de las primeras versiones)."],
  ["`PARTITION_TABLE_CUSTOM` + `partitions.csv`", "Aplicación de 3 MB y partición de datos `almacen` de 8 MB."],
  ["`WL_SECTOR_SIZE_512`", "Sectores del sistema de archivos con nivelación de desgaste."],
  ["`FATFS_LFN_STACK`, `FATFS_MAX_LFN=64`", "Nombres largos: sin esto `registro.dat` (más de 8 caracteres) no se abre."],
], [4000, 5360]));

/* ================= 11 ================= */
k.push(H1("11", "Recetas: cómo extender el sistema"));
k.push(P("Cuatro cambios típicos, con los pasos que evitan los problemas conocidos."));
k.push(H2("11.1  Añadir un campo a los estudiantes"));
k.push(P("Ejemplo: guardar el teléfono del acudiente. Como los archivos son copia directa de la memoria, hay que **migrar**: es el único cambio que puede destruir datos reales."));
k.push(...N([
  "**Conserve la estructura actual con otro nombre** (`estudiante_v2_t`), sin tocarla. Es el formato de lo que ya está guardado.",
  "**Añada el campo al final** de `estudiante_t`.",
  "**Cambie el nombre del archivo** (`F_EST`) y deje el anterior como `F_EST_V2`. Cuidado con no reutilizar un nombre.",
  "**Escriba migrar_v2()**: carga el archivo viejo con la estructura vieja, copia campo a campo a la nueva y guarda.",
  "**Borre el archivo viejo** tras migrar (`remove(F_EST_V2)`) **y también en est_borrar_todos()**.",
  "Actualice `json_estudiante()`, el controlador de alta y la vista.",
  "Pruebe con datos reales: arranque con un archivo viejo y compruebe que no se pierde nada.",
]));
k.push(...COD("Esqueleto de la migración (patrón real de modelo_estudiante.c)", [
  "static void migrar_v2(void)",
  "{",
  "    estudiante_v2_t *viejos = heap_caps_calloc(EST_MAX, sizeof(estudiante_v2_t),",
  "                                               MALLOC_CAP_SPIRAM);",
  "    if (!viejos) return;",
  "    int n = alm_cargar_tabla(F_EST_V2, viejos, sizeof(estudiante_v2_t), EST_MAX);",
  "    for (int i = 0; i < n; i++) {",
  "        memset(&s_est[i], 0, sizeof(estudiante_t));",
  "        s_est[i].id = viejos[i].id;",
  "        copiar(s_est[i].documento, viejos[i].documento, sizeof(s_est[i].documento));",
  "        /* ... resto de campos ... el campo nuevo queda en cero ... */",
  "    }",
  "    s_n = n;",
  "    alm_guardar_tabla(F_EST, s_est, sizeof(estudiante_t), s_n);",
  "    remove(F_EST_V2);          /* sin esto, los datos borrados RESUCITAN */",
  "    free(viejos);",
  "}"].join("\n")));
k.push(NOTA("El error de la migración que resucitaba datos", "Antes, `est_cargar()` llamaba a la migración siempre que la tabla estuviera vacía. Resultado: al borrar todos los estudiantes y reiniciar, **volvían** los datos del archivo viejo. Se corrigió borrando el archivo viejo tras migrar y en el borrado total.", "a"));

k.push(H2("11.2  Añadir una ruta a la API"));
k.push(...N([
  "Escriba el controlador siguiendo el patrón del capítulo 7: `auth_exigir()` primero, datos con `json_campo()`, validar, responder.",
  "Regístrelo en `web_iniciar()` con `ruta(\"/api/...\", HTTP_POST, a_nombre);`. Hay espacio para 32 rutas y hoy se usan 26.",
  "Si devuelve una lista, construya el JSON con `snprintf` y **avance con avanzar()** (ver el capítulo 14).",
  "Los textos de usuario van por `json_escapar()`, que **duplica** caracteres: el búfer debe ser del doble del campo.",
  "Añada la prueba correspondiente a `web_autoprueba()` si es una ruta crítica.",
]));
k.push(...COD("Plantilla mínima", [
  "static esp_err_t a_ejemplo(httpd_req_t *r)",
  "{",
  "    if (!auth_exigir(r, true)) return ESP_OK;          /* solo administrador */",
  "    char cuerpo[200], valor[24] = \"\";",
  "    leer_cuerpo(r, cuerpo, sizeof(cuerpo));",
  "    json_campo(cuerpo, \"valor\", valor, sizeof(valor));",
  "    if (!valor[0]) return enviar_error(r, \"400 Bad Request\", \"Falta el valor\");",
  "",
  "    char out[96];",
  "    snprintf(out, sizeof(out), \"{\\\"ok\\\":true,\\\"total\\\":%d}\", est_cantidad());",
  "    return enviar_json(r, out);",
  "}",
  "/* en web_iniciar():  ruta(\"/api/ejemplo\", HTTP_POST, a_ejemplo);  */"].join("\n")));

k.push(H2("11.3  Añadir una pestaña a la interfaz"));
k.push(...N([
  "En `vista_sistema.html`, añada `<div class=\"tab\" data-v=\"nueva\">Nombre</div>` junto a las demás y una sección `<section id=\"v-nueva\" class=\"hide\">` con su contenido (el `id` es `v-` más el valor de `data-v`).",
  "Escriba la función que carga sus datos con `j('/api/...')` y llámela al activar la pestaña.",
  "Si la pestaña modifica algo, ponga `escribiendo=true` antes y `false` después (en un `finally`), para pausar la consulta periódica.",
  "Si solo es para administradores, añada la clase `solo-admin`.",
  "Use los colores con `var(--...)`, nunca valores fijos.",
  "Recompile y regrabe: el HTML va dentro del firmware.",
]));

k.push(H2("11.4  Cambiar los servicios, el umbral o la red"));
k.push(tb(["Qué", "Dónde", "Hace falta regrabar"], [
  ["Servicios y horarios", "Web: Configuración → Servicios y horarios", "**No**"],
  ["Contraseña de un usuario", "Web: Configuración → Mi cuenta", "**No**"],
  ["Nombre y clave de la red WiFi", "`RED_NOMBRE`, `RED_CLAVE` en `main.c`", "Sí"],
  ["Umbral de reconocimiento", "`FP_MATCH_THRESHOLD` en `components/nbis/`", "Sí"],
  ["Muestras por dedo", "`ENROL_MUESTRAS` en `controlador_lector.c`", "Sí"],
  ["Máximos (estudiantes, registros…)", "`EST_MAX`, `REG_MAX`… en los `.h` de modelos", "Sí; **mire el espacio de datos**"],
  ["Colores", "Variables `:root` de las vistas", "Sí"],
], [3000, 4160, 2200]));

/* ================= 12 ================= */
k.push(H1("12", "Reglas de oro y errores que no se deben repetir"));
k.push(P("Cada punto de esta lista fue un problema real que costó horas en hardware. Están agrupados por tema."));
k.push(H2("Datos y memoria permanente"));
k.push(tb(["Regla", "Por qué"], [
  ["**No reescriba tablas completas** por cada guardado: anexe un elemento.", "Escribir a la flash congela el firmware; la reescritura tardaba 2,7 s por huella."],
  ["**Toda escritura es atómica** (archivo temporal + renombrar) y se **verifica**.", "Abrir con `\"wb\"` vacía el archivo al instante: un fallo a la mitad perdía toda la tabla."],
  ["**Si el guardado falla, deshaga el cambio en memoria** y avise al usuario.", "Antes el dato «se guardaba» solo en RAM y se perdía en silencio al reiniciar."],
  ["**Los ids nunca se reutilizan** (`secuenc.dat`).", "Si no, un estudiante nuevo heredaba los registros históricos de otro."],
  ["**Borre el archivo viejo tras migrar.**", "Si no, los datos borrados resucitan en el siguiente arranque."],
  ["**Mida antes de decir «no guarda».**", "Hubo un caso en que sí guardaba; la web cortaba a los 6 s y mostraba error."],
], [4600, 4760]));
k.push(SEP());
k.push(H2("Memoria y texto"));
k.push(tb(["Regla", "Por qué"], [
  ["**Nunca devuelva un puntero a una tabla que otra tarea puede modificar.** Copie en un búfer del llamador.", "`srv_en_minuto()` devolvía un puntero vivo; un cambio de horario desde la web lo dejaba inválido."],
  ["**snprintf devuelve la longitud que HABRÍA escrito**, no la escrita. Acumule con `avanzar()`.", "Con una lista larga, el índice se pasaba del búfer y escribía fuera de él."],
  ["**Dimensione los campos para el texto más largo que guardarán.**", "`servicio[16]` cortaba «Fuera de horario» y el anti-duplicado dejó de funcionar."],
  ["**json_escapar() duplica** los caracteres: el búfer del JSON debe ser el doble.", "Un nombre con comillas desbordaba el búfer."],
], [4600, 4760]));
k.push(SEP());
k.push(H2("Concurrencia"));
k.push(tb(["Regla", "Por qué"], [
  ["**Cerrojos cortos.** Trabajo lento (identificar, red, flash grande) fuera del cerrojo.", "El servidor web tiene un hilo; retener el cerrojo lo congela."],
  ["**Cancele el enrolamiento pendiente** al revocar o borrar a un estudiante.", "Si no, la siguiente muestra se guardaba a un estudiante que ya no existía."],
  ["**Cierre las sesiones de un usuario al borrarlo.**", "Un usuario borrado seguía operando con su sesión abierta."],
], [4600, 4760]));
k.push(SEP());
k.push(H2("USB y reconocimiento"));
k.push(tb(["Regla", "Por qué"], [
  ["**Limpie el endpoint (ep_limpiar) tras todo tiempo de espera USB.**", "Una transferencia colgada inutiliza el lector hasta reiniciar."],
  ["**Lea la imagen en UN solo transfer** del tamaño completo.", "El 4500 no tiene búfer: leer por trozos pierde bytes y el descifrado se desincroniza."],
  ["**En un control transfer, num_bytes = 8 + wLength.**", "Cuesta una iteración de depuración."],
  ["**No rechace capturas por «ruido».** Use la cobertura.", "Se rechazaban las mejores capturas (capítulo 6)."],
  ["**Parche de esp_hosted** aplicado siempre.", "Sin él, bucle de reinicios antes de `app_main()`."],
], [4600, 4760]));
k.push(SEP());
k.push(H2("Red e interfaz"));
k.push(tb(["Regla", "Por qué"], [
  ["**TCP_NODELAY en cada conexión.**", "Nagle + ACK diferido = 250 ms por respuesta pequeña."],
  ["**Toda acción física necesita confirmación visible ≥ 1 s.**", "Un aviso que se pisa antes de ser consultado no se ve, y el usuario repite."],
  ["**Pause la consulta periódica mientras se escribe.**", "Evita acumular peticiones en el servidor de un hilo."],
  ["**Use .hide con !important** para ocultar elementos.", "Las reglas de visualización ganaban por orden."],
], [4600, 4760]));
k.push(SEP());
k.push(NOTA("Lo que nunca se debe quitar: el consentimiento", "`est_crear()` rechaza el alta sin autorización y `bio_agregar()` rechaza enrolar sin autorización vigente. La huella es **dato sensible** (Ley 1581 de 2012; menores de edad: Decreto 1377 de 2013, representante legal). Estas validaciones son un requisito legal, no una molestia de interfaz: no se retiran ni se «relajan para las pruebas». El derecho de revocación (`est_revocar_autorizacion`) borra de inmediato las huellas.", "a"));

/* ================= 13 ================= */
k.push(H1("13", "Pruebas y depuración"));
k.push(P("**El log serial es la verdad.** Ante cualquier reporte de «no funciona», lo primero es capturar el log de la sesión real, no suponer. Así se descubrieron el USB colgado, el lector desenchufado y los 250 ms de la red."));
k.push(H2("13.1  Capturar el arranque"));
k.push(...COD("captura.py (requiere pyserial)", [
  "import serial, time",
  "s = serial.Serial('/dev/cu.usbserial-110', 115200, timeout=0.2)",
  "s.dtr = False; s.rts = True; time.sleep(0.3); s.rts = False   # reinicia la placa",
  "log = ''; t0 = time.time()",
  "while time.time() - t0 < 40:           # 40 s: la autoprueba tarda ~20 s",
  "    d = s.read(4096)",
  "    if d: log += d.decode('utf-8', 'replace')",
  "open('/tmp/arranque.log', 'w').write(log)",
  "print(log)"].join("\n")));
k.push(H2("13.2  Cómo se ve un arranque sano"));
k.push(tb(["Señal en el log", "Significa"], [
  ["`ALMACEN: memoria de datos lista: N KB libres`", "La partición montó."],
  ["`ALIMETRIK: datos cargados: N alumnos, N huellas, ...`", "Las tablas se leyeron."],
  ["`URU4500: lector encendido y listo`", "El lector enumeró y se encendió (a los ~2 s)."],
  ["`RED: red 'ALIMETRIK' activa`", "Hay WiFi y portal."],
  ["`WEB: AUTOPRUEBA ... HTTP 200 en N ms`", "El servidor responde a sí mismo."],
  ["`WEB: AUTOPRUEBA acceso: ... CORRECTO`", "El login y los permisos funcionan."],
  ["`sin dedo en 60s` cíclico, sin `captura fallida`", "El lector espera con normalidad."],
], [4800, 4560]));
k.push(SEP());
k.push(NOTA("Dos cosas que parecen error y no lo son", "(1) A veces el lector **no enumera en un arranque** (`ENUM: CHECK_SHORT_DEV_DESC FAILED`, y no aparece «lector encendido y listo»): es transitorio, un reinicio lo resuelve. Verifique siempre que aparezca esa línea tras grabar. (2) La autoprueba de acceso, si el administrador ya cambió `admin123`, **omite** las pruebas con credenciales y lo informa como CORRECTO: es lo esperado."));
k.push(H2("13.3  Las pruebas incorporadas"));
k.push(...L([
  "**web_autoprueba()** (cada arranque): el equipo se hace peticiones a sí mismo por la red interna y comprueba páginas públicas, respuestas 401 sin sesión, la redirección de `/` a `/login`, y el ciclo de login (clave mala → 401, buena → 200, con sesión → 200). La parte de login tarda **~20 s**: capture al menos 40 s.",
  "**PRUEBA_GUARDADO_MASIVO**: N altas seguidas con el lector armado, midiendo memoria. Sirve para investigar cualquier reporte de «se reinicia al guardar». La última medición: 30 altas, 0 reinicios, memoria estable, ~1,2 s por alta.",
  "**Matcher incrustado** (`xyt_test.h`): minucias reales incrustadas para comprobar el comparador sin dedo (mismo dedo 29 y 37, dedo distinto 10).",
]));
k.push(H2("13.4  Prefijos del log"));
k.push(tb(["Prefijo", "Módulo"], [
  ["`ALIMETRIK`", "`main.c`"], ["`ALMACEN`", "Almacenamiento (errores `GUARDADO FALLO`)"],
  ["`MOD_EST`, `MOD_BIO`, `MOD_REG`, `MOD_USR`, `MOD_SRV`", "Los cinco modelos"],
  ["`URU4500`", "Lector de huellas y su driver"], ["`RED`", "WiFi, DNS y reloj"], ["`WEB`", "Servidor web y autoprueba"],
], [4000, 5360]));
k.push(H2("13.5  Si algo falla"));
k.push(tb(["Síntoma", "Primera sospecha"], [
  ["La placa se reinicia en bucle sin llegar a `app_main`", "Falta el parche de `esp_hosted`."],
  ["`captura fallida` repetida con la misma hora", "Transferencia USB colgada: ¿se llamó `ep_limpiar`?"],
  ["El lector «no agarra» ningún dedo", "¿Alguien volvió a rechazar por «ruido»?"],
  ["La web va lenta (~250 ms por petición)", "Falta `TCP_NODELAY`."],
  ["La web se congela al poner el dedo", "Un cerrojo retenido durante trabajo largo."],
  ["Reinicios espontáneos al guardar", "Cargador débil (el lector consume 200 mA); use uno de 2 A o más. Mire el motivo del reinicio en la línea `rst:` del arranque."],
  ["Los datos «resucitan» tras borrar", "Archivo de migración no borrado."],
], [4300, 5060]));

/* ================= 14 ================= */
k.push(H1("14", "Convenciones del código"));
k.push(tb(["Tema", "Convención"], [
  ["Idioma", "Nombres y comentarios **en español**, sin tildes en los identificadores (`estudiante_t`, `registro`). Los textos que ve el usuario sí llevan tildes."],
  ["Prefijos", "Cada módulo antepone el suyo: `est_`, `bio_`, `reg_`, `usr_`, `srv_`, `alm_`, `auth_`, `red_`, `lector_`, `web_`."],
  ["Rutas de la API", "`a_nombre` para API y `v_nombre` para páginas, en `controlador_web.c`."],
  ["Estado privado", "Variables globales del módulo con prefijo `s_` y `static` (`s_est`, `s_n`)."],
  ["Etiquetas del log", "Una por módulo (`static const char *TAG`), ver el capítulo 13."],
  ["Texto", "Copie con `strlcpy` o con la función `copiar()` del modelo, siempre indicando el tamaño."],
  ["Errores", "Toda función que escribe devuelve `bool` y el llamador **comprueba**. Un fallo se registra en el log (`ESP_LOGE`) y se comunica al usuario."],
  ["Comentarios", "Explican **por qué**, no qué hace la línea. Los bloques que evitan un error ya vivido dicen cuál fue."],
], [2300, 7060]));
k.push(SEP());
k.push(H2("Acumular texto en un búfer: avanzar()"));
k.push(P("`snprintf` devuelve cuántos caracteres **habría escrito**, aunque se haya cortado. Sumar ese valor directamente hace que el índice se pase del búfer. El proyecto usa un ayudante que limita el avance:"));
k.push(...COD(null, [
  "size_t o = 0;                                  /* cuánto llevamos escrito */",
  "o = avanzar(o, cap, snprintf(out + o, cap - o, \"{\\\"lista\\\":[\"));",
  "for (...) {",
  "    o = avanzar(o, cap, snprintf(out + o, cap - o, \"%s{\\\"id\\\":%u}\", sep, id));",
  "}",
  "o = avanzar(o, cap, snprintf(out + o, cap - o, \"]}\"));"].join("\n")));

/* ================= 15 ================= */
k.push(H1("15", "Control de versiones y entrega"));
k.push(H2("15.1  El repositorio"));
k.push(P("El código está en **GitHub**, en el repositorio privado `HOSTINCIRO/alimetrik` (`https://github.com/HOSTINCIRO/alimetrik`), rama `main`. Para dar acceso a otra persona: *Settings → Collaborators → Add people*."));
k.push(tb(["Se sube", "NO se sube (.gitignore)"], [
  ["Firmware completo (`main/`, `components/nbis/`, `parches/`)", "`build/` y `managed_components/` (se regeneran al compilar)"],
  ["Manuales, base de datos, capturas, presentación", "`backups/`: el respaldo de fábrica de la placa (16 MB)"],
  ["Generadores de los documentos (`presentacion/`)", "`node_modules/`, `__pycache__/`, `*.bin`, `*.elf`"],
  ["`README.md` y `PROTOCOLO-4500.md`", "La copia de `codigo/` de la entrega y los experimentos viejos"],
], [4680, 4680]));
k.push(SEP());
k.push(NOTA("Antes de cada subida", "Revise que no se cuelen **contraseñas, tokens de API ni datos reales de estudiantes**. Una búsqueda rápida: `git grep -n -I -E \"ATATT|ghp_|password\"`. La base de datos de ejemplo del repositorio contiene datos ficticios; no suba la base real.", "a"));
k.push(H2("15.2  Trabajo con Jira"));
k.push(P("La gestión del proyecto está en **Jira** (`alimetrik1704.atlassian.net`, proyecto `ALI`). Para que Jira enlace los cambios con las tareas, **empiece el mensaje de cada commit con la clave de la tarea**:"));
k.push(...COD(null, [
  "git commit -m \"ALI-37 el anti-duplicado compara el servicio completo\"",
  "git push"].join("\n")));
k.push(H2("15.3  Regenerar la documentación"));
k.push(P("Los manuales y la presentación se generan con scripts de Node.js en `presentacion/`; los conteos de líneas y los fragmentos de código salen **del código real**, así que se actualizan solos al regenerar."));
k.push(...COD("Regenerar", [
  "cd presentacion",
  "npm install                       # solo la primera vez",
  "node gen-manual-programador.js    # este manual",
  "node gen-manual-tecnico.js        # manual técnico",
  "node gen-manual-usuario.js        # manual de usuario",
  "node gen-diagrama-clases.js && node gen-doc-diagramas.js   # diagramas de la BD"].join("\n")));

/* ================= ANEXO A ================= */
k.push(H1("A", "Anexo A: referencia de funciones"));
k.push(P("Interfaz pública de cada módulo, tal como está en los archivos `.h`."));
const ref = (titulo, filas) => { k.push(H2(titulo)); k.push(tb(["Función", "Qué hace"], filas, [4200, 5160])); k.push(SEP()); };
ref("almacenamiento.h", [
  ["`bool alm_montar(void)`", "Monta la partición de datos."],
  ["`void alm_lock(void)` / `alm_unlock(void)`", "Cerrojo recursivo de las tablas."],
  ["`bool alm_guardar_tabla(ruta, datos, elem, n)`", "Reescritura atómica completa."],
  ["`bool alm_anexar(ruta, datos, elem, n_total)`", "Agrega el último elemento y actualiza el contador."],
  ["`int alm_cargar_tabla(ruta, datos, elem, maxn)`", "Lee la tabla; devuelve cuántos elementos."],
  ["`void alm_espacio(&total, &libre)`", "Espacio de la partición."],
]);
ref("modelo_estudiante.h", [
  ["`void est_cargar(void)`", "Carga la tabla; migra el formato anterior si existe."],
  ["`uint32_t est_crear(doc, nom, ape, grado, autoriza, acu, doc_acu, fecha)`", "Alta; devuelve el id o 0 si no se pudo."],
  ["`int est_cantidad(void)`, `est_por_indice(i)`", "Recorrer la tabla."],
  ["`est_por_id(id)`, `est_por_documento(doc)`", "Buscar un estudiante."],
  ["`bool est_borrar(id)`", "Baja del estudiante; sus huellas las borra el modelo biométrico."],
  ["`bool est_revocar_autorizacion(id)`", "Derecho de supresión."],
  ["`int est_borrar_pruebas(void)`, `est_borrar_todos(void)`", "Mantenimiento."],
]);
ref("modelo_biometrico.h", [
  ["`void bio_cargar(void)`", "Carga las plantillas."],
  ["`bool bio_agregar(est_id, dedo, plantilla)`", "Añade una muestra; exige autorización."],
  ["`identificacion_t bio_identificar(plantilla)`", "Identificación 1:N."],
  ["`int bio_cantidad(void)`, `bio_cantidad_de(est_id)`", "Totales y por estudiante."],
  ["`int bio_borrar_de(est_id)`, `void bio_borrar_todo(void)`", "Borrado."],
]);
ref("modelo_registro.h", [
  ["`void reg_cargar(void)`", "Carga la bitácora."],
  ["`int reg_cantidad(void)`, `reg_por_indice(i)`", "Recorrer (0 = el más reciente)."],
  ["`bool reg_ya_entregado(est_id, servicio, fecha)`", "Anti-duplicado."],
  ["`bool reg_hay_servicio(servicio)`", "¿Es un servicio real?"],
  ["`void reg_borrar_todo(void)`", "Mantenimiento."],
]);
ref("modelo_usuario.h", [
  ["`void usr_cargar(void)`", "Carga; crea el admin inicial si no hay usuarios."],
  ["`usuario_t *usr_verificar(usuario, clave)`", "Comprueba credenciales; NULL si fallan."],
  ["`bool usr_crear(usuario, nombre, clave, rol)`", "Alta con sal aleatoria."],
  ["`bool usr_cambiar_clave(usuario, nueva)`", "Nueva sal en cada cambio."],
  ["`bool usr_borrar(id)`", "Nunca deja el sistema sin administrador."],
  ["`bool usr_clave_por_defecto(void)`", "¿Sigue `admin123`?"],
]);
ref("modelo_servicio.h", [
  ["`void srv_cargar(void)`", "Carga; si está vacío, crea los tres por defecto."],
  ["`void srv_en_minuto(minuto, destino, n)`", "Copia el servicio vigente en ese minuto del día."],
  ["`bool srv_es_real(nombre)`", "Distingue de «Fuera de horario» y «Sin hora»."],
  ["`uint32_t srv_crear(nombre, inicio, fin)`", "Alta; 0 si se cruza o no hay espacio."],
  ["`bool srv_actualizar(id, nombre, inicio, fin, activo)`", "Edición."],
  ["`bool srv_borrar(id)`, `void srv_restaurar_por_defecto(void)`", "Baja y restauración."],
  ["`srv_texto_a_minutos(\"HH:MM\")`, `srv_minutos_a_texto(m, destino)`", "Conversión."],
]);
ref("controlador_lector.h", [
  ["`bool lector_iniciar(void)`", "Inicia el USB y las tareas."],
  ["`lector_mensaje(t)`, `_reposo(t)`, `_resultado(t)`", "Los tres niveles de aviso."],
  ["`void lector_estado_actual(destino, n)`", "Estado para `/api/estado`."],
  ["`lector_enrolamiento_pedir(id)`, `_cancelar()`, `_pendiente()`, `_faltan()`", "Control del enrolamiento."],
  ["`lector_procesar_plantilla(plantilla, enrolamiento)`", "Procesa una plantilla ya extraída (uso interno y autopruebas)."],
]);
ref("controlador_red.h y controlador_auth.h", [
  ["`bool red_iniciar_wifi(ssid, clave)`, `red_iniciar_dns()`", "Red y portal cautivo."],
  ["`red_fijar_hora(epoch, desfase)`, `bool red_hay_hora()`", "Reloj."],
  ["`red_fecha_hora(fecha, hora)`, `red_servicio_actual(destino, n)`", "Fecha, hora y servicio vigente."],
  ["`auth_iniciar_sesion(usuario, clave)`, `auth_cerrar_sesion(token)`", "Sesiones."],
  ["`auth_exigir(req, solo_admin)`", "Puerta de cada ruta protegida."],
  ["`auth_cerrar_sesiones_de(usuario_id)`", "Revoca todas las sesiones de un usuario."],
]);

/* ================= ANEXO B ================= */
k.push(H1("B", "Anexo B: constantes y límites"));
k.push(tb(["Constante", "Valor", "Dónde", "Significado"], [
  ["`EST_MAX`", "1000", "modelo_estudiante.h", "Estudiantes"],
  ["`BIO_MAX_HUELLAS`", "3000", "modelo_biometrico.h", "Plantillas (≈ 7,3 MB si se llena)"],
  ["`REG_MAX`", "2000", "modelo_registro.h", "Registros antes de rotar (se descarta el 10 %)"],
  ["`USR_MAX`", "16", "modelo_usuario.h", "Usuarios"],
  ["`SRV_MAX`", "8", "modelo_servicio.h", "Servicios"],
  ["`AUTH_MAX_SESIONES`", "8", "controlador_auth.h", "Sesiones simultáneas"],
  ["`AUTH_CADUCIDAD_MIN`", "480", "controlador_auth.h", "Minutos de inactividad"],
  ["`ENROL_MUESTRAS`", "3", "controlador_lector.c", "Muestras por dedo"],
  ["`ENROL_CADUCIDAD_US`", "90 s", "controlador_lector.c", "Vence un enrolamiento sin muestra"],
  ["`IMAGE_WIDTH × HEIGHT`", "384 × 290", "controlador_lector.c", "Imagen del lector"],
  ["`FP_MAX_MINUTIAE`", "200", "nbis", "Minucias por plantilla"],
  ["`FP_MATCH_THRESHOLD`", "14", "nbis", "Correspondencias para «mismo dedo»"],
  ["`FP_DIST_TOL`, `FP_ANG_TOL`", "11 px, 20°", "nbis_wrap.c", "Tolerancias de comparación"],
  ["Mínimo de minucias", "12 / 6", "controlador_lector.c", "Al enrolar / al identificar"],
  ["Cobertura mínima", "35 %", "controlador_lector.c", "Rechazo por imagen incompleta"],
], [2700, 1300, 2300, 3060]));
k.push(SEP());
k.push(H2("Mapa de la memoria flash (16 MB)"));
k.push(tb(["Partición", "Offset", "Tamaño", "Contenido"], [
  ["`nvs`", "0x9000", "24 KB", "Datos de WiFi"],
  ["`phy_init`", "0xF000", "4 KB", "Calibración de radio"],
  ["`factory`", "0x10000", "3 MB", "El firmware"],
  ["`almacen`", "después", "8 MB", "Los datos (FATFS): alumnos, huellas, registros…"],
], [2200, 1800, 1700, 3660]));

D.Packer.toBuffer(documento(k, "ALIMETRIK · Manual del programador")).then(b => {
  fs.writeFileSync(SALIDA, b);
  console.log("OK:", SALIDA, b.length, "bytes");
});
