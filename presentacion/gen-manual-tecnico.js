const fs = require("fs");
const H = require("./comun-doc.js");
const {D,H1,H2,BODY,BUL,NUM,CODE,CALLOUT,TABLA,SEP,MINTBG,AMBERBG,AMBER,CORAL,MINT,NAVY,MUTED} = H;
const PT_ = n => n*2;
const k = [];

H.portada(k, fs, "MANUAL TÉCNICO",
  "Instalación, arquitectura y mantenimiento del sistema",
  "ESP32-P4 (Guition) · DigitalPersona U.are.U 4500 · ESP-IDF v5.5 · Arquitectura MVC",
  "Versión 2.1 · Octubre de 2026");

k.push(H1("", "Contenido"));
[["1","Descripción general y requisitos"],["2","Instalación del entorno de desarrollo"],
 ["3","Estructura del proyecto (arquitectura MVC)"],["4","Compilación y grabación del firmware"],
 ["5","Puesta en marcha y verificación"],["6","Arquitectura del software"],
 ["7","Base de datos"],["8","Seguridad y control de acceso"],
 ["9","API de servicios (REST)"],["10","Configuración y personalización"],
 ["11","Mantenimiento, respaldo y restauración"],["12","Diagnóstico y solución de problemas"],
 ["13","Anexo: cableado y conexiones"]
].forEach(([n,t])=>k.push(new D.Paragraph({spacing:{after:90},children:[
  new D.TextRun({text:n.padStart(2," ")+"   ",font:"Courier New",size:PT_(11),bold:true,color:MINT}),
  new D.TextRun({text:t,font:"Calibri",size:PT_(11.5),color:NAVY})]})));

// 1
k.push(H1("1","Descripción general y requisitos"));
k.push(BODY("ALIMETRIK es un sistema embebido autónomo para el control de entrega de raciones en comedores escolares mediante identificación biométrica. Todo el sistema (driver del lector, motor de reconocimiento, base de datos y servidor web) se ejecuta dentro del microcontrolador; no requiere computador, servidor ni conexión a internet."));
k.push(H2("1.1  Requisitos de hardware"));
k.push(TABLA(["Componente","Especificación","Observaciones"],[
  [[["Placa de control",{bold:true}]],[["ESP32-P4 (Guition), revisión de silicio v1.3",{}]],[["Doble núcleo RISC-V 360 MHz, 32 MB PSRAM, 16 MB flash",{}]]],
  [[["Radio WiFi",{bold:true}]],[["ESP32-C6 integrado, enlazado por SDIO",{}]],[["Provee la red propia del equipo",{}]]],
  [[["Lector biométrico",{bold:true}]],[["DigitalPersona U.are.U 4500 (VID 05BA, PID 000A)",{}]],[["Conectado al puerto USB-OTG de la placa",{}]]],
  [[["Alimentación",{bold:true}]],[["5 V / 2 A por USB-C",{}]],[["El lector consume ~200 mA del puerto de la placa",{}]]],
  [[["Cable de programación",{bold:true}]],[["USB a serie CH340",{}]],[["Solo para grabar el firmware y ver diagnósticos",{}]]],
],[2050,3600,3710]));
k.push(SEP());
k.push(H2("1.2  Requisitos de software"));
k.push(TABLA(["Herramienta","Versión","Para qué"],[
  [[["ESP-IDF",{bold:true}]],[["v5.5 o superior",{}]],[["Compilador y bibliotecas del microcontrolador",{}]]],
  [[["Python",{bold:true}]],[["3.9 o superior",{}]],[["Requerido por las herramientas de ESP-IDF",{}]]],
  [[["Git",{bold:true}]],[["cualquiera reciente",{}]],[["Descarga del entorno y sus componentes",{}]]],
  [[["Controlador CH340",{bold:true}]],[["según el sistema operativo",{}]],[["Reconocer el puerto serie (Windows y macOS antiguos)",{}]]],
],[2200,2400,4760]));
k.push(SEP());
k.push(CALLOUT("Compatibilidad de sistema operativo",[["El desarrollo se realizó en macOS. El proyecto compila igualmente en Linux y Windows; solo cambia el nombre del puerto serie: ",{}],["/dev/cu.usbserial-110",{font:"Courier New"}],[" en macOS, ",{}],["/dev/ttyUSB0",{font:"Courier New"}],[" en Linux y ",{}],["COM3",{font:"Courier New"}],[" (u otro) en Windows.",{}]]));

