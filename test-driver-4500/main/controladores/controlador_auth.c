/* ALIMETRIK - CONTROLADOR / Autenticacion: implementacion. */
#include "controlador_auth.h"
#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "esp_random.h"
#include "esp_timer.h"

static const char *TAG = "AUTH";
static sesion_t s_ses[AUTH_MAX_SESIONES];

static void generar_token(char *out)
{
    uint8_t b[16];
    esp_fill_random(b, sizeof(b));
    for (int i = 0; i < 16; i++) sprintf(out + i * 2, "%02x", b[i]);
    out[32] = 0;
}

static bool caducada(const sesion_t *s)
{
    int64_t limite = (int64_t)AUTH_CADUCIDAD_MIN * 60 * 1000000LL;
    return (esp_timer_get_time() - s->ultimo_uso) > limite;
}

sesion_t *auth_iniciar_sesion(const char *usuario, const char *clave)
{
    usuario_t *u = usr_verificar(usuario, clave);
    if (!u) return NULL;

    /* buscar hueco libre o reutilizar el mas antiguo */
    int libre = -1;
    for (int i = 0; i < AUTH_MAX_SESIONES; i++) {
        if (!s_ses[i].usada || caducada(&s_ses[i])) { libre = i; break; }
    }
    if (libre < 0) {
        libre = 0;
        for (int i = 1; i < AUTH_MAX_SESIONES; i++)
            if (s_ses[i].ultimo_uso < s_ses[libre].ultimo_uso) libre = i;
    }
    sesion_t *s = &s_ses[libre];
    memset(s, 0, sizeof(*s));
    generar_token(s->token);
    s->usuario_id = u->id;
    strncpy(s->usuario, u->usuario, sizeof(s->usuario) - 1);
    strncpy(s->nombre, u->nombre, sizeof(s->nombre) - 1);
    s->rol = u->rol;
    s->ultimo_uso = esp_timer_get_time();
    s->usada = true;
    ESP_LOGI(TAG, "sesion iniciada: %s (%s)", u->usuario, u->rol == ROL_ADMIN ? "admin" : "operador");
    return s;
}

void auth_cerrar_sesion(const char *token)
{
    if (!token) return;
    for (int i = 0; i < AUTH_MAX_SESIONES; i++)
        if (s_ses[i].usada && strcmp(s_ses[i].token, token) == 0) {
            ESP_LOGI(TAG, "sesion cerrada: %s", s_ses[i].usuario);
            memset(&s_ses[i], 0, sizeof(sesion_t));
        }
}

/* Extrae el valor de la cookie "sesion" de la peticion. */
static bool token_de_peticion(httpd_req_t *req, char *out, size_t n)
{
    char cookie[256];
    if (httpd_req_get_hdr_value_str(req, "Cookie", cookie, sizeof(cookie)) != ESP_OK) return false;
    char *p = strstr(cookie, "sesion=");
    if (!p) return false;
    p += 7;
    size_t i = 0;
    while (*p && *p != ';' && *p != ' ' && i < n - 1) out[i++] = *p++;
    out[i] = 0;
    return i > 0;
}

sesion_t *auth_sesion_de(httpd_req_t *req)
{
    char token[AUTH_LARGO_TOKEN];
    if (!token_de_peticion(req, token, sizeof(token))) return NULL;
    for (int i = 0; i < AUTH_MAX_SESIONES; i++) {
        if (s_ses[i].usada && strcmp(s_ses[i].token, token) == 0) {
            if (caducada(&s_ses[i])) {
                ESP_LOGI(TAG, "sesion caducada: %s", s_ses[i].usuario);
                memset(&s_ses[i], 0, sizeof(sesion_t));
                return NULL;
            }
            s_ses[i].ultimo_uso = esp_timer_get_time();   /* renovar */
            return &s_ses[i];
        }
    }
    return NULL;
}

sesion_t *auth_exigir(httpd_req_t *req, bool solo_admin)
{
    sesion_t *s = auth_sesion_de(req);
    if (!s) {
        httpd_resp_set_status(req, "401 Unauthorized");
        httpd_resp_set_type(req, "application/json");
        httpd_resp_sendstr(req, "{\"ok\":false,\"error\":\"Debe iniciar sesion\",\"login\":true}");
        return NULL;
    }
    if (solo_admin && s->rol != ROL_ADMIN) {
        httpd_resp_set_status(req, "403 Forbidden");
        httpd_resp_set_type(req, "application/json");
        httpd_resp_sendstr(req, "{\"ok\":false,\"error\":\"Requiere permisos de administrador\"}");
        return NULL;
    }
    return s;
}

void auth_cerrar_sesiones_de(uint32_t usuario_id)
{
    for (int i = 0; i < AUTH_MAX_SESIONES; i++)
        if (s_ses[i].usada && s_ses[i].usuario_id == usuario_id) {
            ESP_LOGI(TAG, "sesion revocada: %s", s_ses[i].usuario);
            memset(&s_ses[i], 0, sizeof(sesion_t));
        }
}

int auth_sesiones_activas(void)
{
    int n = 0;
    for (int i = 0; i < AUTH_MAX_SESIONES; i++)
        if (s_ses[i].usada && !caducada(&s_ses[i])) n++;
    return n;
}
