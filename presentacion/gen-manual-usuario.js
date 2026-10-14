const fs = require("fs"), path = require("path");
const H = require("./comun-doc.js");
const {D,H1,H2,BODY,BUL,NUM,CODE,CALLOUT,TABLA,SEP,MINTBG,AMBERBG,AMBER,CORAL,MINT,NAVY,MUTED} = H;
const k = [];

H.portada(k, fs, "MANUAL DE USUARIO",
  "Guía para el personal encargado del comedor escolar",
  "Registro de alumnos · Enrolamiento de huellas · Operación diaria · Métricas");

// ÍNDICE
k.push(H1("", "Contenido"));
[["1","Qué hace el sistema"],["2","Antes de empezar: conectarse al sistema"],
 ["3","Iniciar sesión"],["4","Conocer la pantalla principal"],
 ["5","Registrar un alumno nuevo (y su autorización)"],["6","Enrolar la huella del alumno"],
 ["7","La operación diaria en el comedor"],["8","Consultar las métricas"],
 ["9","Consultar y revisar los registros"],["10","Derechos del titular: revocar y suprimir datos"],
 ["11","Administrar usuarios y contraseñas"],["12","Preguntas frecuentes y problemas"],
 ["13","Buenas prácticas y responsabilidades legales"]
].forEach(([n,t])=>k.push(new D.Paragraph({spacing:{after:90},children:[
  new D.TextRun({text:n.padStart(2," ")+"   ",font:"Courier New",size:PT_(11),bold:true,color:MINT}),
  new D.TextRun({text:t,font:"Calibri",size:PT_(11.5),color:NAVY})]})));
function PT_(n){return n*2;}

// 1
k.push(H1("1","Qué hace el sistema"));
k.push(BODY([["ALIMETRIK controla la entrega de raciones del comedor escolar usando la ",{}],
  ["huella dactilar",{bold:true,color:MINT}],
  [" del estudiante. Cuando el alumno pone el dedo en el lector, el sistema lo reconoce, verifica si le corresponde el servicio de ese momento y muestra en pantalla si se le entrega o no la ración.",{}]]));
k.push(BODY("Con esto se evitan tres problemas: los carnés perdidos o prestados, las filas lentas con listas en papel, y que una misma persona reciba dos raciones del mismo servicio."));
k.push(H2("Lo que verá en pantalla al pasar un dedo"));
k.push(TABLA(["Color","Mensaje","Qué significa","Qué hacer"],[
  [[["🟢 Verde",{bold:true,color:"1E8E5A"}]],[["ALMUERZO ENTREGADO ✓",{bold:true}]],[["El alumno está registrado y no ha recibido este servicio hoy",{}]],[["Entregar la ración",{bold:true}]]],
  [[["🟡 Ámbar",{bold:true,color:AMBER}]],[["YA RECIBIÓ SU ALMUERZO HOY",{bold:true}]],[["Es un intento de repetir el mismo servicio",{}]],[["No entregar",{bold:true}]]],
  [[["🔴 Rojo",{bold:true,color:CORAL}]],[["NO AUTORIZADO",{bold:true}]],[["El alumno está inactivo o revocó su autorización",{}]],[["Consultar con coordinación",{}]]],
  [[["⚪ Gris",{bold:true}]],[["HUELLA NO RECONOCIDA",{bold:true}]],[["El dedo no está registrado o quedó mal puesto",{}]],[["Pedir que repita; si sigue, revisar el registro",{}]]],
],[1250,2500,3300,2310]));
k.push(SEP());
k.push(CALLOUT("El sonido le evita mirar la pantalla",[["Dos pitidos agudos ascendentes = ",{}],["ración autorizada",{bold:true,color:"1E8E5A"}],[". Dos tonos graves = ",{}],["rechazada",{bold:true,color:CORAL}],[". Así la fila avanza sin que usted tenga que estar pendiente del celular.",{}]]));

