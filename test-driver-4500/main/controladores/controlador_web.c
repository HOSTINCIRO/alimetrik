/* ALIMETRIK - CONTROLADOR / Servidor web: implementacion. */
#include "controlador_web.h"
#include "controlador_auth.h"
#include "controlador_red.h"
#include "controlador_lector.h"
#include "modelos/almacenamiento.h"
#include "modelos/modelo_estudiante.h"
#include "modelos/modelo_biometrico.h"
#include "modelos/modelo_registro.h"
#include "modelos/modelo_usuario.h"
#include "modelos/modelo_servicio.h"
#include "vistas/vista_json.h"
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include "esp_log.h"
#include "esp_timer.h"
#include "esp_http_server.h"
#include "esp_heap_caps.h"
#include "lwip/sockets.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "WEB";
#define VERSION_SISTEMA  "ALIMETRIK 2.0 (MVC)"

static httpd_handle_t s_httpd = NULL;

/* Vistas incrustadas en la memoria del programa */
extern const char vista_sistema_start[]  asm("_binary_vista_sistema_html_start");
extern const char vista_sistema_end[]    asm("_binary_vista_sistema_html_end");
extern const char vista_login_start[]    asm("_binary_vista_login_html_start");
extern const char vista_login_end[]      asm("_binary_vista_login_html_end");
extern const char vista_terminos_start[] asm("_binary_vista_terminos_html_start");
extern const char vista_terminos_end[]   asm("_binary_vista_terminos_html_end");

/* ============================ utilidades ============================ */

static esp_err_t enviar_json(httpd_req_t *r, const char *cuerpo)
{
    httpd_resp_set_type(r, "application/json");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    return httpd_resp_sendstr(r, cuerpo);
}

static esp_err_t enviar_error(httpd_req_t *r, const char *estado, const char *mensaje)
{
    char buf[220], esc[160];
    httpd_resp_set_status(r, estado);
    snprintf(buf, sizeof(buf), "{\"ok\":false,\"error\":\"%s\"}",
             json_escapar(esc, sizeof(esc), mensaje));
    return enviar_json(r, buf);
}

static esp_err_t enviar_html(httpd_req_t *r, const char *ini, const char *fin)
{
    httpd_resp_set_type(r, "text/html");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    return httpd_resp_send(r, ini, fin - ini - 1);
}

/* snprintf devuelve la longitud que HABRIA necesitado, no la escrita: usarlo
 * directamente como avance del acumulador permitia que 'o' superara la
 * capacidad y las escrituras siguientes salieran del arreglo. */
static size_t avanzar(size_t o, size_t cap, int escrito)
{
    if (escrito < 0) return o;
    size_t nuevo = o + (size_t)escrito;
    return (nuevo >= cap) ? (cap - 1) : nuevo;
}

static int leer_cuerpo(httpd_req_t *r, char *buf, size_t n)
{
    int total = r->content_len;
    if (total >= (int)n) total = n - 1;
    int leidos = 0;
    while (leidos < total) {
        int k = httpd_req_recv(r, buf + leidos, total - leidos);
        if (k <= 0) break;
        leidos += k;
    }
    buf[leidos] = 0;
    return leidos;
}

/* Extrae "clave":"valor" (o numerico/booleano) de un JSON plano. */
static bool json_campo(const char *cuerpo, const char *clave, char *salida, size_t n)
{
    char patron[40];
    snprintf(patron, sizeof(patron), "\"%s\"", clave);
    const char *p = strstr(cuerpo, patron);
    if (!p) return false;
    p = strchr(p + strlen(patron), ':');
    if (!p) return false;
    p++;
    while (*p == ' ' || *p == '\t') p++;
    size_t o = 0;
    if (*p == '"') {
        p++;
        while (*p && *p != '"' && o + 1 < n) {
            if (*p == '\\' && p[1]) p++;
            salida[o++] = *p++;
        }
    } else {
        while (*p && *p != ',' && *p != '}' && *p != ' ' && o + 1 < n) salida[o++] = *p++;
    }
    salida[o] = 0;
    return true;
}

/* ======================= vistas (paginas HTML) ======================= */

static esp_err_t v_inicio(httpd_req_t *r)
{
    if (!auth_sesion_de(r)) {              /* sin sesion -> al inicio de sesion */
        httpd_resp_set_status(r, "302 Found");
        httpd_resp_set_hdr(r, "Location", "/login");
        return httpd_resp_send(r, "", 0);
    }
    return enviar_html(r, vista_sistema_start, vista_sistema_end);
}

static esp_err_t v_login(httpd_req_t *r)
{
    return enviar_html(r, vista_login_start, vista_login_end);
}

static esp_err_t v_terminos(httpd_req_t *r)
{
    return enviar_html(r, vista_terminos_start, vista_terminos_end);
}

/* ========================= sesion y usuarios ========================= */

static esp_err_t a_login(httpd_req_t *r)
{
    char cuerpo[300], usuario[32] = "", clave[64] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "usuario", usuario, sizeof(usuario));
    json_campo(cuerpo, "clave", clave, sizeof(clave));

    sesion_t *s = auth_iniciar_sesion(usuario, clave);
    if (!s) return enviar_error(r, "401 Unauthorized", "Usuario o contrasena incorrectos");

    char cookie[120];
    snprintf(cookie, sizeof(cookie), "sesion=%s; Path=/; Max-Age=28800; HttpOnly; SameSite=Lax", s->token);
    httpd_resp_set_hdr(r, "Set-Cookie", cookie);
    char out[200], nom[100];
    snprintf(out, sizeof(out), "{\"ok\":true,\"usuario\":\"%s\",\"nombre\":\"%s\",\"rol\":%d}",
             s->usuario, json_escapar(nom, sizeof(nom), s->nombre), s->rol);
    return enviar_json(r, out);
}