// 2
k.push(H1("2","Instalación del entorno de desarrollo"));
k.push(BODY("Solo se requiere en el equipo desde el cual se grabará el firmware. Una vez grabado, el sistema funciona sin ninguna computadora."));
k.push(H2("2.1  Linux y macOS"));
k.push(...CODE("Instalación de ESP-IDF",[
  "# 1) Dependencias del sistema (Ubuntu/Debian)",
  "sudo apt-get install git wget flex bison gperf python3 python3-pip \\",
  "     python3-venv cmake ninja-build ccache libffi-dev libssl-dev dfu-util",
  "",
  "# 2) Descargar el entorno de Espressif",
  "mkdir -p ~/esp && cd ~/esp",
  "git clone -b v5.5 --recursive https://github.com/espressif/esp-idf.git",
  "",
  "# 3) Instalar las herramientas para ESP32-P4",
  "cd ~/esp/esp-idf",
  "./install.sh esp32p4",
  "",
  "# 4) Activar el entorno (repetir en cada terminal nueva)",
  "source ~/esp/esp-idf/export.sh"].join("\n")));
k.push(H2("2.2  Windows"));
k.push(BODY([["Descargue el instalador ",{}],["ESP-IDF Tools Installer",{bold:true}],[" desde el sitio oficial de Espressif, seleccione la versión ",{}],["v5.5",{bold:true}],[" y marque el destino ",{}],["ESP32-P4",{bold:true}],[". El instalador crea un acceso directo «ESP-IDF Command Prompt» desde el cual se ejecutan todos los comandos de este manual.",{}]]));
k.push(H2("2.3  Verificación"));
k.push(...CODE(null,[
  "idf.py --version        # debe mostrar v5.5.x",
  "python --version        # 3.9 o superior"].join("\n")));

// 3
k.push(H1("3","Estructura del proyecto (arquitectura MVC)"));
k.push(BODY([["El código sigue el patrón ",{}],["Modelo–Vista–Controlador",{bold:true,color:MINT}],[", que separa los datos, la presentación y la coordinación entre ambos. Cada carpeta tiene una responsabilidad única:",{}]]));
k.push(...CODE("Árbol del proyecto",[
  "codigo/",
  "├── CMakeLists.txt              Definición del proyecto",
  "├── partitions.csv              Reparto de la memoria flash",
  "├── sdkconfig.defaults          Configuración del microcontrolador",
  "│",
  "├── main/",
  "│   ├── main.c                  Punto de entrada: arranca las 3 capas",
  "│   ├── CMakeLists.txt          Registro de fuentes y vistas incrustadas",
  "│   │",
  "│   ├── modelos/                ── M O D E L O ──",
  "│   │   ├── almacenamiento.c/h      Memoria permanente y cerrojo",
  "│   │   ├── modelo_estudiante.c/h   Alumnos y su autorización",
  "│   │   ├── modelo_biometrico.c/h   Plantillas e identificación 1:N",
  "│   │   ├── modelo_registro.c/h     Bitácora y anti-duplicado",
  "│   │   ├── modelo_usuario.c/h      Encargados y contraseñas",
  "│   │   └── modelo_servicio.c/h     Servicios y sus horarios (configurables)",
  "│   │",
  "│   ├── vistas/                 ── V I S T A ──",
  "│   │   ├── vista_sistema.html      Interfaz principal (6 pestañas)",
  "│   │   ├── vista_login.html        Pantalla de inicio de sesión",
  "│   │   ├── vista_terminos.html     Política de datos biométricos",
  "│   │   └── vista_json.c/h          Serialización de datos para la API",
  "│   │",
  "│   └── controladores/          ── C O N T R O L A D O R ──",
  "│       ├── controlador_web.c/h     Servidor HTTP y rutas",
  "│       ├── controlador_auth.c/h    Sesiones y permisos",
  "│       ├── controlador_red.c/h     WiFi, DNS y reloj",
  "│       └── controlador_lector.c/h  Driver USB del lector",
  "│",
  "└── componentes/reconocimiento/ Motor biométrico (NIST + comparador propio)"].join("\n")));
k.push(H2("3.1  Responsabilidad de cada capa"));
k.push(TABLA(["Capa","Qué contiene","Regla de diseño"],[
  [[["Modelo",{bold:true}]],[["Estructuras de datos, reglas de negocio y persistencia. No conoce HTTP ni HTML.",{}]],[["Si cambia la interfaz, el modelo no se toca",{}]]],
  [[["Vista",{bold:true}]],[["Las páginas HTML y la conversión de datos a JSON. No decide nada.",{}]],[["Solo presenta lo que el controlador le entrega",{}]]],
  [[["Controlador",{bold:true}]],[["Recibe peticiones, valida permisos, invoca al modelo y responde con la vista.",{}]],[["Es el único que conoce ambas capas",{}]]],
],[1700,4700,2960]));

