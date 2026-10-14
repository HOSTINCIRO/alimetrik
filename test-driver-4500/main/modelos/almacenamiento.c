/* ALIMETRIK - MODELO / implementacion del almacenamiento persistente. */
#include "almacenamiento.h"
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include "esp_log.h"
#include "esp_timer.h"
#include "esp_vfs_fat.h"
#include "wear_levelling.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "ALMACEN";
static wl_handle_t s_wl = WL_INVALID_HANDLE;
static SemaphoreHandle_t s_mtx = NULL;

void alm_lock(void)   { if (s_mtx) xSemaphoreTakeRecursive(s_mtx, portMAX_DELAY); }
void alm_unlock(void) { if (s_mtx) xSemaphoreGiveRecursive(s_mtx); }

bool alm_montar(void)
{
    if (!s_mtx) s_mtx = xSemaphoreCreateRecursiveMutex();
    esp_vfs_fat_mount_config_t cfg = {
        .format_if_mount_failed = true,
        .max_files = 8,
        .allocation_unit_size = 4096,
    };
    esp_err_t r = esp_vfs_fat_spiflash_mount_rw_wl(ALM_BASE, "almacen", &cfg, &s_wl);
    if (r != ESP_OK) {
        ESP_LOGE(TAG, "no se pudo montar la memoria de datos: %s", esp_err_to_name(r));
        return false;
    }
    size_t tot = 0, lib = 0;
    alm_espacio(&tot, &lib);
    ESP_LOGI(TAG, "memoria de datos lista: %u KB libres de %u KB",
             (unsigned)(lib / 1024), (unsigned)(tot / 1024));
    return true;
}

void alm_espacio(size_t *total, size_t *libre)
{
    uint64_t t = 0, l = 0;
    esp_vfs_fat_info(ALM_BASE, &t, &l);
    if (total) *total = (size_t)t;
    if (libre) *libre = (size_t)l;
}

/* Escritura ATOMICA: se escribe primero un archivo temporal y solo cuando
 * esta completo se reemplaza el definitivo. Abrir el definitivo con "wb"
 * lo VACIA de inmediato: si la escritura fallaba a la mitad (memoria llena,
 * corte de energia) se perdian TODOS los datos de esa tabla. */
bool alm_guardar_tabla(const char *ruta, const void *datos, size_t elem, int n)
{
    int64_t t0 = esp_timer_get_time();
    char tmp[64];
    snprintf(tmp, sizeof(tmp), "%s.tmp", ruta);

    FILE *f = fopen(tmp, "wb");
    if (!f) { ESP_LOGE(TAG, "GUARDADO FALLO: no se pudo crear %s (errno %d)", tmp, errno); return false; }
    bool ok = (fwrite(&n, sizeof(int), 1, f) == 1);
    if (ok && n > 0) ok = ((int)fwrite(datos, elem, n, f) == n);
    if (!ok) ESP_LOGE(TAG, "GUARDADO FALLO: escribiendo %s (memoria llena? errno %d)", tmp, errno);
    if (fflush(f) != 0) { ok = false; ESP_LOGE(TAG, "GUARDADO FALLO: fflush %s", tmp); }
    if (fclose(f) != 0) { ok = false; ESP_LOGE(TAG, "GUARDADO FALLO: fclose %s", tmp); }

    if (!ok) { remove(tmp); return false; }        /* el archivo bueno sigue intacto */

    remove(ruta);                                   /* FATFS: rename no reemplaza */
    if (rename(tmp, ruta) != 0) {
        ESP_LOGE(TAG, "GUARDADO FALLO: no se pudo reemplazar %s (errno %d)", ruta, errno);
        remove(tmp);
        return false;
    }
    ESP_LOGI(TAG, "tabla %s guardada (%d reg) en %lld ms", ruta, n,
             (esp_timer_get_time() - t0) / 1000);
    return true;
}

bool alm_anexar(const char *ruta, const void *datos, size_t elem, int n_total)
{
    int64_t t0 = esp_timer_get_time();
    FILE *f = fopen(ruta, "r+b");
    if (!f) return false;                       /* no existe: guardado completo */
    int en_disco = 0;
    if (fread(&en_disco, sizeof(int), 1, f) != 1 || en_disco != n_total - 1) {
        fclose(f); return false;                /* desincronizado: guardado completo */
    }
    bool ok = true;
    fseek(f, 0, SEEK_SET);
    ok &= (fwrite(&n_total, sizeof(int), 1, f) == 1);
    fseek(f, sizeof(int) + (long)(n_total - 1) * elem, SEEK_SET);
    ok &= (fwrite((const char *)datos + (size_t)(n_total - 1) * elem, elem, 1, f) == 1);
    if (fclose(f) != 0) ok = false;
    if (!ok) { ESP_LOGE(TAG, "GUARDADO FALLO al anexar en %s (errno %d)", ruta, errno); return false; }
    ESP_LOGI(TAG, "anexado #%d en %s (%lld ms)", n_total, ruta,
             (esp_timer_get_time() - t0) / 1000);
    return true;
}

int alm_cargar_tabla(const char *ruta, void *datos, size_t elem, int maxn)
{
    FILE *f = fopen(ruta, "rb");
    if (!f) return 0;
    int n = 0;
    if (fread(&n, sizeof(int), 1, f) != 1) { fclose(f); return 0; }
    if (n < 0) n = 0;
    if (n > maxn) n = maxn;
    if (n > 0) {
        size_t leidos = fread(datos, elem, n, f);
        if ((int)leidos != n) n = (int)leidos;
    }
    fclose(f);
    return n;
}