static esp_err_t a_logout(httpd_req_t *r)
{
    sesion_t *s = auth_sesion_de(r);
    if (s) auth_cerrar_sesion(s->token);
    httpd_resp_set_hdr(r, "Set-Cookie", "sesion=; Path=/; Max-Age=0");
    return enviar_json(r, "{\"ok\":true}");
}

static esp_err_t a_sesion(httpd_req_t *r)
{
    sesion_t *s = auth_exigir(r, false);
    if (!s) return ESP_OK;
    char out[220], nom[100];
    snprintf(out, sizeof(out), "{\"ok\":true,\"usuario\":\"%s\",\"nombre\":\"%s\",\"rol\":%d}",
             s->usuario, json_escapar(nom, sizeof(nom), s->nombre), s->rol);
    return enviar_json(r, out);
}

/* Publico: solo dice si la clave de fabrica sigue activa (para avisar). */
static esp_err_t a_estado_acceso(httpd_req_t *r)
{
    char out[64];
    snprintf(out, sizeof(out), "{\"clave_por_defecto\":%s}",
             usr_clave_por_defecto() ? "true" : "false");
    return enviar_json(r, out);
}

static esp_err_t a_usuarios_listar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char buf[900];
    int o = snprintf(buf, sizeof(buf), "[");
    for (int i = 0; i < usr_cantidad() && o < (int)sizeof(buf) - 150; i++) {
        const usuario_t *u = usr_por_indice(i);
        char us[48], nm[96];
        o += snprintf(buf + o, sizeof(buf) - o,
            "%s{\"id\":%u,\"usuario\":\"%s\",\"nombre\":\"%s\",\"rol\":%d,\"activo\":%d}",
            i ? "," : "", (unsigned)u->id,
            json_escapar(us, sizeof(us), u->usuario),
            json_escapar(nm, sizeof(nm), u->nombre), u->rol, u->activo);
    }
    snprintf(buf + o, sizeof(buf) - o, "]");
    return enviar_json(r, buf);
}

static esp_err_t a_usuarios_crear(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[300], usuario[32] = "", nombre[64] = "", clave[64] = "", rol[8] = "0";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "usuario", usuario, sizeof(usuario));
    json_campo(cuerpo, "nombre", nombre, sizeof(nombre));
    json_campo(cuerpo, "clave", clave, sizeof(clave));
    json_campo(cuerpo, "rol", rol, sizeof(rol));
    if (!usuario[0] || strlen(clave) < 6)
        return enviar_error(r, "400 Bad Request", "Usuario y contrasena de 6 o mas caracteres");
    if (!usr_crear(usuario, nombre, clave, atoi(rol) ? ROL_ADMIN : ROL_OPERADOR))
        return enviar_error(r, "409 Conflict", "Ese usuario ya existe o no hay espacio");
    return enviar_json(r, "{\"ok\":true}");
}

static esp_err_t a_usuarios_borrar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[120], ids[16] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "id", ids, sizeof(ids));
    uint32_t uid = (uint32_t)strtoul(ids, NULL, 10);
    if (!usr_borrar(uid))
        return enviar_error(r, "409 Conflict", "No se puede borrar (debe quedar un administrador)");
    auth_cerrar_sesiones_de(uid);   /* que no siga operando con su sesion abierta */
    return enviar_json(r, "{\"ok\":true}");
}

static esp_err_t a_clave(httpd_req_t *r)
{
    sesion_t *s = auth_exigir(r, false);
    if (!s) return ESP_OK;
    char cuerpo[260], actual[64] = "", nueva[64] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "actual", actual, sizeof(actual));
    json_campo(cuerpo, "nueva", nueva, sizeof(nueva));
    if (!usr_verificar(s->usuario, actual))
        return enviar_error(r, "401 Unauthorized", "La contrasena actual no es correcta");
    if (strlen(nueva) < 6)
        return enviar_error(r, "400 Bad Request", "La contrasena nueva debe tener 6 o mas caracteres");
    if (!usr_cambiar_clave(s->usuario, nueva))
        return enviar_error(r, "500 Internal Server Error", "No se pudo guardar la contrasena");
    return enviar_json(r, "{\"ok\":true}");
}

/* ====================== estado, metricas e info ====================== */

