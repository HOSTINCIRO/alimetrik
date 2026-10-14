#!/usr/bin/env python3
"""Genera páginas HTML con el código real resaltado, en un visor tipo editor,
para tomar las capturas del proyecto."""
import html, os, sys, json

BASE = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/ALIMETRIK-entrega/codigo"

PAL = {"bg":"#1e1e1e","panel":"#252526","barra":"#333333","txt":"#d4d4d4","num":"#858585",
       "com":"#6A9955","str":"#ce9178","kw":"#569cd6","tipo":"#4ec9b0","fn":"#dcdcaa",
       "num2":"#b5cea8","pre":"#c586c0","sel":"#094771","acc":"#20c997"}

KW = set("""if else for while do switch case break continue return goto sizeof typedef struct enum union
static const volatile extern inline void char int long short float double unsigned signed bool
true false NULL define include ifdef ifndef endif pragma function var let async await new class""".split())
TIPOS = set("""uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t size_t bool esp_err_t
estudiante_t huella_t registro_t usuario_t servicio_t fp_template_t identificacion_t httpd_req_t
sesion_t FILE""".split())

def resalta(linea, lenguaje):
    import re
    out, i, n = [], 0, len(linea)
    if lenguaje in ("c","h"):
        s = linea
        # comentarios
        for pat, cls in ((r'//.*$',"com"), (r'/\*.*?\*/',"com"), (r'/\*.*$',"com")):
            m = re.search(pat, s)
            if m:
                pre = s[:m.start()]
                return resalta_tokens(pre, lenguaje) + f'<span class="com">{html.escape(m.group())}</span>'
        return resalta_tokens(s, lenguaje)
    return resalta_tokens(linea, lenguaje)

