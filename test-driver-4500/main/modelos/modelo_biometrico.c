/* ALIMETRIK - MODELO / Biometria: implementacion. */
#include "modelo_biometrico.h"
#include "almacenamiento.h"
#include <string.h>
#include "esp_log.h"
#include "esp_heap_caps.h"
#include "esp_timer.h"

static const char *TAG = "MOD_BIO";
#define F_BIO   ALM_BASE "/huellas.dat"

static huella_t *s_hue = NULL;
static int s_n = 0;

void bio_cargar(void)
{
    if (!s_hue) s_hue = heap_caps_calloc(BIO_MAX_HUELLAS, sizeof(huella_t), MALLOC_CAP_SPIRAM);
    if (!s_hue) { ESP_LOGE(TAG, "sin memoria para la tabla biometrica"); return; }
    s_n = alm_cargar_tabla(F_BIO, s_hue, sizeof(huella_t), BIO_MAX_HUELLAS);
    ESP_LOGI(TAG, "%d plantillas biometricas cargadas", s_n);
}

int bio_cantidad(void) { return s_n; }

int bio_cantidad_de(uint32_t id)
{
    int n = 0;
    for (int i = 0; i < s_n; i++) if (s_hue[i].estudiante_id == id) n++;
    return n;
}

bool bio_guardar_todo(void)
{
    return alm_guardar_tabla(F_BIO, s_hue, sizeof(huella_t), s_n);
}

bool bio_agregar(uint32_t estudiante_id, const char *dedo, const fp_template_t *t)
{
    alm_lock();
    estudiante_t *e = est_por_id(estudiante_id);
    if (!e) { alm_unlock(); return false; }
    /* sin autorizacion vigente NO se pueden tratar datos biometricos */
    if (!e->autorizacion) {
        alm_unlock();
        ESP_LOGW(TAG, "enrolamiento rechazado: %s no tiene autorizacion vigente", e->nombre);
        return false;
    }
    if (s_n >= BIO_MAX_HUELLAS) { alm_unlock(); return false; }
    huella_t *h = &s_hue[s_n++];
    memset(h, 0, sizeof(*h));
    h->estudiante_id = estudiante_id;
    strncpy(h->dedo, dedo ? dedo : "principal", sizeof(h->dedo) - 1);
    h->plantilla = *t;
    bool ok = alm_anexar(F_BIO, s_hue, sizeof(huella_t), s_n);
    if (!ok) ok = bio_guardar_todo();
    if (!ok) { s_n--; ESP_LOGE(TAG, "no se pudo guardar la plantilla"); }
    alm_unlock();
    return ok;
}

identificacion_t bio_identificar(const fp_template_t *t)
{
    identificacion_t res = {0};
    int mejor = 0;
    uint32_t mejor_est = 0;
    int64_t t0 = esp_timer_get_time();
    alm_lock();
    for (int i = 0; i < s_n; i++) {
        int sc = fp_comparar(t, &s_hue[i].plantilla);
        if (sc > mejor) { mejor = sc; mejor_est = s_hue[i].estudiante_id; }
    }
    res.score = mejor;
    if (mejor >= FP_MATCH_THRESHOLD && mejor_est) {
        estudiante_t *e = est_por_id(mejor_est);
        if (e) { res.encontrado = true; res.estudiante = *e; }
    }
    alm_unlock();
    ESP_LOGD(TAG, "identificacion contra %d plantillas en %lld ms (score %d)",
             s_n, (esp_timer_get_time() - t0) / 1000, mejor);
    return res;
}

int bio_borrar_de(uint32_t estudiante_id)
{
    alm_lock();
    int w = 0, borradas = 0;
    for (int i = 0; i < s_n; i++) {
        if (s_hue[i].estudiante_id == estudiante_id) borradas++;
        else s_hue[w++] = s_hue[i];
    }
    s_n = w;
    alm_unlock();
    /* La escritura se hace FUERA del cerrojo: reescribir la tabla completa
     * puede suponer megabytes y varios segundos; con el cerrojo tomado
     * bloquearia al lector y al portal todo ese tiempo. La tabla en memoria
     * ya quedo coherente arriba. */
    if (borradas) bio_guardar_todo();
    return borradas;
}

void bio_borrar_todo(void)
{
    alm_lock();
    s_n = 0;
    bio_guardar_todo();
    alm_unlock();
    ESP_LOGW(TAG, "TODAS las plantillas biometricas fueron suprimidas");
}