static esp_err_t a_estado(httpd_req_t *r)
{
    if (!auth_exigir(r, false)) return ESP_OK;

    char hoy[12] = "", ahora[10] = "";
    red_fecha_hora(hoy, ahora);
    char servicio[24];
    red_servicio_actual(servicio, sizeof(servicio));

    alm_lock();
    int nreg = reg_cantidad();
    int c_ok = 0, c_dup = 0, c_no = 0, c_unk = 0;
    int h_des = 0, h_alm = 0, h_ref = 0, h_otro = 0, h_dup = 0, h_unk = 0, servidos = 0;
    static uint8_t bm[1024];
    memset(bm, 0, sizeof(bm));
    struct { char nombre[24]; int n; } serv[8];   /* 24 = igual que el campo real */
    int nserv = 0;

    for (int i = 0; i < nreg; i++) {
        const registro_t *g = reg_por_indice(i);
        if (!g) continue;
        bool ok = !strcmp(g->resultado, "permitido");
        if      (ok)                                     c_ok++;
        else if (!strcmp(g->resultado, "duplicado"))     c_dup++;
        else if (!strcmp(g->resultado, "no_autorizado")) c_no++;
        else                                             c_unk++;
        if (!strcmp(g->fecha, hoy)) {
            if (ok) {
                if      (!strcmp(g->servicio, "Desayuno"))   h_des++;
                else if (!strcmp(g->servicio, "Almuerzo"))   h_alm++;
                else if (!strcmp(g->servicio, "Refrigerio")) h_ref++;
                else                                          h_otro++;
                if (!strcmp(g->servicio, servicio) && g->estudiante_id < 8192) {
                    uint32_t id = g->estudiante_id;
                    if (!(bm[id >> 3] & (1 << (id & 7)))) { bm[id >> 3] |= 1 << (id & 7); servidos++; }
                }
            } else if (!strcmp(g->resultado, "duplicado"))   h_dup++;
            else if (!strcmp(g->resultado, "desconocido"))   h_unk++;
        }
        int f = -1;
        for (int k = 0; k < nserv; k++) if (!strcmp(serv[k].nombre, g->servicio)) { f = k; break; }
        if (f < 0 && nserv < 8) { f = nserv++; strlcpy(serv[f].nombre, g->servicio, sizeof(serv[f].nombre)); serv[f].n = 0; }
        if (f >= 0) serv[f].n++;
    }

    int nest = est_cantidad(), nhue = bio_cantidad();
    char ultimo[220] = "null";
    const registro_t *u = reg_por_indice(0);
    if (u) {
        const char *nom = "Desconocido";
        char completo[90];
        if (u->estudiante_id) {
            estudiante_t *e = est_por_id(u->estudiante_id);
            if (e) { snprintf(completo, sizeof(completo), "%s %s", e->nombre, e->apellido); nom = completo; }
        }
        json_registro(ultimo, sizeof(ultimo), u, nom, true);
    }
    alm_unlock();

    char estado_lector[96], esc_lector[120];
    lector_estado_actual(estado_lector, sizeof(estado_lector));

    char buf[1900];
    int o = snprintf(buf, sizeof(buf),
        "{\"estudiantes\":%d,\"huellas\":%d,\"registros\":%d,"
        "\"permitido\":%d,\"duplicado\":%d,\"no_autorizado\":%d,\"desconocido\":%d,"
        "\"hay_hora\":%s,\"fecha\":\"%s\",\"hora\":\"%s\",\"servicio\":\"%s\","
        "\"hoy\":{\"desayuno\":%d,\"almuerzo\":%d,\"refrigerio\":%d,\"otros\":%d,"
        "\"duplicados\":%d,\"desconocidos\":%d,\"servidos\":%d},"
        "\"lector\":\"%s\",\"enroll\":%u,\"enroll_falta\":%d,\"ultimo\":%s,\"servicios\":[",
        nest, nhue, nreg, c_ok, c_dup, c_no, c_unk,
        red_hay_hora() ? "true" : "false", hoy, ahora, servicio,
        h_des, h_alm, h_ref, h_otro, h_dup, h_unk, servidos,
        json_escapar(esc_lector, sizeof(esc_lector), estado_lector),
        (unsigned)lector_enrolamiento_pendiente(), lector_enrolamiento_faltan(), ultimo);
    char esc[40];
    for (int k = 0; k < nserv && o < (int)sizeof(buf) - 60; k++)
        o += snprintf(buf + o, sizeof(buf) - o, "%s{\"nombre\":\"%s\",\"n\":%d}",
                      k ? "," : "", json_escapar(esc, sizeof(esc), serv[k].nombre), serv[k].n);
    snprintf(buf + o, sizeof(buf) - o, "]}");
    return enviar_json(r, buf);
}

static esp_err_t a_info(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    size_t tot = 0, lib = 0;
    alm_espacio(&tot, &lib);
    char buf[300];
    snprintf(buf, sizeof(buf),
        "{\"flash_total_kb\":%u,\"flash_libre_kb\":%u,\"estudiantes\":%d,\"huellas\":%d,"
        "\"registros\":%d,\"sesiones\":%d,\"version\":\"%s\"}",
        (unsigned)(tot / 1024), (unsigned)(lib / 1024),
        est_cantidad(), bio_cantidad(), reg_cantidad(),
        auth_sesiones_activas(), VERSION_SISTEMA);
    return enviar_json(r, buf);
}

/* =========================== estudiantes ============================ */

static esp_err_t a_estudiantes_listar(httpd_req_t *r)
{
    if (!auth_exigir(r, false)) return ESP_OK;
    alm_lock();
    int n = est_cantidad();
    size_t cap = 64 + (size_t)n * 340;
    char *out = heap_caps_malloc(cap, MALLOC_CAP_SPIRAM);
    if (!out) { alm_unlock(); return enviar_error(r, "500 Internal Server Error", "Sin memoria"); }
    size_t o = 0;
    out[o++] = '[';
    for (int i = 0; i < n && o + 340 < cap; i++) {
        const estudiante_t *e = est_por_indice(i);
        if (!e) continue;
        o = avanzar(o, cap, json_estudiante(out + o, cap - o, e, bio_cantidad_de(e->id), i == 0));
    }
    alm_unlock();
    out[o++] = ']'; out[o] = 0;
    httpd_resp_set_type(r, "application/json");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    esp_err_t rc = httpd_resp_send(r, out, o);
    free(out);
    return rc;
}