def resalta_tokens(s, lenguaje):
    import re
    res, pos = [], 0
    patron = re.compile(r'("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'|#\w+|\b\d+\b|\b\w+\b)')
    for m in patron.finditer(s):
        res.append(html.escape(s[pos:m.start()]))
        t = m.group()
        if t.startswith('"') or t.startswith("'"): cls = "str"
        elif t.startswith("#"): cls = "pre"
        elif t.isdigit(): cls = "num2"
        elif t in KW: cls = "kw"
        elif t in TIPOS: cls = "tipo"
        elif m.end() < len(s) and s[m.end()] == "(": cls = "fn"
        else: cls = None
        res.append(f'<span class="{cls}">{html.escape(t)}</span>' if cls else html.escape(t))
        pos = m.end()
    res.append(html.escape(s[pos:]))
    return "".join(res)

def arbol_html(activo):
    items = [
      ("📁","codigo","",0),
      ("📁","main","",1),
      ("📄","main.c","main.c",2),
      ("📁","modelos","",2),
      ("📄","almacenamiento.c","modelos/almacenamiento.c",3),
      ("📄","modelo_estudiante.c","modelos/modelo_estudiante.c",3),
      ("📄","modelo_biometrico.c","modelos/modelo_biometrico.c",3),
      ("📄","modelo_registro.c","modelos/modelo_registro.c",3),
      ("📄","modelo_usuario.c","modelos/modelo_usuario.c",3),
      ("📄","modelo_servicio.c","modelos/modelo_servicio.c",3),
      ("📁","vistas","",2),
      ("📄","vista_sistema.html","vistas/vista_sistema.html",3),
      ("📄","vista_login.html","vistas/vista_login.html",3),
      ("📄","vista_terminos.html","vistas/vista_terminos.html",3),
      ("📄","vista_json.c","vistas/vista_json.c",3),
      ("📁","controladores","",2),
      ("📄","controlador_web.c","controladores/controlador_web.c",3),
      ("📄","controlador_auth.c","controladores/controlador_auth.c",3),
      ("📄","controlador_red.c","controladores/controlador_red.c",3),
      ("📄","controlador_lector.c","controladores/controlador_lector.c",3),
      ("📁","componentes","",1),
      ("📄","nbis_wrap.c","componentes/reconocimiento/nbis_wrap.c",2),
      ("📄","partitions.csv","partitions.csv",1),
      ("📄","sdkconfig.defaults","sdkconfig.defaults",1),
    ]
    h = []
    for ico, nom, ruta, ind in items:
        act = ' style="background:%s"' % PAL["sel"] if ruta == activo else ""
        col = PAL["acc"] if ruta == activo else PAL["txt"]
        h.append(f'<div class="it"{act}><span style="padding-left:{ind*14}px;color:{col}">{ico} {html.escape(nom)}</span></div>')
    return "".join(h)

def pagina(rel, desde=1, hasta=60):
    ruta = os.path.join(BASE, rel)
    lineas = open(ruta, encoding="utf-8", errors="replace").read().split("\n")
    ext = rel.rsplit(".",1)[-1]
    trozo = lineas[desde-1:hasta]
    filas = []
    for k, ln in enumerate(trozo, start=desde):
        filas.append(f'<tr><td class="ln">{k}</td><td class="cd">{resalta(ln, ext) or "&nbsp;"}</td></tr>')
    total = len(lineas)
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{{box-sizing:border-box;margin:0}} body{{background:{PAL['bg']};color:{PAL['txt']};
      font-family:-apple-system,Segoe UI,sans-serif;display:flex;flex-direction:column;height:100vh}}
    .top{{background:{PAL['barra']};padding:7px 14px;font-size:12.5px;display:flex;gap:14px;align-items:center}}
    .top .t{{color:#cccccc}} .top .p{{color:#9d9d9d;font-size:11.5px}}
    .tabs{{background:{PAL['panel']};display:flex;font-size:12.5px}}
    .tab{{padding:8px 16px;background:{PAL['bg']};color:#ffffff;border-top:1px solid {PAL['acc']}}}
    .body{{display:flex;flex:1;overflow:hidden}}
    .side{{width:290px;background:{PAL['panel']};padding:8px 0;font-size:12.5px;overflow:hidden;flex:0 0 290px}}
    .side .cab{{padding:6px 14px 10px;color:#bbbbbb;font-size:11px;letter-spacing:1px}}
    .it{{padding:2.5px 10px;white-space:nowrap;overflow:hidden}}
    .main{{flex:1;overflow:hidden;padding:8px 0 0 6px}}
    table{{border-collapse:collapse;font-family:"SF Mono",Menlo,Consolas,monospace;font-size:12.5px;line-height:1.55}}
    .ln{{color:{PAL['num']};text-align:right;padding-right:16px;user-select:none;vertical-align:top;width:48px}}
    .cd{{white-space:pre;vertical-align:top}}
    .com{{color:{PAL['com']}}} .str{{color:{PAL['str']}}} .kw{{color:{PAL['kw']}}}
    .tipo{{color:{PAL['tipo']}}} .fn{{color:{PAL['fn']}}} .num2{{color:{PAL['num2']}}} .pre{{color:{PAL['pre']}}}
    .st{{background:#0a7aca;color:#fff;font-size:11.5px;padding:4px 14px;display:flex;gap:18px}}
    </style></head><body>
    <div class="top"><span class="t">ALIMETRIK — Sistema de comedor escolar</span>
      <span class="p">{html.escape(rel)}  ·  {total} líneas</span></div>
    <div class="tabs"><div class="tab">{html.escape(os.path.basename(rel))}</div></div>
    <div class="body">
      <div class="side"><div class="cab">EXPLORADOR — ALIMETRIK</div>{arbol_html(rel)}</div>
      <div class="main"><table>{''.join(filas)}</table></div>
    </div>
    <div class="st"><span>ALIMETRIK 2.0 (MVC)</span><span>Líneas {desde}–{min(hasta,total)} de {total}</span>
      <span>Lenguaje: {'C' if ext in ('c','h') else 'HTML'}</span><span>UTF-8</span></div>
    </body></html>"""

if __name__ == "__main__":
    rel = sys.argv[1]; d = int(sys.argv[2]); h = int(sys.argv[3]); sal = sys.argv[4]
    open(sal, "w", encoding="utf-8").write(pagina(rel, d, h))
    print("generado:", sal)
