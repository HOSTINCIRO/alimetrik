/* ALIMETRIK - MODELO / Registros: implementacion. */
#include "modelo_registro.h"
#include "almacenamiento.h"
#include "modelo_servicio.h"
#include <string.h>
#include "esp_log.h"
#include "esp_heap_caps.h"

static const char *TAG = "MOD_REG";
#define F_REG   ALM_BASE "/registro.dat"

static registro_t *s_reg = NULL;
static int s_n = 0;
static uint32_t s_next_id = 1;

static void copiar(char *dst, const char *src, size_t n)
{
    strncpy(dst, src ? src : "", n - 1); dst[n - 1] = 0;
}

void reg_cargar(void)
{
    if (!s_reg) s_reg = heap_caps_calloc(REG_MAX, sizeof(registro_t), MALLOC_CAP_SPIRAM);
    if (!s_reg) { ESP_LOGE(TAG, "sin memoria para la bitacora"); return; }
    s_n = alm_cargar_tabla(F_REG, s_reg, sizeof(registro_t), REG_MAX);
    s_next_id = 1;
    for (int i = 0; i < s_n; i++) if (s_reg[i].id >= s_next_id) s_next_id = s_reg[i].id + 1;
    ESP_LOGI(TAG, "%d registros de entrega cargados", s_n);
}

int reg_cantidad(void) { return s_n; }

const registro_t *reg_por_indice(int i)
{
    int idx = s_n - 1 - i;                 /* 0 = el mas reciente */
    return (idx >= 0 && idx < s_n) ? &s_reg[idx] : NULL;
}

uint32_t reg_crear(uint32_t estudiante_id, const char *servicio, const char *resultado,
                   int score, const char *fecha, const char *hora)
{
    alm_lock();
    bool roto = false;
    if (s_n >= REG_MAX) {
        /* Al llenarse se descarta un BLOQUE de los mas antiguos, no uno solo:
         * descartando de a uno, cada registro posterior obligaba a reescribir
         * la tabla entera (2000 registros) y el equipo se volvia lentisimo. */
        int descartar = REG_MAX / 10;               /* 10% = 200 registros */
        memmove(&s_reg[0], &s_reg[descartar], sizeof(registro_t) * (REG_MAX - descartar));
        s_n = REG_MAX - descartar;
        roto = true;
        ESP_LOGW(TAG, "bitacora llena: se descartaron los %d registros mas antiguos", descartar);
    }
    registro_t *r = &s_reg[s_n++];
    memset(r, 0, sizeof(*r));
    r->id = s_next_id++;
    r->estudiante_id = estudiante_id;
    copiar(r->servicio, servicio, sizeof(r->servicio));
    copiar(r->resultado, resultado, sizeof(r->resultado));
    r->score = score;
    copiar(r->fecha, fecha, sizeof(r->fecha));
    copiar(r->hora, hora, sizeof(r->hora));
    bool ok = roto ? false : alm_anexar(F_REG, s_reg, sizeof(registro_t), s_n);
    if (!ok) alm_guardar_tabla(F_REG, s_reg, sizeof(registro_t), s_n);
    uint32_t id = r->id;
    alm_unlock();
    return id;
}

bool reg_ya_entregado(uint32_t estudiante_id, const char *servicio, const char *fecha)
{
    if (!estudiante_id) return false;
    alm_lock();
    bool hay = false;
    for (int i = 0; i < s_n; i++) {
        if (s_reg[i].estudiante_id == estudiante_id &&
            strcmp(s_reg[i].resultado, "permitido") == 0 &&
            strcmp(s_reg[i].servicio, servicio) == 0 &&
            strcmp(s_reg[i].fecha, fecha) == 0) { hay = true; break; }
    }
    alm_unlock();
    return hay;
}

/* Un servicio es "real" si corresponde a una franja configurada; fuera de
 * ellas no hay racion que entregar. La lista la define el modelo de servicios. */
bool reg_hay_servicio(const char *servicio)
{
    return srv_es_real(servicio);
}

void reg_borrar_todo(void)
{
    alm_lock();
    s_n = 0;
    alm_guardar_tabla(F_REG, s_reg, sizeof(registro_t), s_n);
    alm_unlock();
    ESP_LOGW(TAG, "bitacora de entregas borrada");
}