// 2
k.push(H1("2","Antes de empezar: conectarse al sistema"));
k.push(BODY("El equipo crea su propia red WiFi. No necesita internet ni instalar ninguna aplicación: basta un celular, una tableta o un computador con navegador."));
k.push(...NUM([
  [["Encienda el equipo",{bold:true}],[" y verifique que el lector de huellas esté conectado (su luz roja debe estar encendida).",{}]],
  [["Abra los ajustes de WiFi",{bold:true}],[" de su celular y conéctese a la red llamada ",{}],["ALIMETRIK",{bold:true,font:"Courier New"}],[".",{}]],
  [["Ignore el aviso",{bold:true}],[" de «esta red no tiene internet»: es normal, la red es solo para el comedor.",{}]],
  [["Abra el navegador",{bold:true}],[" (Chrome o Safari) y escriba la dirección ",{}],["192.168.4.1",{bold:true,font:"Courier New"}],[" .",{}]],
]));
k.push(CALLOUT("Consejo: use el navegador normal",[["Al conectarse, el celular puede abrir una ventanita automática. Esa ventana es limitada y algunos botones no responden bien. ",{}],["Ciérrela y abra 192.168.4.1 en Chrome o Safari",{bold:true}],[", donde todo funciona correctamente. Puede guardar la dirección en favoritos.",{}]],AMBERBG,AMBER));

// 3
k.push(H1("3","Iniciar sesión"));
k.push(BODY("El sistema pide usuario y contraseña porque maneja datos personales sensibles: solo el personal autorizado puede entrar."));
k.push(TABLA(["Usuario de fábrica","Contraseña","Rol"],[
  [[["admin",{bold:true,font:"Courier New"}]],[["admin123",{bold:true,font:"Courier New"}]],[["Administrador (acceso total)",{}]]],
],[2600,2600,4160]));
k.push(SEP());
k.push(CALLOUT("⚠️ Primera tarea obligatoria: cambiar la contraseña",[["La clave de fábrica es pública y aparece en este manual. Apenas ingrese por primera vez, vaya a ",{}],["Configuración → Mi cuenta",{bold:true}],[" y cámbiela. Mientras no lo haga, la pantalla de acceso mostrará una advertencia.",{}]],AMBERBG,AMBER));
k.push(SEP());
k.push(H2("Los dos tipos de usuario"));
k.push(TABLA(["Rol","Puede hacer","No puede"],[
  [[["Operador",{bold:true}]],[["Atender el comedor (pestaña Comedor), ver métricas y registros",{}]],[["Registrar alumnos, enrolar huellas, crear usuarios",{}]]],
  [[["Administrador",{bold:true}]],[["Todo lo anterior, más registrar alumnos, enrolar huellas, revocar autorizaciones y administrar usuarios",{}]],[["—",{}]]],
],[1900,4600,2860]));
k.push(SEP());
k.push(BODY([["La sesión se cierra sola tras ",{}],["8 horas sin uso",{bold:true}],[". Para salir antes, pulse ",{}],["Salir",{bold:true}],[" en la esquina superior derecha.",{}]]));

// 4
k.push(H1("4","Conocer la pantalla principal"));
k.push(BODY("Arriba encontrará siempre la barra del lector, que le dice en tiempo real qué está pasando con el huellero, y el reloj con el servicio activo. Debajo están las pestañas:"));
k.push(TABLA(["Pestaña","Para qué sirve","Quién la ve"],[
  [[["Comedor",{bold:true}]],[["La pantalla de trabajo diario: muestra en grande a quién corresponde cada huella y si se entrega la ración",{}]],[["Todos",{}]]],
  [[["Métricas",{bold:true}]],[["Cuántas raciones se entregaron hoy, duplicados bloqueados y cobertura del programa",{}]],[["Todos",{}]]],
  [[["Alumnos",{bold:true}]],[["Lista de estudiantes, sus huellas, enrolar, revocar o dar de baja",{}]],[["Todos (acciones: admin)",{}]]],
  [[["Registros",{bold:true}]],[["Historial de los últimos movimientos con hora y resultado",{}]],[["Todos",{}]]],
  [[["+ Nuevo",{bold:true}]],[["Formulario para registrar un alumno con su autorización",{}]],[["Administrador",{}]]],
  [[["Configuración",{bold:true}]],[["Cambiar su contraseña, administrar usuarios y ver el estado del equipo",{}]],[["Administrador",{}]]],
],[1750,5100,2510]));
k.push(SEP());
k.push(H2("La barra del lector (arriba del todo)"));
k.push(BODY("Es la que le indica qué hacer en cada momento. Estos son sus mensajes:"));
k.push(...BUL([
  [["«Listo. Pon el dedo en el lector»",{bold:true}],[" — el sistema espera a la siguiente persona.",{}]],
  [["«Dedo detectado, capturando…»",{bold:true}],[" — no mueva el dedo, dura menos de un segundo.",{}]],
  [["«HUELLA LEÍDA. Retira el dedo»",{bold:true}],[" — ya puede levantar el dedo; el resultado sale en unos segundos.",{}]],
  [["«Imagen incompleta…»",{bold:true}],[" — el dedo quedó mal puesto: repita cubriendo toda la ventanita.",{}]],
  [["«LECTOR NO DETECTADO»",{bold:true,color:CORAL}],[" — revise el cable USB del huellero.",{}]],
]));