// 4
k.push(H1("4","Compilación y grabación del firmware"));
k.push(...NUM([
  [["Conecte la placa al computador con el cable USB-serie.",{}]],
  [["Identifique el puerto asignado (ver tabla siguiente).",{}]],
  [["Ejecute los comandos de compilación y grabación.",{}]],
]));
k.push(H2("4.1  Identificar el puerto"));
k.push(...CODE(null,[
  "# macOS",
  "ls /dev/cu.usbserial-*",
  "# Linux",
  "ls /dev/ttyUSB*",
  "# Windows: ver el Administrador de dispositivos > Puertos (COM y LPT)"].join("\n")));
k.push(H2("4.2  Compilar y grabar"));
k.push(...CODE("Secuencia completa",[
  "cd codigo/",
  "source ~/esp/esp-idf/export.sh          # en Windows: usar ESP-IDF Command Prompt",
  "",
  "idf.py set-target esp32p4               # solo la primera vez",
  "idf.py reconfigure                      # descarga los componentes de WiFi",
  "./parches/aplicar-parches.sh            # OBLIGATORIO (ver el recuadro siguiente)",
  "idf.py build                            # compila (5-10 min la primera vez)",
  "idf.py -p /dev/cu.usbserial-110 -b 460800 flash    # graba el firmware",
  "",
  "# Ver los mensajes del equipo (Ctrl+] para salir)",
  "idf.py -p /dev/cu.usbserial-110 monitor"].join("\n")));
k.push(CALLOUT("El parche es obligatorio",[["El componente de WiFi (",{}],["esp_hosted",{font:"Courier New"}],[") arranca solo ",{}],["antes",{bold:true}],[" que el programa y agota la memoria interna: sin el parche la placa se reinicia en bucle y ",{}],["nunca llega a funcionar",{bold:true}],[". El script ",{}],["parches/aplicar-parches.sh",{font:"Courier New"}],[" lo aplica. Hay que repetirlo cada vez que se vuelvan a descargar los componentes (por ejemplo, después de borrar la carpeta ",{}],["managed_components",{font:"Courier New"}],[").",{}]],AMBERBG,AMBER));
k.push(SEP());
k.push(CALLOUT("Si la grabación falla",[["Compruebe que ningún otro programa tenga ocupado el puerto (monitor serie abierto, otra terminal). En Linux y macOS: ",{}],["lsof /dev/cu.usbserial-110",{font:"Courier New"}],[" y cierre el proceso. Si persiste, baje la velocidad a ",{}],["-b 115200",{font:"Courier New"}],[". El cable CH340 introduce ruido a velocidades altas.",{}]],AMBERBG,AMBER));

k.push(H2("4.3  Obtener el código desde GitHub"));
k.push(BODY([["El código completo está en un repositorio de GitHub. Para trabajar en otro computador:",{}]]));
k.push(...CODE(null,[
  "git clone https://github.com/HOSTINCIRO/alimetrik.git",
  "cd alimetrik/test-driver-4500",
  "# después, los mismos pasos de 4.2: reconfigure, aplicar parche, build, flash"].join("\n")));
k.push(BODY([["El repositorio es privado: para dar acceso a otra persona, en GitHub: ",{}],["Settings → Collaborators → Add people",{bold:true}],[". No se suben las compilaciones (",{}],["build/",{font:"Courier New"}],[") ni los componentes descargados: se regeneran al compilar. Para entender el código por dentro, vea el ",{}],["Manual del programador",{bold:true}],[".",{}]]));

// 5
k.push(H1("5","Puesta en marcha y verificación"));
k.push(BODY("Al arrancar, el sistema se autodiagnostica y reporta cada paso por el puerto serie. Una secuencia correcta se ve así:"));
k.push(...CODE("Mensajes de un arranque sano",[
  "ALIMETRIK: ALIMETRIK - comedor escolar con huella dactilar",
  "ALMACEN:   memoria de datos lista: 8056 KB libres de 8080 KB",
  "MOD_USR:   1 usuarios del sistema cargados",
  "MOD_EST:   2 estudiantes cargados",
  "MOD_BIO:   5 plantillas biometricas cargadas",
  "MOD_REG:   0 registros de entrega cargados",
  "URU4500:   buffer de captura listo (memoria interna, correcto)",
  "URU4500:   lector encendido y listo",
  "RED:       red 'ALIMETRIK' activa (abierta) - portal en http://192.168.4.1",
  "WEB:       servidor web activo en http://192.168.4.1/",
  "WEB:       AUTOPRUEBA /login              HTTP 200 en 7 ms",
  "WEB:       AUTOPRUEBA /api/estado         HTTP 401 en 2 ms   <- protegido, correcto",
  "WEB:       AUTOPRUEBA /                   HTTP 302 en 3 ms   <- redirige al login",
  "WEB:       AUTOPRUEBA acceso: clave mala=401 | clave buena=200 | con sesion=200 -> CORRECTO",
  "ALIMETRIK: listo: conectese a la red WiFi 'ALIMETRIK' y abra http://192.168.4.1"].join("\n")));