static esp_err_t a_estudiantes_crear(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[520];
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    char doc[24] = "", nom[40] = "", ape[40] = "", gra[12] = "";
    char acu[60] = "", docacu[24] = "", autoriza[12] = "";
    json_campo(cuerpo, "documento", doc, sizeof(doc));
    json_campo(cuerpo, "nombre", nom, sizeof(nom));
    json_campo(cuerpo, "apellido", ape, sizeof(ape));
    json_campo(cuerpo, "grado", gra, sizeof(gra));
    json_campo(cuerpo, "acudiente", acu, sizeof(acu));
    json_campo(cuerpo, "doc_acudiente", docacu, sizeof(docacu));
    json_campo(cuerpo, "autorizacion", autoriza, sizeof(autoriza));

    if (!doc[0] || !nom[0])
        return enviar_error(r, "400 Bad Request", "El documento y el nombre son obligatorios");
    /* la ley exige consentimiento expreso para datos biometricos */
    if (strcmp(autoriza, "true") != 0)
        return enviar_error(r, "400 Bad Request",
            "Falta la autorizacion de tratamiento de datos biometricos");
    if (!acu[0] || !docacu[0])
        return enviar_error(r, "400 Bad Request",
            "Indique el nombre y documento de quien autoriza");

    char fecha[12], hora[10];
    red_fecha_hora(fecha, hora);
    uint32_t id = est_crear(doc, nom, ape, gra, true, acu, docacu, fecha);
    if (id == 0) {
        size_t tot = 0, lib = 0;
        alm_espacio(&tot, &lib);
        ESP_LOGE(TAG, "no se pudo registrar a '%s %s' (memoria libre %u KB)",
                 nom, ape, (unsigned)(lib / 1024));
        if (est_por_documento(doc))
            return enviar_error(r, "409 Conflict", "Ya existe un alumno con ese documento");
        return enviar_error(r, "507 Insufficient Storage",
                            "No se pudo guardar en la memoria del equipo");
    }
    ESP_LOGI(TAG, "alumno registrado: %s %s (doc %s) id=%u, autoriza %s",
             nom, ape, doc, (unsigned)id, acu);
    char out[64];
    snprintf(out, sizeof(out), "{\"ok\":true,\"id\":%u}", (unsigned)id);
    return enviar_json(r, out);
}

static esp_err_t a_estudiantes_borrar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[120], ids[16] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "id", ids, sizeof(ids));
    uint32_t id = (uint32_t)strtoul(ids, NULL, 10);
    /* si habia un enrolamiento en curso para este alumno, cancelarlo: si no,
     * la siguiente huella se guardaria para una ficha que ya no existe */
    if (lector_enrolamiento_pendiente() == id) {
        lector_enrolamiento_cancelar();
        lector_mensaje("Listo. Pon el dedo en el lector");
    }
    bio_borrar_de(id);                     /* supresion de datos biometricos */
    bool ok = id && est_borrar(id);
    ESP_LOGI(TAG, "baja de alumno id=%u -> %s", (unsigned)id, ok ? "hecha" : "no encontrado");
    return enviar_json(r, ok ? "{\"ok\":true}" : "{\"ok\":false}");
}

/* Derecho de revocacion: se borran las huellas y queda sin autorizacion. */
static esp_err_t a_estudiantes_revocar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[120], ids[16] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "id", ids, sizeof(ids));
    uint32_t id = (uint32_t)strtoul(ids, NULL, 10);
    if (lector_enrolamiento_pendiente() == id) {   /* cancelar enrolamiento en curso */
        lector_enrolamiento_cancelar();
        lector_mensaje("Enrolamiento cancelado: autorizacion revocada");
    }
    int borradas = bio_borrar_de(id);
    bool ok = id && est_revocar_autorizacion(id);
    ESP_LOGW(TAG, "REVOCACION de autorizacion id=%u: %d plantillas suprimidas", (unsigned)id, borradas);
    char out[80];
    snprintf(out, sizeof(out), "{\"ok\":%s,\"suprimidas\":%d}", ok ? "true" : "false", borradas);
    return enviar_json(r, out);
}

/* ============================= registros ============================= */

static esp_err_t a_registros(httpd_req_t *r)
{
    if (!auth_exigir(r, false)) return ESP_OK;
    alm_lock();
    int n = reg_cantidad();
    if (n > 60) n = 60;
    size_t cap = 64 + (size_t)n * 300;
    char *out = heap_caps_malloc(cap, MALLOC_CAP_SPIRAM);
    if (!out) { alm_unlock(); return enviar_error(r, "500 Internal Server Error", "Sin memoria"); }
    size_t o = 0;
    out[o++] = '[';
    for (int i = 0; i < n && o + 300 < cap; i++) {
        const registro_t *g = reg_por_indice(i);
        if (!g) continue;
        const char *nom = "Desconocido";
        char completo[90];
        if (g->estudiante_id) {
            estudiante_t *e = est_por_id(g->estudiante_id);
            if (e) { snprintf(completo, sizeof(completo), "%s %s", e->nombre, e->apellido); nom = completo; }
        }
        o = avanzar(o, cap, json_registro(out + o, cap - o, g, nom, i == 0));
    }
    alm_unlock();
    out[o++] = ']'; out[o] = 0;
    httpd_resp_set_type(r, "application/json");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    esp_err_t rc = httpd_resp_send(r, out, o);
    free(out);
    return rc;
}

/* ========================= reloj y enrolamiento ====================== */

/* Cambiar la hora altera que servicio se entrega y el anti-duplicado:
 * es una operacion de administracion. */
static esp_err_t a_hora(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[180], ep[24] = "", tz[16] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "epoch", ep, sizeof(ep));
    json_campo(cuerpo, "tz", tz, sizeof(tz));
    long epoch = strtol(ep, NULL, 10);
    if (epoch < 1700000000L) return enviar_error(r, "400 Bad Request", "Hora invalida");
    red_fijar_hora(epoch, (int)strtol(tz, NULL, 10));
    char f[12], h[10], out[90];
    red_fecha_hora(f, h);
    snprintf(out, sizeof(out), "{\"ok\":true,\"fecha\":\"%s\",\"hora\":\"%s\"}", f, h);
    return enviar_json(r, out);
}