// 5
k.push(H1("5","Registrar un alumno nuevo (y su autorización)"));
k.push(CALLOUT("Antes de registrar: la autorización es obligatoria",[["La huella es un ",{}],["dato personal sensible",{bold:true}],[". La ley colombiana (Ley 1581 de 2012) exige la autorización ",{}],["previa, expresa e informada",{bold:true}],[" del titular o, si es menor de edad, de su padre, madre o representante legal. Sin esa autorización el sistema ",{}],["no permite",{bold:true}],[" registrar al alumno ni tomar su huella.",{}]]));
k.push(SEP());
k.push(H2("Paso a paso"));
k.push(...NUM([
  [["Entre a la pestaña ",{}],["+ Nuevo",{bold:true}],[".",{}]],
  [["Complete los datos del alumno: documento, nombre, apellido y grado.",{}]],
  [["Escriba el ",{}],["nombre y documento del acudiente",{bold:true}],[" o representante legal que autoriza. Si el alumno es mayor de edad, puede ser él mismo.",{}]],
  [["Lea con el acudiente la ",{}],["Política de Tratamiento de Datos",{bold:true}],[" (el enlace azul abre el documento completo) y explique para qué se usará la huella.",{}]],
  [["Marque la casilla de autorización ",{}],["solo si el acudiente aceptó",{bold:true}],[".",{}]],
  [["Pulse ",{}],["Guardar alumno",{bold:true}],[". Verá el mensaje «✅ [nombre] guardado» y el alumno aparecerá en la lista.",{}]],
]));
k.push(CALLOUT("Guarde también la constancia en papel",[["La institución debe poder ",{}],["demostrar",{bold:true}],[" que obtuvo la autorización. Se recomienda que el acudiente firme un formato físico o digital y que este se archive junto con la matrícula. El sistema guarda quién autorizó y en qué fecha, pero la constancia firmada es responsabilidad de la institución.",{}]],AMBERBG,AMBER));
k.push(SEP());
k.push(H2("Si el acudiente no autoriza"));
k.push(BODY([["Es su derecho: autorizar es ",{}],["voluntario",{bold:true}],[". En ese caso, ",{}],["no registre al alumno en el sistema",{bold:true}],[" y utilice el método alternativo que defina la institución (lista o carné). ",{}],["El estudiante conserva íntegro su derecho a recibir la alimentación escolar.",{bold:true}]]));