k.push(CALLOUT("Autopruebas incorporadas",[["El equipo se prueba a sí mismo en cada arranque: verifica el motor de comparación con huellas de referencia, monta la base de datos y ",{}],["se hace peticiones HTTP a sí mismo",{bold:true}],[" comprobando que las rutas públicas respondan y las protegidas rechacen el acceso. Si alguna línea dice ",{}],["REVISAR",{bold:true,color:CORAL}],[", hay un problema antes de que llegue al usuario.",{}]]));
k.push(H2("5.1  Primer acceso"));
k.push(...NUM([
  [["Conecte un celular a la red WiFi ",{}],["ALIMETRIK",{bold:true,font:"Courier New"}],[".",{}]],
  [["Abra ",{}],["http://192.168.4.1",{bold:true,font:"Courier New"}],[" en el navegador.",{}]],
  [["Ingrese con ",{}],["admin / admin123",{bold:true,font:"Courier New"}],[".",{}]],
  [["Cambie de inmediato la contraseña en Configuración → Mi cuenta.",{bold:true}]],
]));

// 6
k.push(H1("6","Arquitectura del software"));
k.push(H2("6.1  Tareas concurrentes"));
k.push(BODY("El firmware ejecuta varias tareas en paralelo sobre FreeRTOS. La separación es deliberada: la captura no debe bloquearse por el procesamiento, ni el servidor web por la escritura en memoria."));
k.push(TABLA(["Tarea","Núcleo / prioridad","Función"],[
  [[["lector",{bold:true,font:"Courier New"}]],[["1 / 4",{}]],[["Espera el dedo, captura la imagen (~1 s) y la encola. Queda libre de inmediato.",{}]]],
  [[["procesador",{bold:true,font:"Courier New"}]],[["1 / 3",{}]],[["Extrae minucias (2-5 s), identifica y registra. No bloquea al lector.",{}]]],
  [[["usb_host / usb_client",{bold:true,font:"Courier New"}]],[["0 / 2-3",{}]],[["Pila USB y eventos de conexión del lector.",{}]]],
  [[["httpd",{bold:true,font:"Courier New"}]],[["según IDF",{}]],[["Atiende las peticiones web (un solo hilo: las respuestas deben ser breves).",{}]]],
  [[["dns",{bold:true,font:"Courier New"}]],[["— / 4",{}]],[["Portal cautivo: responde toda consulta con la IP del equipo.",{}]]],
],[2100,1800,5460]));
k.push(SEP());
k.push(H2("6.2  Flujo de una verificación"));
k.push(...CODE("Recorrido completo de un dedo",[
  "  Lector 4500                CONTROLADOR              MODELO",
  "  ───────────                ───────────              ──────",
  "  dedo detectado  ──────►  controlador_lector",
  "  imagen cifrada  ──────►  descifra (XOR/LFSR)",
  "                           control de calidad",
  "                           ├─► encola trabajo   (el lector queda libre)",
  "                           │",
  "                           └─► procesador:",
  "                               extrae minucias  ──►  modelo_biometrico",
  "                                                     identificar 1:N",
  "                                                     ▼",
  "                               servicio por hora ──► modelo_registro",
  "                               anti-duplicado         ¿ya recibió hoy?",
  "                                                     ▼",
  "                               resultado en pantalla y registro guardado"].join("\n")));
k.push(H2("6.3  Motor de reconocimiento"));
k.push(...BUL([
  [["Extracción:",{bold:true}],[" algoritmo MINDTCT del NIST (dominio público), adaptado al microcontrolador. Obtiene entre 20 y 50 minucias por huella.",{}]],
  [["Comparación:",{bold:true}],[" implementación propia. Por cada par de minucias como hipótesis, alinea las huellas mediante rotación y traslación, y cuenta correspondencias (distancia < 11 px, ángulo < 20°). Emplea una rejilla espacial para lograr ~30 ms por comparación.",{}]],
  [["Umbral:",{bold:true}],[" 14 correspondencias. Con 3 muestras por dedo, el mismo dedo obtiene entre 20 y 30; dedos distintos, 10 o menos.",{}]],
]));
k.push(CALLOUT("Nota de portabilidad",[["El comparador oficial del NIST (bozorth3) ",{}],["diverge en arquitecturas de 32 bits",{bold:true}],[" y no discrimina correctamente en este procesador. Por eso se implementó un comparador propio, validado contra los resultados del algoritmo original ejecutado en un equipo de 64 bits.",{}]],AMBERBG,AMBER));