static esp_err_t a_enrolar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[120], ids[16] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "id", ids, sizeof(ids));
    uint32_t id = (uint32_t)strtoul(ids, NULL, 10);

    alm_lock();
    estudiante_t *e = id ? est_por_id(id) : NULL;
    bool existe = (e != NULL);
    bool autorizado = existe && e->autorizacion;
    char nombre[90] = "";
    if (existe) snprintf(nombre, sizeof(nombre), "%s %s", e->nombre, e->apellido);
    alm_unlock();

    if (!existe) return enviar_error(r, "404 Not Found", "El alumno no existe");
    if (!autorizado)
        return enviar_error(r, "403 Forbidden",
            "El alumno no tiene autorizacion vigente para el uso de datos biometricos");

    lector_enrolamiento_pedir(id);
    char msg[190];
    snprintf(msg, sizeof(msg), "Enrolando a %s: pon el dedo (muestra 1 de 3)", nombre);
    lector_mensaje(msg);
    ESP_LOGI(TAG, "enrolamiento solicitado para %s (id %u)", nombre, (unsigned)id);
    return enviar_json(r, "{\"ok\":true}");
}

static esp_err_t a_enrolar_cancelar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    lector_enrolamiento_cancelar();
    lector_mensaje("Listo. Pon el dedo en el lector");
    return enviar_json(r, "{\"ok\":true}");
}

/* ==================== resumen del dia por categoria ==================== */
/* Responde QUIENES estan en cada categoria hoy (no solo cuantos):
 *   atendidos  : ya recibieron el servicio actual
 *   duplicados : intentaron repetir
 *   pendientes : registrados con huella que aun NO han pasado
 *   grados     : cobertura por curso                                        */
static esp_err_t a_resumen(httpd_req_t *r)
{
    if (!auth_exigir(r, false)) return ESP_OK;

    char hoy[12] = "", ahora[10] = "";
    red_fecha_hora(hoy, ahora);
    char servicio[24];
    red_servicio_actual(servicio, sizeof(servicio));

    size_t cap = 24000;
    char *out = heap_caps_malloc(cap, MALLOC_CAP_SPIRAM);
    if (!out) return enviar_error(r, "500 Internal Server Error", "Sin memoria");

    /* marcas por estudiante (indice = id, hasta 8192) */
    static uint8_t bm_at[1024], bm_dup[1024];
    memset(bm_at, 0, sizeof(bm_at));
    memset(bm_dup, 0, sizeof(bm_dup));

    alm_lock();
    int nreg = reg_cantidad();
    int desconocidos = 0;
    size_t o = 0;

    /* ---- atendidos: recorrer del mas reciente al mas antiguo ---- */
    o = avanzar(o, cap, snprintf(out + o, cap - o, "{\"servicio\":\"%s\",\"fecha\":\"%s\",\"hora\":\"%s\",\"atendidos\":[",
                  servicio, hoy, ahora));
    int n_at = 0;
    for (int i = 0; i < nreg && o + 260 < cap; i++) {
        const registro_t *g = reg_por_indice(i);
        if (!g || strcmp(g->fecha, hoy) || strcmp(g->servicio, servicio)) continue;
        if (strcmp(g->resultado, "desconocido") == 0) { desconocidos++; continue; }
        if (strcmp(g->resultado, "permitido")) continue;
        uint32_t id = g->estudiante_id;
        if (!id || id >= 8192 || (bm_at[id >> 3] & (1 << (id & 7)))) continue;
        bm_at[id >> 3] |= 1 << (id & 7);
        estudiante_t *e = est_por_id(id);
        char nom[90], gra[24];
        snprintf(nom, sizeof(nom), "%s %s", e ? e->nombre : "?", e ? e->apellido : "");
        char esc1[100], esc2[30];
        o = avanzar(o, cap, snprintf(out + o, cap - o, "%s{\"nombre\":\"%s\",\"grado\":\"%s\",\"hora\":\"%s\"}",
                      n_at ? "," : "", json_escapar(esc1, sizeof(esc1), nom),
                      json_escapar(esc2, sizeof(esc2), e ? e->grado : ""),
                      g->hora));
        n_at++;
    }

    /* ---- duplicados: quienes intentaron repetir ---- */
    o = avanzar(o, cap, snprintf(out + o, cap - o, "],\"duplicados\":["));
    int n_dup = 0;
    for (int i = 0; i < nreg && o + 260 < cap; i++) {
        const registro_t *g = reg_por_indice(i);
        if (!g || strcmp(g->fecha, hoy) || strcmp(g->servicio, servicio)) continue;
        if (strcmp(g->resultado, "duplicado")) continue;
        uint32_t id = g->estudiante_id;
        if (!id || id >= 8192 || (bm_dup[id >> 3] & (1 << (id & 7)))) continue;
        bm_dup[id >> 3] |= 1 << (id & 7);
        estudiante_t *e = est_por_id(id);
        char nom[90], esc1[100];
        snprintf(nom, sizeof(nom), "%s %s", e ? e->nombre : "?", e ? e->apellido : "");
        o = avanzar(o, cap, snprintf(out + o, cap - o, "%s{\"nombre\":\"%s\",\"hora\":\"%s\"}",
                      n_dup ? "," : "", json_escapar(esc1, sizeof(esc1), nom), g->hora));
        n_dup++;
    }

    /* ---- pendientes y cobertura por grado ---- */
    struct { char grado[14]; int total, atendidos; } gr[24];
    int ngr = 0;
    o = avanzar(o, cap, snprintf(out + o, cap - o, "],\"pendientes\":["));
    int n_pen = 0, sin_huella = 0;
    for (int i = 0; i < est_cantidad(); i++) {
        const estudiante_t *e = est_por_indice(i);
        if (!e || !e->activo) continue;
        bool atendido = (e->id < 8192) && (bm_at[e->id >> 3] & (1 << (e->id & 7)));

        const char *g = e->grado[0] ? e->grado : "(sin grado)";
        int f = -1;
        for (int k = 0; k < ngr; k++) if (!strcmp(gr[k].grado, g)) { f = k; break; }
        if (f < 0 && ngr < 24) { f = ngr++; strlcpy(gr[f].grado, g, sizeof(gr[f].grado)); gr[f].total = 0; gr[f].atendidos = 0; }
        if (f >= 0) { gr[f].total++; if (atendido) gr[f].atendidos++; }

        if (atendido) continue;
        if (bio_cantidad_de(e->id) == 0) { sin_huella++; continue; }   /* aun sin enrolar */
        if (o + 240 < cap) {
            char nom[90], esc1[100], esc2[30];
            snprintf(nom, sizeof(nom), "%s %s", e->nombre, e->apellido);
            o = avanzar(o, cap, snprintf(out + o, cap - o, "%s{\"nombre\":\"%s\",\"grado\":\"%s\"}",
                          n_pen ? "," : "", json_escapar(esc1, sizeof(esc1), nom),
                          json_escapar(esc2, sizeof(esc2), e->grado)));
            n_pen++;
        }
    }

    o = avanzar(o, cap, snprintf(out + o, cap - o, "],\"grados\":["));
    for (int k = 0; k < ngr && o + 140 < cap; k++) {
        char esc1[30];
        o = avanzar(o, cap, snprintf(out + o, cap - o, "%s{\"grado\":\"%s\",\"total\":%d,\"atendidos\":%d}",
                      k ? "," : "", json_escapar(esc1, sizeof(esc1), gr[k].grado),
                      gr[k].total, gr[k].atendidos));
    }
    alm_unlock();

    o = avanzar(o, cap, snprintf(out + o, cap - o,
                  "],\"desconocidos\":%d,\"sin_huella\":%d,\"n_atendidos\":%d,\"n_pendientes\":%d}",
                  desconocidos, sin_huella, n_at, n_pen));

    httpd_resp_set_type(r, "application/json");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    esp_err_t rc = httpd_resp_send(r, out, o);
    free(out);
    return rc;
}