// 6
k.push(H1("6","Enrolar la huella del alumno"));
k.push(BODY("Enrolar es guardar la huella del alumno para que el sistema pueda reconocerlo después. Se toman tres muestras del mismo dedo para que el reconocimiento sea confiable."));
k.push(...NUM([
  [["Vaya a la pestaña ",{}],["Alumnos",{bold:true}],[" y busque al estudiante.",{}]],
  [["Pulse el botón ",{}],["＋ huella",{bold:true}],[". Abajo aparecerá una barra verde indicando a quién se está enrolando.",{}]],
  [["Pida al alumno que ponga el dedo ",{}],["plano y firme, cubriendo toda la ventanita",{bold:true}],[" del lector.",{}]],
  [["Cuando la barra diga ",{}],["«HUELLA LEÍDA. Retira el dedo»",{bold:true}],[", el alumno levanta el dedo.",{}]],
  [["Apenas indique ",{}],["«Pon el MISMO dedo OTRA VEZ»",{bold:true}],[", repita. Son tres veces en total.",{}]],
  [["Al terminar verá ",{}],["«Huella enrolada»",{bold:true}],[" y el contador de huellas del alumno subirá a 3.",{}]],
]));
k.push(CALLOUT("Recomendaciones para un buen enrolamiento",[["Use ",{}],["siempre el mismo dedo",{bold:true}],[" (se recomienda el índice derecho) y anótelo. El dedo debe estar limpio y seco. No lo mueva ni lo levante antes del aviso. Si el sistema dice «huella pobre», simplemente repita: es preferible una muestra buena a tres regulares.",{}]]));
k.push(SEP());
k.push(BODY([["El proceso completo toma unos ",{}],["13 segundos",{bold:true}],[". Si nadie pone el dedo en 90 segundos, el enrolamiento se cancela solo y puede volver a iniciarlo.",{}]]));

// 7
k.push(H1("7","La operación diaria en el comedor"));
k.push(BODY("Esta es la rutina de un día normal, y es muy simple:"));
k.push(...NUM([
  [["Encienda el equipo y verifique la luz roja del lector.",{}]],
  [["Conecte el celular o la tableta a la red ",{}],["ALIMETRIK",{bold:true,font:"Courier New"}],[" y abra ",{}],["192.168.4.1",{font:"Courier New"}],[".",{}]],
  [["Inicie sesión y quédese en la pestaña ",{}],["Comedor",{bold:true}],[". Toque una vez la pantalla para habilitar el sonido.",{}]],
  [["Verifique arriba que el servicio mostrado sea el correcto (Desayuno, Almuerzo o Refrigerio).",{}]],
  [["Cada estudiante pone su dedo. Usted solo observa el color y entrega o no la ración.",{}]],
]));
k.push(SEP());
k.push(H2("Horarios de los servicios"));
k.push(BODY("El sistema determina el servicio según la hora del equipo:"));
k.push(TABLA(["Servicio","Horario"],[
  [[["Desayuno",{bold:true}]],[["6:00 a.m. – 10:00 a.m.",{}]]],
  [[["Almuerzo",{bold:true}]],[["11:00 a.m. – 2:30 p.m.",{}]]],
  [[["Refrigerio",{bold:true}]],[["2:30 p.m. – 5:00 p.m.",{}]]],
  [[["Fuera de horario",{bold:true,color:MUTED}]],[["En los demás momentos: el sistema registra el paso pero no lo cuenta como servicio",{}]]],
],[2600,6760]));
k.push(SEP());
k.push(CALLOUT("La hora se ajusta sola",[["El equipo no tiene reloj con pila, así que toma la hora del primer celular que abre la página. Por eso conviene ",{}],["abrir el portal apenas se enciende el equipo",{bold:true}],[". Si en la barra superior aparece «sin hora», simplemente recargue la página. Si sus horarios de servicio son distintos, pueden ajustarse en el firmware (ver Manual Técnico).",{}]],AMBERBG,AMBER));

// 8
k.push(H1("8","Consultar las métricas"));
k.push(BODY("La pestaña Métricas responde, en cualquier momento, cuántas raciones se han entregado y a cuántos alumnos se ha cubierto."));
k.push(...BUL([
  [["Hoy",{bold:true}],[": desayunos, almuerzos y refrigerios entregados en el día, además de los duplicados bloqueados y las huellas no reconocidas.",{}]],
  [["Barra de cobertura",{bold:true}],[": qué porcentaje de los alumnos registrados ya pasó por el servicio actual.",{}]],
  [["Totales históricos",{bold:true}],[": acumulado desde que el sistema está en funcionamiento.",{}]],
  [["Servicios",{bold:true}],[": comparativo entre desayuno, almuerzo y refrigerio.",{}]],
]));
k.push(CALLOUT("Para qué le sirven",[["Los ",{}],["duplicados bloqueados",{bold:true}],[" muestran cuántas raciones se habrían entregado de más sin el sistema. La ",{}],["cobertura",{bold:true}],[" ayuda a detectar alumnos que no están asistiendo al comedor y a sustentar informes ante la institución o los entes de control del programa de alimentación.",{}]]));