// 7
k.push(H1("7","Base de datos"));
k.push(BODY("El sistema no utiliza un motor SQL: en un microcontrolador resulta más eficiente almacenar tablas de registros de tamaño fijo en archivos binarios. El modelo relacional equivalente está documentado en el archivo esquema.sql de la entrega."));
k.push(H2("7.1  Ubicación y formato"));
k.push(TABLA(["Archivo","Contenido","Capacidad"],[
  [[["/almacen/usuarios.dat",{font:"Courier New"}]],[["Encargados del sistema (contraseñas cifradas)",{}]],[["16",{}]]],
  [[["/almacen/estudian.dat",{font:"Courier New"}]],[["Alumnos y su autorización de datos",{}]],[["1.000",{}]]],
  [[["/almacen/huellas.dat",{font:"Courier New"}]],[["Plantillas de minucias (3 por dedo)",{}]],[["3.000",{}]]],
  [[["/almacen/registro.dat",{font:"Courier New"}]],[["Bitácora de entregas (rotativa)",{}]],[["2.000",{}]]],
  [[["/almacen/servicio.dat",{font:"Courier New"}]],[["Servicios del comedor y sus horarios",{}]],[["8",{}]]],
],[2900,4600,1860]));
k.push(SEP());
k.push(...CODE("Formato de cada archivo",[
  "[ cantidad : 4 bytes ][ registro 1 ][ registro 2 ] ... [ registro N ]",
  "",
  "Todos los registros de un archivo tienen el mismo tamaño, de modo que el",
  "registro N se localiza con una multiplicación, sin recorrer el archivo."].join("\n")));
k.push(H2("7.2  Estrategia de escritura"));
k.push(CALLOUT("Por qué se anexa en lugar de reescribir",[["Mientras se escribe en la memoria flash, el procesador ",{}],["no puede leer su propio programa",{bold:true}],[": todo el firmware se detiene. Reescribir una tabla completa tomaba 1,7 s y congelaba hasta el servidor web, provocando que el navegador diera por perdida la petición. La solución fue ",{}],["anexar",{bold:true}],[" únicamente el registro nuevo al final y actualizar el contador de la cabecera: dos escrituras pequeñas de ~350 ms.",{}]]));
k.push(SEP());
k.push(H2("7.3  Migración de esquema"));
k.push(BODY([["Al añadirse los campos de autorización, el formato de la tabla de estudiantes cambió. El sistema detecta el archivo del formato anterior (",{}],["estud.dat",{font:"Courier New"}],[") y lo convierte automáticamente al nuevo (",{}],["estudian.dat",{font:"Courier New"}],[") en el primer arranque, conservando los registros existentes y marcándolos como migrados.",{}]]));

// 8
k.push(H1("8","Seguridad y control de acceso"));
k.push(TABLA(["Medida","Implementación"],[
  [[["Contraseñas",{bold:true}]],[["No se almacenan en texto legible. Se guarda SHA-256(sal ‖ contraseña), con una sal aleatoria distinta por usuario, regenerada en cada cambio.",{}]]],
  [[["Comparación",{bold:true}]],[["En tiempo constante, para no filtrar información mediante la medición de tiempos.",{}]]],
  [[["Sesiones",{bold:true}]],[["Identificador aleatorio de 128 bits en cookie HttpOnly con SameSite=Lax. Caducan a las 8 horas de inactividad. Máximo 8 sesiones simultáneas.",{}]]],
  [[["Autorización",{bold:true}]],[["Cada ruta declara si exige sesión y si exige rol de administrador. Sin sesión: 401; sin permisos: 403.",{}]]],
  [[["Datos biométricos",{bold:true}]],[["Solo se guardan plantillas de minucias, nunca imágenes. El proceso es irreversible.",{}]]],
  [[["Aislamiento",{bold:true}]],[["Red local propia sin salida a internet: los datos no abandonan el equipo.",{}]]],
  [[["Integridad de escritura",{bold:true}]],[["Toda escritura se verifica; si falla, la operación se deshace y se informa al usuario (código 507).",{}]]],
],[2350,7010]));
k.push(SEP());
k.push(CALLOUT("Recomendaciones de despliegue",[["1) Cambiar la contraseña de fábrica antes de poner el sistema en operación. 2) Crear un usuario por encargado, con rol de operador cuando no requiera administrar. 3) Considerar proteger la red WiFi con clave WPA2 (ver sección 10). 4) Ubicar el equipo en un lugar de acceso restringido.",{}]]));

