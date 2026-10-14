#!/usr/bin/env python3
"""Sirve las vistas reales de ALIMETRIK con datos de ejemplo, para
tomar las capturas de pantalla del frontend sin depender de la placa."""
import http.server, socketserver, json, os

BASE = "/Users/industriasisrael/Documents/programas claude/alimetrik-esp32p4/test-driver-4500/main/vistas"

ESTUDIANTES = [
    {"id":1,"documento":"1094523871","nombre":"Juan Sebastián","apellido":"Pérez Rojas","grado":"11-A","activo":1,"huellas":3,"autorizacion":1,"acudiente":"María Rojas"},
    {"id":2,"documento":"1094523902","nombre":"Ana María","apellido":"Gómez Díaz","grado":"10-B","activo":1,"huellas":3,"autorizacion":1,"acudiente":"Carlos Gómez"},
    {"id":3,"documento":"1094524115","nombre":"Camilo","apellido":"Gutiérrez Peña","grado":"11-A","activo":1,"huellas":3,"autorizacion":1,"acudiente":"Luz Peña"},
    {"id":4,"documento":"1094524233","nombre":"Valentina","apellido":"Martínez Silva","grado":"9-C","activo":1,"huellas":3,"autorizacion":1,"acudiente":"Jorge Martínez"},
    {"id":5,"documento":"1094524388","nombre":"Felipe","apellido":"González Torres","grado":"10-A","activo":1,"huellas":0,"autorizacion":1,"acudiente":"Sandra Torres"},
]
REGISTROS = [
    {"id":48,"nombre":"Valentina Martínez Silva","servicio":"Almuerzo","resultado":"permitido","fecha":"2026-08-19","hora":"12:41:07","score":34},
    {"id":47,"nombre":"Camilo Gutiérrez Peña","servicio":"Almuerzo","resultado":"duplicado","fecha":"2026-08-19","hora":"12:39:52","score":31},
    {"id":46,"nombre":"Camilo Gutiérrez Peña","servicio":"Almuerzo","resultado":"permitido","fecha":"2026-08-19","hora":"12:38:15","score":29},
    {"id":45,"nombre":"Ana María Gómez Díaz","servicio":"Almuerzo","resultado":"permitido","fecha":"2026-08-19","hora":"12:36:44","score":38},
    {"id":44,"nombre":"Desconocido","servicio":"Almuerzo","resultado":"desconocido","fecha":"2026-08-19","hora":"12:35:20","score":9},
    {"id":43,"nombre":"Juan Sebastián Pérez Rojas","servicio":"Almuerzo","resultado":"permitido","fecha":"2026-08-19","hora":"12:33:58","score":41},
]
ESTADO = {
    "estudiantes":5,"huellas":12,"registros":48,
    "permitido":41,"duplicado":4,"no_autorizado":0,"desconocido":3,
    "hay_hora":True,"fecha":"2026-08-19","hora":"12:41:35","servicio":"Almuerzo",
    "hoy":{"desayuno":38,"almuerzo":41,"refrigerio":0,"otros":0,"duplicados":4,"desconocidos":3,"servidos":4},
    "lector":"Listo. Pon el dedo en el lector","enroll":0,"enroll_falta":0,
    "ultimo":{"id":48,"nombre":"Valentina Martínez Silva","servicio":"Almuerzo","resultado":"permitido","hora":"12:41:07","fecha":"2026-08-19"},
    "servicios":[{"nombre":"Desayuno","n":38},{"nombre":"Almuerzo","n":45},{"nombre":"Refrigerio","n":12}]
}
SESION   = {"ok":True,"usuario":"admin","nombre":"Coordinación del Comedor","rol":1}
USUARIOS = [{"id":1,"usuario":"admin","nombre":"Coordinación del Comedor","rol":1,"activo":1},
            {"id":2,"usuario":"maria","nombre":"María Rojas (operadora)","rol":0,"activo":1}]
SERVICIOS = [{"id":1,"nombre":"Desayuno","inicio":"06:00","fin":"10:00","activo":1},
             {"id":2,"nombre":"Almuerzo","inicio":"11:00","fin":"14:30","activo":1},
             {"id":3,"nombre":"Refrigerio","inicio":"14:30","fin":"17:00","activo":1}]
INFO = {"flash_total_kb":8080,"flash_libre_kb":8021,"estudiantes":5,"huellas":12,
        "registros":48,"sesiones":1,"version":"ALIMETRIK 2.0 (MVC)"}

RUTAS = {"/api/estado":ESTADO, "/api/estudiantes":ESTUDIANTES, "/api/registros":REGISTROS,
         "/api/sesion":SESION, "/api/usuarios":USUARIOS, "/api/servicios":SERVICIOS,
         "/api/info":INFO, "/api/estado-acceso":{"clave_por_defecto":False}}

class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _html(self, archivo):
        with open(os.path.join(BASE, archivo), "rb") as f: c = f.read()
        self.send_response(200); self.send_header("Content-Type","text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(c))); self.end_headers(); self.wfile.write(c)
    def _json(self, obj):
        c = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(200); self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(c))); self.end_headers(); self.wfile.write(c)
    def do_GET(self):
        p = self.path.split("?")[0]
        if p in RUTAS: return self._json(RUTAS[p])
        if p == "/login":    return self._html("vista_login.html")
        if p == "/terminos": return self._html("vista_terminos.html")
        return self._html("vista_sistema.html")
    def do_POST(self):
        self._json({"ok":True})

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 8099), H) as s:
    print("servidor de capturas en http://127.0.0.1:8099")
    s.serve_forever()