/* ====================== servicios y horarios ========================= */

static esp_err_t a_servicios_listar(httpd_req_t *r)
{
    if (!auth_exigir(r, false)) return ESP_OK;
    char buf[800];
    int o = snprintf(buf, sizeof(buf), "[");
    for (int i = 0; i < srv_cantidad() && o < (int)sizeof(buf) - 140; i++) {
        const servicio_t *s = srv_por_indice(i);
        char ini[6], fin[6], nom[52];
        srv_minutos_a_texto(s->inicio, ini);
        srv_minutos_a_texto(s->fin, fin);
        o += snprintf(buf + o, sizeof(buf) - o,
            "%s{\"id\":%u,\"nombre\":\"%s\",\"inicio\":\"%s\",\"fin\":\"%s\",\"activo\":%d}",
            i ? "," : "", (unsigned)s->id, json_escapar(nom, sizeof(nom), s->nombre),
            ini, fin, s->activo);
    }
    snprintf(buf + o, sizeof(buf) - o, "]");
    return enviar_json(r, buf);
}

/* Alta o edicion: si viene "id" se edita, si no se crea. */
static esp_err_t a_servicios_guardar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[340], ids[16] = "", nombre[24] = "", ini[10] = "", fin[10] = "", act[10] = "true";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "id", ids, sizeof(ids));
    json_campo(cuerpo, "nombre", nombre, sizeof(nombre));
    json_campo(cuerpo, "inicio", ini, sizeof(ini));
    json_campo(cuerpo, "fin", fin, sizeof(fin));
    json_campo(cuerpo, "activo", act, sizeof(act));

    int m_ini = srv_texto_a_minutos(ini), m_fin = srv_texto_a_minutos(fin);
    if (!nombre[0]) return enviar_error(r, "400 Bad Request", "Indique el nombre del servicio");
    if (m_ini < 0 || m_fin < 0)
        return enviar_error(r, "400 Bad Request", "Las horas deben tener el formato HH:MM");
    if (m_ini >= m_fin)
        return enviar_error(r, "400 Bad Request", "La hora de inicio debe ser anterior a la de fin");

    uint32_t id = (uint32_t)strtoul(ids, NULL, 10);
    bool activo = strcmp(act, "false") != 0;
    if (id) {
        if (!srv_actualizar(id, nombre, m_ini, m_fin, activo))
            return enviar_error(r, "409 Conflict", "El horario se cruza con otro servicio activo");
    } else {
        if (!srv_crear(nombre, m_ini, m_fin))
            return enviar_error(r, "409 Conflict",
                "No se pudo crear: el horario se cruza con otro o se alcanzo el maximo");
    }
    return enviar_json(r, "{\"ok\":true}");
}