// 9
k.push(H1("9","Consultar y revisar los registros"));
k.push(BODY("La pestaña Registros muestra los últimos 60 movimientos con su hora, el alumno, el servicio y el resultado. Sirve para aclarar reclamos («yo no pasé», «no me lo entregaron») con evidencia."));
k.push(TABLA(["Resultado","Significado"],[
  [[["permitido",{bold:true,color:"1E8E5A"}]],[["Se autorizó la entrega de la ración",{}]]],
  [[["duplicado",{bold:true,color:AMBER}]],[["Intento de recibir dos veces el mismo servicio en el día",{}]]],
  [[["no_autorizado",{bold:true,color:CORAL}]],[["El alumno está inactivo o revocó su autorización",{}]]],
  [[["desconocido",{bold:true,color:MUTED}]],[["La huella no coincide con ningún alumno registrado",{}]]],
],[2400,6960]));
k.push(SEP());
k.push(BODY([["El equipo conserva los ",{}],["2.000 registros más recientes",{bold:true}],[". Al llegar a ese número, cada registro nuevo desplaza al más antiguo. Si necesita conservar históricos largos, exporte periódicamente la información (ver Manual Técnico, respaldo).",{}]]));

// 10
k.push(H1("10","Derechos del titular: revocar y suprimir datos"));
k.push(BODY([["La Ley 1581 de 2012 (artículo 8) otorga a toda persona el derecho a ",{}],["conocer, actualizar, rectificar y suprimir",{bold:true}],[" sus datos, y a ",{}],["revocar la autorización",{bold:true}],[" en cualquier momento. El sistema incluye esa función y el personal debe atenderla.",{}]]));
k.push(H2("Cómo revocar una autorización"));
k.push(...NUM([
  [["Vaya a ",{}],["Alumnos",{bold:true}],[" y localice al estudiante.",{}]],
  [["Pulse ",{}],["revocar",{bold:true}],[" y confirme.",{}]],
  [["El sistema ",{}],["borra de inmediato todas sus huellas",{bold:true}],[" y lo marca como «sin autorización». El alumno deja de poder usar el lector.",{}]],
]));
k.push(CALLOUT("Importante: revocar no es dar de baja",[["Al ",{}],["revocar",{bold:true}],[" se eliminan los datos biométricos pero se conserva la ficha del alumno y su historial de entregas. Si desea eliminar completamente al estudiante del sistema, use ",{}],["borrar",{bold:true}],[" (toque dos veces para confirmar). En ambos casos la eliminación de las huellas es definitiva.",{}]]));
k.push(SEP());
k.push(BODY("Plazos legales de respuesta a las solicitudes: consultas, 10 días hábiles; reclamos, 15 días hábiles. Deje siempre constancia escrita de la solicitud y de la acción realizada."));

// 11
k.push(H1("11","Administrar usuarios y contraseñas"));
k.push(H2("Cambiar su propia contraseña"));
k.push(...NUM([
  [["Vaya a ",{}],["Configuración → Mi cuenta",{bold:true}],[".",{}]],
  [["Escriba su contraseña actual y la nueva (mínimo 6 caracteres).",{}]],
  [["Pulse ",{}],["Cambiar mi contraseña",{bold:true}],[".",{}]],
]));
k.push(H2("Crear un usuario para otro encargado"));
k.push(BODY([["En ",{}],["Configuración → Crear usuario",{bold:true}],[" defina el nombre de acceso, el nombre completo, una contraseña y el rol. Asigne ",{}],["Operador",{bold:true}],[" al personal que solo atiende la fila del comedor, y reserve ",{}],["Administrador",{bold:true}],[" para quien registra alumnos y maneja los datos.",{}]]));
k.push(CALLOUT("Reglas de seguridad recomendadas",[["Cada encargado debe tener ",{}],["su propio usuario",{bold:true}],[" (nunca compartir uno): así los registros del sistema reflejan quién hizo cada cosa. No anote las contraseñas en lugares visibles. Al retirarse un empleado, borre su usuario ese mismo día. El sistema impide borrar al último administrador, para que nadie quede fuera.",{}]]));