// 9
k.push(H1("9","API de servicios (REST)"));
k.push(BODY("Toda la interfaz consume estos servicios. Las respuestas son JSON. La columna «Acceso» indica el nivel exigido."));
k.push(TABLA(["Método y ruta","Función","Acceso"],[
  [[["GET /",{font:"Courier New"}]],[["Interfaz principal (redirige al login si no hay sesión)",{}]],[["Sesión",{}]]],
  [[["GET /login",{font:"Courier New"}]],[["Pantalla de inicio de sesión",{}]],[["Público",{}]]],
  [[["GET /terminos",{font:"Courier New"}]],[["Política de tratamiento de datos",{}]],[["Público",{}]]],
  [[["POST /api/login",{font:"Courier New"}]],[["Autenticar y abrir sesión",{}]],[["Público",{}]]],
  [[["POST /api/logout",{font:"Courier New"}]],[["Cerrar sesión",{}]],[["Sesión",{}]]],
  [[["GET /api/sesion",{font:"Courier New"}]],[["Datos del usuario conectado",{}]],[["Sesión",{}]]],
  [[["GET /api/estado",{font:"Courier New"}]],[["Métricas, reloj, estado del lector y último evento",{}]],[["Sesión",{}]]],
  [[["GET /api/estudiantes",{font:"Courier New"}]],[["Lista de alumnos",{}]],[["Sesión",{}]]],
  [[["POST /api/estudiantes",{font:"Courier New"}]],[["Registrar alumno (exige autorización)",{}]],[["Admin",{}]]],
  [[["POST /api/estudiantes/borrar",{font:"Courier New"}]],[["Eliminar alumno y sus huellas",{}]],[["Admin",{}]]],
  [[["POST /api/estudiantes/revocar",{font:"Courier New"}]],[["Revocar autorización y suprimir huellas",{}]],[["Admin",{}]]],
  [[["GET /api/registros",{font:"Courier New"}]],[["Últimos 60 movimientos",{}]],[["Sesión",{}]]],
  [[["POST /api/enrolar",{font:"Courier New"}]],[["Iniciar enrolamiento de 3 muestras",{}]],[["Admin",{}]]],
  [[["POST /api/hora",{font:"Courier New"}]],[["Ajustar el reloj del equipo",{}]],[["Sesión",{}]]],
  [[["GET /api/usuarios",{font:"Courier New"}]],[["Listar encargados",{}]],[["Admin",{}]]],
  [[["POST /api/clave",{font:"Courier New"}]],[["Cambiar la propia contraseña",{}]],[["Sesión",{}]]],
  [[["GET /api/info",{font:"Courier New"}]],[["Estado del equipo y memoria disponible",{}]],[["Admin",{}]]],
],[3300,4560,1500]));
k.push(SEP());
k.push(...CODE("Ejemplo de uso con curl",[
  "# Autenticarse y conservar la cookie de sesión",
  "curl -c cookies.txt -X POST http://192.168.4.1/api/login \\",
  "     -H 'Content-Type: application/json' \\",
  "     -d '{\"usuario\":\"admin\",\"clave\":\"admin123\"}'",
  "",
  "# Consultar el estado usando esa sesión",
  "curl -b cookies.txt http://192.168.4.1/api/estado"].join("\n")));

