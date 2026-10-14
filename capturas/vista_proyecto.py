#!/usr/bin/env python3
"""Vista general del proyecto: todos los archivos con sus líneas."""
import os, html
BASE="/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/codigo"
GRUPOS=[("MODELO — datos y reglas de negocio","main/modelos",["almacenamiento.c","almacenamiento.h",
   "modelo_estudiante.c","modelo_estudiante.h","modelo_biometrico.c","modelo_biometrico.h",
   "modelo_registro.c","modelo_registro.h","modelo_usuario.c","modelo_usuario.h",
   "modelo_servicio.c","modelo_servicio.h"],"#4ec9b0"),
  ("VISTA — presentación al usuario","main/vistas",["vista_sistema.html","vista_login.html",
   "vista_terminos.html","vista_json.c","vista_json.h"],"#dcdcaa"),
  ("CONTROLADOR — coordinación","main/controladores",["controlador_web.c","controlador_web.h",
   "controlador_auth.c","controlador_auth.h","controlador_red.c","controlador_red.h",
   "controlador_lector.c","controlador_lector.h"],"#569cd6"),
  ("PUNTO DE ENTRADA Y CONFIGURACIÓN","main",["main.c","CMakeLists.txt"],"#c586c0"),
  ("CONFIGURACIÓN DEL PROYECTO",".",["CMakeLists.txt","partitions.csv","sdkconfig.defaults"],"#ce9178"),
]
def lineas(p):
    try: return len(open(p,encoding="utf-8",errors="replace").read().split("\n"))
    except: return 0
filas=[];total=0;narch=0
for titulo,carpeta,archivos,color in GRUPOS:
    filas.append(f'<tr><td colspan="3" class="g" style="color:{color}">{html.escape(titulo)}</td></tr>')
    for a in archivos:
        ruta=os.path.join(BASE,carpeta,a)
        if not os.path.exists(ruta): continue
        n=lineas(ruta); total+=n; narch+=1
        rel=os.path.join(carpeta,a).replace("./","")
        filas.append(f'<tr><td class="f">{html.escape(rel)}</td><td class="n">{n}</td>'
                     f'<td class="b"><div style="width:{min(int(n/9),330)}px;background:{color}"></div></td></tr>')
nbis=0
lfs=os.path.join(BASE,"componentes/reconocimiento/lfs")
if os.path.isdir(lfs):
    for f in os.listdir(lfs):
        if f.endswith(".c"): nbis+=lineas(os.path.join(lfs,f)); narch+=1
w=os.path.join(BASE,"componentes/reconocimiento/nbis_wrap.c")
if os.path.exists(w): nbis+=lineas(w); narch+=1
filas.append('<tr><td colspan="3" class="g" style="color:#f6c453">MOTOR BIOMÉTRICO — extracción de minucias (NIST) + comparador propio</td></tr>')
filas.append(f'<tr><td class="f">componentes/reconocimiento/ (28 archivos)</td><td class="n">{nbis}</td>'
             f'<td class="b"><div style="width:330px;background:#f6c453"></div></td></tr>')
print(f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0}}
body{{background:#1e1e1e;color:#d4d4d4;font-family:-apple-system,Segoe UI,sans-serif;padding:26px 34px}}
h1{{font-size:23px;color:#fff;margin-bottom:4px}} .sub{{color:#9d9d9d;font-size:13px;margin-bottom:22px}}
table{{border-collapse:collapse;width:100%;font-size:13px}}
td{{padding:4.5px 10px;border-bottom:1px solid #2c2c2c}}
.g{{padding-top:16px;font-weight:700;font-size:12px;letter-spacing:1.1px;border-bottom:1px solid #3a3a3a}}
.f{{font-family:"SF Mono",Menlo,monospace;color:#d4d4d4}}
.n{{text-align:right;color:#858585;width:80px;font-family:"SF Mono",Menlo,monospace}}
.b div{{height:9px;border-radius:4px;opacity:.85}} .b{{width:350px}}
.tot{{margin-top:24px;background:#252526;border:1px solid #3a3a3a;border-radius:8px;padding:16px 20px;
 display:flex;gap:46px;font-size:13.5px}} .tot b{{color:#20c997;font-size:20px;display:block}}
</style></head><body>
<h1>ALIMETRIK · Código fuente del proyecto</h1>
<div class="sub">Arquitectura Modelo–Vista–Controlador · ESP32-P4 + DigitalPersona U.are.U 4500 · lenguaje C y HTML</div>
<table>{''.join(filas)}</table>
<div class="tot"><div><b>{narch}</b>archivos de código</div>
<div><b>{total:,}</b>líneas propias</div>
<div><b>{nbis:,}</b>líneas del motor biométrico</div>
<div><b>{total+nbis:,}</b>líneas en total</div></div>
</body></html>""")
