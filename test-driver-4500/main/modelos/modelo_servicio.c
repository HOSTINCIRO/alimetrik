/* ALIMETRIK - MODELO / Servicios del comedor: implementacion. */
#include "modelo_servicio.h"
#include "almacenamiento.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "esp_log.h"

static const char *TAG = "MOD_SRV";
#define F_SRV   ALM_BASE "/servicio.dat"

static servicio_t s_srv[SRV_MAX];
static int s_n = 0;
static uint32_t s_next_id = 1;

static bool guardar(void)
{
    return alm_guardar_tabla(F_SRV, s_srv, sizeof(servicio_t), s_n);
}

int srv_texto_a_minutos(const char *hhmm)
{
    if (!hhmm) return -1;
    int h = 0, m = 0;
    if (sscanf(hhmm, "%d:%d", &h, &m) != 2) return -1;
    if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
    return h * 60 + m;
}

void srv_minutos_a_texto(int minutos, char *destino)
{
    if (minutos < 0) minutos = 0;
    if (minutos > 24 * 60) minutos = 24 * 60;
    int h = minutos / 60, m = minutos % 60;
    destino[0] = '0' + (h / 10); destino[1] = '0' + (h % 10);
    destino[2] = ':';
    destino[3] = '0' + (m / 10); destino[4] = '0' + (m % 10);
    destino[5] = 0;
}

void srv_restaurar_por_defecto(void)
{
    alm_lock();
    s_n = 0;
    s_next_id = 1;
    struct { const char *n; int i, f; } base[] = {
        { "Desayuno",   6 * 60,      10 * 60 },
        { "Almuerzo",  11 * 60,      14 * 60 + 30 },
        { "Refrigerio",14 * 60 + 30, 17 * 60 },
    };
    for (int k = 0; k < 3; k++) {
        servicio_t *s = &s_srv[s_n++];
        memset(s, 0, sizeof(*s));
        s->id = s_next_id++;
        strncpy(s->nombre, base[k].n, sizeof(s->nombre) - 1);
        s->inicio = base[k].i;
        s->fin    = base[k].f;
        s->activo = 1;
    }
    guardar();
    alm_unlock();
    ESP_LOGI(TAG, "servicios restaurados a los valores habituales");
}

void srv_cargar(void)
{
    s_n = alm_cargar_tabla(F_SRV, s_srv, sizeof(servicio_t), SRV_MAX);
    s_next_id = 1;
    for (int i = 0; i < s_n; i++) if (s_srv[i].id >= s_next_id) s_next_id = s_srv[i].id + 1;
    if (s_n == 0) srv_restaurar_por_defecto();
    for (int i = 0; i < s_n; i++) {
        char a[6], b[6];
        srv_minutos_a_texto(s_srv[i].inicio, a);
        srv_minutos_a_texto(s_srv[i].fin, b);
        ESP_LOGI(TAG, "  servicio '%s': %s a %s%s", s_srv[i].nombre, a, b,
                 s_srv[i].activo ? "" : "  (suspendido)");
    }
}

int srv_cantidad(void) { return s_n; }
const servicio_t *srv_por_indice(int i) { return (i >= 0 && i < s_n) ? &s_srv[i] : NULL; }

servicio_t *srv_por_id(uint32_t id)
{
    for (int i = 0; i < s_n; i++) if (s_srv[i].id == id) return &s_srv[i];
    return NULL;
}

void srv_en_minuto(int minuto, char *destino, size_t n)
{
    if (!destino || n == 0) return;
    alm_lock();                       /* la tabla puede cambiar desde el portal */
    const char *r = SRV_SIN_SERVICIO;
    for (int i = 0; i < s_n; i++) {
        if (!s_srv[i].activo) continue;
        int ini = s_srv[i].inicio, fin = s_srv[i].fin;
        bool dentro = (fin > ini) ? (minuto >= ini && minuto < fin)
                                  : (minuto >= ini || minuto < fin);  /* cruza medianoche */
        if (dentro) { r = s_srv[i].nombre; break; }
    }
    strlcpy(destino, r, n);           /* se copia BAJO cerrojo */
    alm_unlock();
}

bool srv_es_real(const char *nombre)
{
    if (!nombre) return false;
    return strcmp(nombre, SRV_SIN_SERVICIO) != 0 && strcmp(nombre, SRV_SIN_HORA) != 0;
}

/* ¿la franja [ini,fin) se cruza con la de otro servicio activo? */
static bool se_solapa(uint32_t id_propio, int ini, int fin)
{
    for (int i = 0; i < s_n; i++) {
        if (s_srv[i].id == id_propio || !s_srv[i].activo) continue;
        if (ini < s_srv[i].fin && s_srv[i].inicio < fin) return true;
    }
    return false;
}

uint32_t srv_crear(const char *nombre, int inicio, int fin)
{
    if (!nombre || !nombre[0] || inicio < 0 || fin < 0 || inicio >= fin) return 0;
    alm_lock();
    if (s_n >= SRV_MAX || se_solapa(0, inicio, fin)) { alm_unlock(); return 0; }
    servicio_t *s = &s_srv[s_n++];
    memset(s, 0, sizeof(*s));
    s->id = s_next_id++;
    strncpy(s->nombre, nombre, sizeof(s->nombre) - 1);
    s->inicio = (uint16_t)inicio;
    s->fin = (uint16_t)fin;
    s->activo = 1;
    if (!guardar()) { s_n--; alm_unlock(); return 0; }
    uint32_t id = s->id;
    alm_unlock();
    ESP_LOGI(TAG, "servicio creado: %s", nombre);
    return id;
}

bool srv_actualizar(uint32_t id, const char *nombre, int inicio, int fin, bool activo)
{
    if (inicio < 0 || fin < 0 || inicio >= fin) return false;
    alm_lock();
    servicio_t *s = srv_por_id(id);
    if (!s || (activo && se_solapa(id, inicio, fin))) { alm_unlock(); return false; }
    if (nombre && nombre[0]) strncpy(s->nombre, nombre, sizeof(s->nombre) - 1);
    s->inicio = (uint16_t)inicio;
    s->fin = (uint16_t)fin;
    s->activo = activo ? 1 : 0;
    bool ok = guardar();
    alm_unlock();
    if (ok) {
        char a[6], b[6];
        srv_minutos_a_texto(s->inicio, a);
        srv_minutos_a_texto(s->fin, b);
        ESP_LOGI(TAG, "servicio '%s' actualizado: %s a %s%s", s->nombre, a, b,
                 activo ? "" : " (suspendido)");
    }
    return ok;
}

bool srv_borrar(uint32_t id)
{
    alm_lock();
    int idx = -1;
    for (int i = 0; i < s_n; i++) if (s_srv[i].id == id) { idx = i; break; }
    if (idx < 0) { alm_unlock(); return false; }
    for (int i = idx; i < s_n - 1; i++) s_srv[i] = s_srv[i + 1];
    s_n--;
    bool ok = guardar();
    alm_unlock();
    return ok;
}