// 12
k.push(H1("12","Preguntas frecuentes y problemas"));
k.push(TABLA(["Situación","Qué hacer"],[
  [[["No aparece la red ALIMETRIK",{bold:true}]],[["Verifique que el equipo esté encendido. Espere 30 segundos tras encenderlo. Acérquese: el alcance es de unos 15 metros.",{}]]],
  [[["La página no carga",{bold:true}]],[["Confirme estar conectado a la red ALIMETRIK y escriba la dirección completa: 192.168.4.1. Cierre la ventanita automática y use Chrome o Safari.",{}]]],
  [[["Dice «LECTOR NO DETECTADO»",{bold:true}]],[["El cable USB del huellero está suelto. Empújelo firme en el puerto de la placa. La luz roja del lector debe encenderse.",{}]]],
  [[["El lector no reconoce a un alumno",{bold:true}]],[["Pida que ponga el dedo plano, firme y cubriendo toda la ventanita. Si falla varias veces, vuelva a enrolarlo (use ＋ huella otra vez: las muestras se suman).",{}]]],
  [[["Dice el nombre de otro alumno",{bold:true}]],[["Normalmente ocurre cuando el mismo dedo físico se enroló para dos personas distintas durante las pruebas. Revoque y enrole de nuevo con dedos distintos.",{}]]],
  [[["Aparece «sin hora»",{bold:true}]],[["Recargue la página: el celular le entrega la hora automáticamente al equipo.",{}]]],
  [[["Olvidé mi contraseña",{bold:true}]],[["Pida a otro administrador que borre su usuario y lo cree de nuevo. Si nadie puede entrar, se requiere asistencia técnica (ver Manual Técnico).",{}]]],
  [[["Dice «Memoria llena»",{bold:true}]],[["Muy improbable (capacidad: 1.000 alumnos). Contacte al responsable técnico.",{}]]],
  [[["Se fue la luz",{bold:true}]],[["No se pierde nada: todos los datos quedan guardados en el equipo. Al encender, continúa donde estaba.",{}]]],
],[2700,6660]));

// 13
k.push(H1("13","Buenas prácticas y responsabilidades legales"));
k.push(BODY([["El manejo de huellas dactilares implica responsabilidades legales para la institución, que actúa como ",{}],["Responsable del Tratamiento",{bold:true}],[" ante la Superintendencia de Industria y Comercio.",{}]]));
k.push(...BUL([
  [["Nunca exija la huella como única opción.",{bold:true}],[" Debe existir siempre una alternativa para quien no autorice.",{}]],
  [["Use los datos solo para el comedor.",{bold:true}],[" No para control disciplinario, asistencia académica ni ningún otro fin.",{}]],
  [["Conserve las autorizaciones firmadas",{bold:true}],[" junto con los documentos de matrícula.",{}]],
  [["Atienda las solicitudes de los titulares",{bold:true}],[" dentro de los plazos de ley y déjelas por escrito.",{}]],
  [["Suprima los datos de quien se retire",{bold:true}],[" de la institución o del programa.",{}]],
  [["Cuide el acceso físico al equipo",{bold:true}],[" y mantenga contraseñas individuales y actualizadas.",{}]],
  [["Haga respaldos periódicos",{bold:true}],[" según el procedimiento del Manual Técnico.",{}]],
]));
k.push(CALLOUT("La ventaja de este diseño",[["Los datos ",{}],["nunca salen del equipo",{bold:true}],[": no hay nube, ni internet, ni terceros involucrados. Además no se guarda la imagen de la huella, solo un conjunto de coordenadas del que ",{}],["no se puede reconstruir el dedo",{bold:true}],[". Esto reduce enormemente el riesgo frente a soluciones que envían biometría a servidores externos.",{}]]));
k.push(SEP());
k.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{before:340},
  children:[new D.TextRun({text:"Ante cualquier duda técnica, consulte el Manual Técnico de Instalación.",
    font:"Calibri",size:PT_(11),italics:true,color:MUTED})]}));

D.Packer.toBuffer(H.documento(k,"ALIMETRIK — Manual de Usuario")).then(b=>{
  fs.writeFileSync("/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/manuales/MANUAL-DE-USUARIO.docx", b);
  console.log("Manual de usuario generado");
});
