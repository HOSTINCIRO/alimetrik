/* ALIMETRIK - MODELO / Estudiantes: implementacion. */
#include "modelo_estudiante.h"
#include "almacenamiento.h"
#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "esp_heap_caps.h"

static const char *TAG = "MOD_EST";
#define F_EST      ALM_BASE "/estudian.dat"
#define F_EST_V1   ALM_BASE "/estud.dat"     /* formato anterior, para migrar */
#define F_SEC      ALM_BASE "/secuenc.dat"   /* ultimo id entregado (nunca retrocede) */

static estudiante_t *s_est = NULL;
static int s_n = 0;
static uint32_t s_next_id = 1;

/* Formato anterior (sin campos de autorizacion), solo para migracion. */
typedef struct {
    uint32_t id; char documento[24]; char nombre[40]; char apellido[40];
    char grado[12]; uint8_t activo; uint32_t creado;
} estudiante_v1_t;

static void copiar(char *dst, const char *src, size_t n)
{
    strncpy(dst, src ? src : "", n - 1); dst[n - 1] = 0;
}

static void migrar_v1(void)
{
    estudiante_v1_t *viejos = heap_caps_calloc(EST_MAX, sizeof(estudiante_v1_t), MALLOC_CAP_SPIRAM);
    if (!viejos) return;
    int n = alm_cargar_tabla(F_EST_V1, viejos, sizeof(estudiante_v1_t), EST_MAX);
    if (n > 0) {
        for (int i = 0; i < n; i++) {
            memset(&s_est[i], 0, sizeof(estudiante_t));
            s_est[i].id = viejos[i].id;
            copiar(s_est[i].documento, viejos[i].documento, sizeof(s_est[i].documento));
            copiar(s_est[i].nombre, viejos[i].nombre, sizeof(s_est[i].nombre));
            copiar(s_est[i].apellido, viejos[i].apellido, sizeof(s_est[i].apellido));
            copiar(s_est[i].grado, viejos[i].grado, sizeof(s_est[i].grado));
            s_est[i].activo = viejos[i].activo;
            s_est[i].creado = viejos[i].creado;
            /* los registros anteriores a la version con consentimiento quedan
             * marcados como autorizados por migracion, con constancia */
            s_est[i].autorizacion = 1;
            copiar(s_est[i].acudiente, "(migrado de version anterior)", sizeof(s_est[i].acudiente));
        }
        s_n = n;
        alm_guardar_tabla(F_EST, s_est, sizeof(estudiante_t), s_n);
        ESP_LOGW(TAG, "migrados %d estudiantes del formato anterior", n);
    }
    /* El archivo antiguo se elimina SIEMPRE tras el intento de migracion: si
     * se conservara, cada vez que la tabla quedara vacia (por un borrado
     * deliberado) la migracion volveria a resucitar los datos eliminados. */
    remove(F_EST_V1);
    free(viejos);
}

/* El contador de ids se guarda aparte: si se reconstruyera solo a partir de
 * la tabla, borrar al ultimo alumno haria que su id se reasignara a otro y
 * los registros historicos quedarian atribuidos a la persona equivocada. */
static void secuencia_guardar(void)
{
    FILE *f = fopen(F_SEC, "wb");
    if (f) { fwrite(&s_next_id, sizeof(uint32_t), 1, f); fclose(f); }
}

static void secuencia_cargar(void)
{
    uint32_t guardado = 0;
    FILE *f = fopen(F_SEC, "rb");
    if (f) { if (fread(&guardado, sizeof(uint32_t), 1, f) != 1) guardado = 0; fclose(f); }
    if (guardado > s_next_id) s_next_id = guardado;   /* nunca retroceder */
}

void est_cargar(void)
{
    if (!s_est) s_est = heap_caps_calloc(EST_MAX, sizeof(estudiante_t), MALLOC_CAP_SPIRAM);
    if (!s_est) { ESP_LOGE(TAG, "sin memoria para la tabla de estudiantes"); return; }
    s_n = alm_cargar_tabla(F_EST, s_est, sizeof(estudiante_t), EST_MAX);
    if (s_n == 0) migrar_v1();
    s_next_id = 1;
    for (int i = 0; i < s_n; i++) if (s_est[i].id >= s_next_id) s_next_id = s_est[i].id + 1;
    secuencia_cargar();
    ESP_LOGI(TAG, "%d estudiantes cargados (proximo id: %lu)", s_n, (unsigned long)s_next_id);
}

int est_cantidad(void) { return s_n; }

const estudiante_t *est_por_indice(int i) { return (i >= 0 && i < s_n) ? &s_est[i] : NULL; }

estudiante_t *est_por_id(uint32_t id)
{
    for (int i = 0; i < s_n; i++) if (s_est[i].id == id) return &s_est[i];
    return NULL;
}