// 10
k.push(H1("10","Configuración y personalización"));
k.push(H2("10.1  Horarios de los servicios"));
k.push(CALLOUT("Se configuran desde el portal, sin reprogramar",[["Los servicios y sus franjas horarias ",{}],["ya no están escritos en el código",{bold:true}],[": se administran desde ",{}],["Configuración → Servicios y horarios",{bold:true}],[" y se guardan en la memoria permanente del equipo (archivo ",{}],["/almacen/servicio.dat",{font:"Courier New"}],["). Reprogramar el equipo NO es necesario para cambiar un horario.",{}]]));
k.push(SEP());
k.push(BODY([["El modelo correspondiente es ",{}],["modelos/modelo_servicio.c",{font:"Courier New",bold:true}],[". Reglas que aplica:",{}]]));
k.push(...BUL([
  [["Hasta 8 servicios. Cada uno tiene nombre, hora de inicio, hora de fin y estado (activo o suspendido).",{}]],
  [["Las franjas de los servicios ",{}],["activos no pueden cruzarse",{bold:true}],[" entre sí; el sistema rechaza el cambio con un mensaje claro.",{}]],
  [["Fuera de toda franja, el resultado de una verificación es ",{}],["sin_servicio",{font:"Courier New",bold:true}],[": se registra el paso pero no se entrega ración.",{}]],
  [["La hora de inicio debe ser ",{}],["anterior",{bold:true}],[" a la de fin: ",{}],["no se acepta una franja que cruce la medianoche",{bold:true}],[" (por ejemplo 22:00 a 02:00). Si hiciera falta, se define como dos servicios: 22:00 a 24:00 y 00:00 a 02:00.",{}]],
  [["Si la tabla está vacía, se crean automáticamente Desayuno, Almuerzo y Refrigerio con los horarios habituales.",{}]],
]));
k.push(SEP());
k.push(BODY([["Endpoints correspondientes: ",{}],["GET /api/servicios",{font:"Courier New"}],[" (listar), ",{}],["POST /api/servicios",{font:"Courier New"}],[" (crear o editar, según lleve id), ",{}],["POST /api/servicios/borrar",{font:"Courier New"}],[" y ",{}],["POST /api/servicios/restaurar",{font:"Courier New"}],[". Requieren rol de administrador.",{}]]));
k.push(H2("10.2  Nombre y clave de la red WiFi"));
k.push(BODY([["En ",{}],["main.c",{font:"Courier New",bold:true}],[":",{}]]));
k.push(...CODE(null,[
  "#define RED_NOMBRE   \"ALIMETRIK\"",
  "#define RED_CLAVE    NULL      // NULL = abierta; o una clave de 8+ caracteres",
  "",
  "// Para proteger la red:",
  "#define RED_CLAVE    \"comedor2026\""].join("\n")));
k.push(H2("10.3  Umbral de reconocimiento"));
k.push(BODY([["En ",{}],["componentes/reconocimiento/include/nbis_wrap.h",{font:"Courier New",bold:true}],[": ",{}],["FP_MATCH_THRESHOLD",{font:"Courier New",bold:true}],[" (valor por defecto: 14). Aumentarlo hace el sistema más estricto (más rechazos de personas legítimas); disminuirlo, más permisivo (riesgo de confundir personas). ",{}],["No se recomienda modificarlo sin realizar pruebas con población real.",{bold:true}]]));
k.push(H2("10.4  Tareas de mantenimiento puntual"));
k.push(BODY([["En ",{}],["main.c",{font:"Courier New",bold:true}],[" existen interruptores para operaciones excepcionales. Se ponen en 1, se graba una vez, se verifica en el registro y se devuelven a 0:",{}]]));
k.push(...CODE(null,[
  "#define BORRAR_HUELLAS_Y_REGISTROS   0   // borra biometría y bitácora",
  "#define BORRAR_ALUMNOS_DE_PRUEBA     0   // borra alumnos con documento TEST*"].join("\n")));

// 11
k.push(H1("11","Mantenimiento, respaldo y restauración"));
k.push(H2("11.1  Copia de seguridad de los datos"));
k.push(...CODE("Respaldo de la partición de datos (8 MB)",[
  "esptool.py -p /dev/cu.usbserial-110 read_flash 0x310000 0x800000 respaldo-datos.bin",
  "",
  "# Restaurar",
  "esptool.py -p /dev/cu.usbserial-110 write_flash 0x310000 respaldo-datos.bin"].join("\n")));
k.push(H2("11.2  Respaldo completo del equipo"));
k.push(...CODE("Imagen íntegra de 16 MB (firmware + datos)",[
  "esptool.py -p /dev/cu.usbserial-110 read_flash 0x0 0x1000000 respaldo-completo.bin"].join("\n")));
k.push(CALLOUT("Frecuencia recomendada",[["Realice un respaldo ",{}],["al finalizar cada periodo académico",{bold:true}],[" y siempre ",{}],["antes de actualizar el firmware",{bold:true}],[". Guarde las copias fuera del equipo. Actualizar el firmware con ",{}],["idf.py flash",{font:"Courier New"}],[" NO borra los datos: solo un ",{}],["erase_flash",{font:"Courier New"}],[" completo lo haría.",{}]],AMBERBG,AMBER));
k.push(H2("11.3  Recuperar el acceso si se pierden todas las contraseñas"));
k.push(BODY([["Borre únicamente el archivo de usuarios: al arrancar, el sistema recrea el administrador de fábrica. Añada temporalmente en ",{}],["main.c",{font:"Courier New"}],[", tras ",{}],["alm_montar()",{font:"Courier New"}],[":",{}]]));
k.push(...CODE(null,'remove("/almacen/usuarios.dat");   // borrar esta línea tras usarla una vez'));