static esp_err_t a_servicios_borrar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    char cuerpo[120], ids[16] = "";
    leer_cuerpo(r, cuerpo, sizeof(cuerpo));
    json_campo(cuerpo, "id", ids, sizeof(ids));
    bool ok = srv_borrar((uint32_t)strtoul(ids, NULL, 10));
    return enviar_json(r, ok ? "{\"ok\":true}" : "{\"ok\":false}");
}

static esp_err_t a_servicios_restaurar(httpd_req_t *r)
{
    if (!auth_exigir(r, true)) return ESP_OK;
    srv_restaurar_por_defecto();
    return enviar_json(r, "{\"ok\":true}");
}

/* ===================== portal cautivo (404 -> inicio) ================= */

static esp_err_t no_encontrado(httpd_req_t *r, httpd_err_code_t err)
{
    httpd_resp_set_status(r, "302 Found");
    httpd_resp_set_hdr(r, "Location", "http://192.168.4.1/");
    httpd_resp_send(r, "", 0);
    return ESP_OK;
}

/* Sin retardo de Nagle: evita ~250 ms de espera en cada respuesta corta. */
static esp_err_t al_abrir(httpd_handle_t hd, int fd)
{
    int si = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &si, sizeof(si));
    return ESP_OK;
}

static void ruta(const char *uri, httpd_method_t m, esp_err_t (*fn)(httpd_req_t *))
{
    httpd_uri_t u = { .uri = uri, .method = m, .handler = fn };
    httpd_register_uri_handler(s_httpd, &u);
}

bool web_iniciar(void)
{
    httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
    cfg.max_uri_handlers = 32;
    cfg.lru_purge_enable = true;
    cfg.stack_size = 8192;
    cfg.open_fn = al_abrir;
    if (httpd_start(&s_httpd, &cfg) != ESP_OK) {
        ESP_LOGE(TAG, "no se pudo iniciar el servidor web");
        return false;
    }
    /* paginas */
    ruta("/",          HTTP_GET,  v_inicio);
    ruta("/login",     HTTP_GET,  v_login);
    ruta("/terminos",  HTTP_GET,  v_terminos);
    /* sesion */
    ruta("/api/login",         HTTP_POST, a_login);
    ruta("/api/logout",        HTTP_POST, a_logout);
    ruta("/api/sesion",        HTTP_GET,  a_sesion);
    ruta("/api/estado-acceso", HTTP_GET,  a_estado_acceso);
    ruta("/api/clave",         HTTP_POST, a_clave);
    ruta("/api/usuarios",        HTTP_GET,  a_usuarios_listar);
    ruta("/api/usuarios/borrar", HTTP_POST, a_usuarios_borrar);
    ruta("/api/usuarios",        HTTP_POST, a_usuarios_crear);
    /* datos */
    ruta("/api/estado",              HTTP_GET,  a_estado);
    ruta("/api/info",                HTTP_GET,  a_info);
    ruta("/api/estudiantes",         HTTP_GET,  a_estudiantes_listar);
    ruta("/api/estudiantes/borrar",  HTTP_POST, a_estudiantes_borrar);
    ruta("/api/estudiantes/revocar", HTTP_POST, a_estudiantes_revocar);
    ruta("/api/estudiantes",         HTTP_POST, a_estudiantes_crear);
    ruta("/api/registros",           HTTP_GET,  a_registros);
    ruta("/api/hora",                HTTP_POST, a_hora);
    ruta("/api/enrolar/cancelar",    HTTP_POST, a_enrolar_cancelar);
    ruta("/api/enrolar",             HTTP_POST, a_enrolar);
    /* servicios y horarios */
    ruta("/api/resumen",             HTTP_GET,  a_resumen);
    ruta("/api/servicios",           HTTP_GET,  a_servicios_listar);
    ruta("/api/servicios/borrar",    HTTP_POST, a_servicios_borrar);
    ruta("/api/servicios/restaurar", HTTP_POST, a_servicios_restaurar);
    ruta("/api/servicios",           HTTP_POST, a_servicios_guardar);

    httpd_register_err_handler(s_httpd, HTTPD_404_NOT_FOUND, no_encontrado);
    ESP_LOGI(TAG, "servidor web activo en http://192.168.4.1/");
    return true;
}

/* ===================== autoprueba interna (loopback) ================== */

static void probar(const char *ruta_http)
{
    int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock < 0) return;
    struct timeval to = { .tv_sec = 5 };
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &to, sizeof(to));
    struct sockaddr_in sa = { .sin_family = AF_INET, .sin_port = htons(80) };
    sa.sin_addr.s_addr = inet_addr("192.168.4.1");
    int64_t t0 = esp_timer_get_time();
    if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) != 0) {
        ESP_LOGE(TAG, "AUTOPRUEBA %s: no conecta", ruta_http);
        close(sock);
        return;
    }
    char req[160];
    snprintf(req, sizeof(req), "GET %s HTTP/1.0\r\nHost: 192.168.4.1\r\nConnection: close\r\n\r\n", ruta_http);
    send(sock, req, strlen(req), 0);
    static char rsp[1024];
    int total = 0, n, fin_cab = -1, largo = -1;
    int64_t ms = -1;
    while (total < (int)sizeof(rsp) - 1 && (n = recv(sock, rsp + total, sizeof(rsp) - 1 - total, 0)) > 0) {
        total += n; rsp[total] = 0;
        if (fin_cab < 0) {
            char *p = strstr(rsp, "\r\n\r\n");
            if (p) {
                fin_cab = (p - rsp) + 4;
                char *cl = strstr(rsp, "Content-Length:");
                if (cl && cl < p) largo = atoi(cl + 15);
            }
        }
        if (fin_cab >= 0 && largo >= 0 && total - fin_cab >= largo) { ms = (esp_timer_get_time() - t0) / 1000; break; }
    }
    close(sock);
    if (ms < 0) ms = (esp_timer_get_time() - t0) / 1000;
    int codigo = total > 12 ? atoi(rsp + 9) : 0;
    ESP_LOGI(TAG, "AUTOPRUEBA %-22s HTTP %d en %lld ms", ruta_http, codigo, ms);
}