estudiante_t *est_por_documento(const char *doc)
{
    if (!doc || !doc[0]) return NULL;
    for (int i = 0; i < s_n; i++) if (strcmp(s_est[i].documento, doc) == 0) return &s_est[i];
    return NULL;
}

bool est_guardar_todo(void)
{
    return alm_guardar_tabla(F_EST, s_est, sizeof(estudiante_t), s_n);
}

uint32_t est_crear(const char *documento, const char *nombre, const char *apellido,
                   const char *grado, bool autorizacion, const char *acudiente,
                   const char *doc_acudiente, const char *fecha)
{
    /* La ley exige autorizacion previa y explicita para datos biometricos:
     * sin ella NO se crea la ficha. */
    if (!autorizacion) {
        ESP_LOGW(TAG, "alta rechazada: falta la autorizacion de tratamiento de datos");
        return 0;
    }
    alm_lock();
    if (s_n >= EST_MAX) { alm_unlock(); return 0; }
    if (est_por_documento(documento)) {   /* documento repetido */
        alm_unlock();
        ESP_LOGW(TAG, "alta rechazada: el documento %s ya existe", documento);
        return 0;
    }
    estudiante_t *e = &s_est[s_n++];
    memset(e, 0, sizeof(*e));
    e->id = s_next_id++;
    copiar(e->documento, documento, sizeof(e->documento));
    copiar(e->nombre, nombre, sizeof(e->nombre));
    copiar(e->apellido, apellido, sizeof(e->apellido));
    copiar(e->grado, grado, sizeof(e->grado));
    e->activo = 1;
    e->creado = e->id;
    e->autorizacion = 1;
    copiar(e->acudiente, acudiente, sizeof(e->acudiente));
    copiar(e->doc_acudiente, doc_acudiente, sizeof(e->doc_acudiente));
    copiar(e->fecha_autoriza, fecha, sizeof(e->fecha_autoriza));

    /* anexar es ~5x mas rapido que reescribir la tabla (escribir en flash
     * congela el firmware); si falla, se intenta el guardado completo */
    bool ok = alm_anexar(F_EST, s_est, sizeof(estudiante_t), s_n);
    if (!ok) ok = est_guardar_todo();
    if (ok) secuencia_guardar();
    if (!ok) {                      /* la memoria no acepto: deshacer el alta */
        s_n--; s_next_id--;
        alm_unlock();
        ESP_LOGE(TAG, "ALTA CANCELADA: la memoria no acepto el guardado");
        return 0;
    }
    uint32_t id = e->id;
    alm_unlock();
    return id;
}

bool est_actualizar(uint32_t id, const char *documento, const char *nombre,
                    const char *apellido, const char *grado, bool activo)
{
    alm_lock();
    estudiante_t *e = est_por_id(id);
    if (!e) { alm_unlock(); return false; }
    copiar(e->documento, documento, sizeof(e->documento));
    copiar(e->nombre, nombre, sizeof(e->nombre));
    copiar(e->apellido, apellido, sizeof(e->apellido));
    copiar(e->grado, grado, sizeof(e->grado));
    e->activo = activo ? 1 : 0;
    bool ok = est_guardar_todo();
    alm_unlock();
    return ok;
}

bool est_borrar(uint32_t id)
{
    alm_lock();
    int idx = -1;
    for (int i = 0; i < s_n; i++) if (s_est[i].id == id) { idx = i; break; }
    if (idx < 0) { alm_unlock(); return false; }
    for (int i = idx; i < s_n - 1; i++) s_est[i] = s_est[i + 1];
    s_n--;
    bool ok = est_guardar_todo();
    alm_unlock();
    return ok;
}

bool est_revocar_autorizacion(uint32_t id)
{
    alm_lock();
    estudiante_t *e = est_por_id(id);
    if (!e) { alm_unlock(); return false; }
    e->autorizacion = 0;
    e->activo = 0;
    bool ok = est_guardar_todo();
    alm_unlock();
    ESP_LOGW(TAG, "autorizacion REVOCADA para el estudiante %lu", (unsigned long)id);
    return ok;
}

int est_borrar_todos(void)
{
    alm_lock();
    int n = s_n;
    s_n = 0;
    s_next_id = 1;
    est_guardar_todo();
    secuencia_guardar();
    remove(F_EST_V1);      /* que no reaparezcan desde el formato antiguo */
    alm_unlock();
    ESP_LOGW(TAG, "REINICIO DE DATOS: %d estudiantes eliminados", n);
    return n;
}

int est_borrar_pruebas(void)
{
    alm_lock();
    int borrados = 0, w = 0;
    for (int i = 0; i < s_n; i++) {
        if (strncmp(s_est[i].documento, "TEST", 4) == 0) borrados++;
        else s_est[w++] = s_est[i];
    }
    s_n = w;
    if (borrados) est_guardar_todo();
    alm_unlock();
    if (borrados) ESP_LOGW(TAG, "%d estudiantes de prueba borrados, quedan %d", borrados, s_n);
    return borrados;
}