// 12
k.push(H1("12","Diagnóstico y solución de problemas"));
k.push(BODY("El puerto serie es la herramienta principal de diagnóstico: el sistema informa cada operación con su duración."));
k.push(TABLA(["Síntoma","Causa probable","Solución"],[
  [[["El equipo se reinicia en bucle",{bold:true}]],[["El subsistema WiFi se inicia antes que el programa principal y agota la memoria interna",{}]],[["Verificar que el constructor automático de esp_hosted esté desactivado (parche documentado en el código)",{}]]],
  [[["«captura fallida» repetido",{bold:true}]],[["Una transferencia USB quedó pendiente tras un tiempo de espera agotado",{}]],[["El firmware se recupera solo; si persiste, desconecte y reconecte el lector",{}]]],
  [[["El lector no se detecta",{bold:true}]],[["Cable USB flojo o sin alimentación suficiente",{}]],[["Revisar el cable; usar fuente de 5 V / 2 A. La web lo advierte cada 5 s",{}]]],
  [[["La web responde con lentitud",{bold:true}]],[["Retardo de Nagle en respuestas cortas",{}]],[["Ya corregido con TCP_NODELAY; confirmar en las autopruebas (4-12 ms)",{}]]],
  [[["Registros con fecha 1970",{bold:true}]],[["El equipo arrancó sin recibir la hora",{}]],[["Abrir el portal desde un celular: la hora se ajusta automáticamente",{}]]],
  [[["No reconoce a un alumno",{bold:true}]],[["Muestras de baja calidad",{}]],[["Volver a enrolar; las muestras nuevas se suman a las anteriores",{}]]],
  [[["Identifica a la persona equivocada",{bold:true}]],[["El mismo dedo físico fue enrolado para dos alumnos",{}]],[["Revocar y enrolar con dedos distintos",{}]]],
],[2400,3200,3760]));
k.push(SEP());
k.push(H2("12.1  Prefijos de los mensajes de diagnóstico"));
k.push(TABLA(["Prefijo","Módulo"],[
  [[["ALIMETRIK",{font:"Courier New",bold:true}]],[["Arranque general del sistema",{}]]],
  [[["ALMACEN",{font:"Courier New",bold:true}]],[["Memoria permanente: montaje, escrituras y tiempos",{}]]],
  [[["MOD_EST / MOD_BIO / MOD_REG / MOD_USR",{font:"Courier New",bold:true}]],[["Modelos de datos",{}]]],
  [[["AUTH",{font:"Courier New",bold:true}]],[["Inicios de sesión, intentos fallidos y caducidades",{}]]],
  [[["WEB",{font:"Courier New",bold:true}]],[["Servidor, rutas y autopruebas",{}]]],
  [[["RED",{font:"Courier New",bold:true}]],[["WiFi, DNS y reloj",{}]]],
  [[["URU4500",{font:"Courier New",bold:true}]],[["Lector de huellas y procesamiento biométrico",{}]]],
],[3400,5960]));

// 13
k.push(H1("13","Anexo: cableado y conexiones"));
k.push(TABLA(["Conexión","Detalle"],[
  [[["Lector 4500",{bold:true}]],[["Puerto USB-OTG nativo de la placa. Entrega 5 V y hasta 200 mA. No usar concentradores (hubs) sin alimentación propia.",{}]]],
  [[["Cable de programación",{bold:true}]],[["Puerto serie CH340 (GPIO 37 y 38 internos). Velocidad de consola: 115200 baudios.",{}]]],
  [[["Alimentación",{bold:true}]],[["USB-C, 5 V / 2 A recomendados. Una fuente insuficiente provoca reinicios al capturar.",{}]]],
  [[["Radio WiFi",{bold:true}]],[["Chip ESP32-C6 en la propia placa, enlazado por SDIO (4 bits, 40 MHz). No requiere cableado externo.",{}]]],
],[2100,7260]));
k.push(SEP());
k.push(H2("13.1  Mapa de la memoria flash (16 MB)"));
k.push(...CODE("partitions.csv",[
  "# Nombre     Tipo   Subtipo   Dirección   Tamaño",
  "nvs          data   nvs       0x9000      24 KB     Configuración del sistema",
  "phy_init     data   phy       0xf000      4 KB      Calibración del radio",
  "factory      app    factory   0x10000     3 MB      Programa (firmware)",
  "almacen      data   fat       0x310000    8 MB      Base de datos"].join("\n")));
k.push(SEP());
k.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{before:340},
  children:[new D.TextRun({text:"Para el uso cotidiano del sistema, consulte el Manual de Usuario.",
    font:"Calibri",size:PT_(11),italics:true,color:MUTED})]}));

D.Packer.toBuffer(H.documento(k,"ALIMETRIK — Manual Técnico")).then(b=>{
  fs.writeFileSync("/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/manuales/MANUAL-TECNICO.docx", b);
  console.log("Manual técnico generado");
});