/* Prueba el circuito completo de autenticacion: credenciales incorrectas,
 * correctas, uso de la cookie y cierre de sesion. */
static void probar_login(void)
{
    char cookie[80] = "";
    /* --- 1. credenciales incorrectas --- */
    int c1 = 0;
    {
        int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        struct sockaddr_in sa = { .sin_family = AF_INET, .sin_port = htons(80) };
        sa.sin_addr.s_addr = inet_addr("192.168.4.1");
        struct timeval to = { .tv_sec = 5 };
        setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &to, sizeof(to));
        if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) == 0) {
            const char *j = "{\"usuario\":\"admin\",\"clave\":\"equivocada\"}";
            char req[320];
            int n = snprintf(req, sizeof(req), "POST /api/login HTTP/1.0\r\nHost: 192.168.4.1\r\n"
                "Content-Type: application/json\r\nContent-Length: %u\r\nConnection: close\r\n\r\n%s",
                (unsigned)strlen(j), j);
            send(sock, req, n, 0);
            static char rsp[700]; int t = 0, k;
            while (t < (int)sizeof(rsp) - 1 && (k = recv(sock, rsp + t, sizeof(rsp) - 1 - t, 0)) > 0) t += k;
            rsp[t] = 0;
            c1 = t > 12 ? atoi(rsp + 9) : 0;
        }
        close(sock);
    }
    /* si el administrador ya cambio la clave por defecto (lo recomendado), las
       pruebas 2 y 3 no tienen credenciales validas que usar: darlas por buenas */
    if (!usr_clave_por_defecto()) {
        ESP_LOGI(TAG, "AUTOPRUEBA acceso: clave mala=%d (esperado 401) | "
                      "clave por defecto ya cambiada (BIEN): pruebas con credenciales omitidas  ->  %s",
                 c1, (c1 == 401) ? "CORRECTO" : "REVISAR");
        return;
    }
    /* --- 2. credenciales correctas: guardar la cookie --- */
    int c2 = 0;
    {
        int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        struct sockaddr_in sa = { .sin_family = AF_INET, .sin_port = htons(80) };
        sa.sin_addr.s_addr = inet_addr("192.168.4.1");
        struct timeval to = { .tv_sec = 5 };
        setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &to, sizeof(to));
        if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) == 0) {
            const char *j = "{\"usuario\":\"admin\",\"clave\":\"admin123\"}";
            char req[320];
            int n = snprintf(req, sizeof(req), "POST /api/login HTTP/1.0\r\nHost: 192.168.4.1\r\n"
                "Content-Type: application/json\r\nContent-Length: %u\r\nConnection: close\r\n\r\n%s",
                (unsigned)strlen(j), j);
            send(sock, req, n, 0);
            static char rsp[900]; int t = 0, k;
            while (t < (int)sizeof(rsp) - 1 && (k = recv(sock, rsp + t, sizeof(rsp) - 1 - t, 0)) > 0) t += k;
            rsp[t] = 0;
            c2 = t > 12 ? atoi(rsp + 9) : 0;
            char *p = strstr(rsp, "sesion=");
            if (p) { int i = 0; p += 7; while (*p && *p != ';' && i < 40) cookie[i++] = *p++; cookie[i] = 0; }
        }
        close(sock);
    }
    /* --- 3. usar la cookie en una ruta protegida --- */
    int c3 = 0;
    if (cookie[0]) {
        int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        struct sockaddr_in sa = { .sin_family = AF_INET, .sin_port = htons(80) };
        sa.sin_addr.s_addr = inet_addr("192.168.4.1");
        struct timeval to = { .tv_sec = 5 };
        setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &to, sizeof(to));
        if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) == 0) {
            char req[320];
            int n = snprintf(req, sizeof(req), "GET /api/sesion HTTP/1.0\r\nHost: 192.168.4.1\r\n"
                "Cookie: sesion=%s\r\nConnection: close\r\n\r\n", cookie);
            send(sock, req, n, 0);
            static char rsp[700]; int t = 0, k;
            while (t < (int)sizeof(rsp) - 1 && (k = recv(sock, rsp + t, sizeof(rsp) - 1 - t, 0)) > 0) t += k;
            rsp[t] = 0;
            c3 = t > 12 ? atoi(rsp + 9) : 0;
        }
        close(sock);
        auth_cerrar_sesion(cookie);   /* no dejar sesiones de prueba abiertas */
    }
    ESP_LOGI(TAG, "AUTOPRUEBA acceso: clave mala=%d (esperado 401) | clave buena=%d (esperado 200) | "
                  "con sesion=%d (esperado 200)  ->  %s",
             c1, c2, c3,
             (c1 == 401 && c2 == 200 && c3 == 200) ? "CORRECTO" : "REVISAR");
}

void web_autoprueba(void)
{
    ESP_LOGI(TAG, "---- autoprueba del servidor (sin celular) ----");
    probar("/login");            /* publico */
    probar("/terminos");         /* publico */
    probar("/api/estado-acceso");/* publico */
    probar("/api/estado");       /* protegido: debe responder 401 */
    probar("/");                 /* sin sesion: debe redirigir (302) */
    probar("/api/resumen");      /* protegido: debe responder 401 */
    probar_login();
}
