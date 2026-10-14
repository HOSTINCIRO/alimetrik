/* ALIMETRIK - MODELO / Usuarios: implementacion. */
#include "modelo_usuario.h"
#include "almacenamiento.h"
#include <string.h>
#include "esp_log.h"
#include "esp_random.h"
#include "mbedtls/sha256.h"

static const char *TAG = "MOD_USR";
#define F_USR   ALM_BASE "/usuarios.dat"

static usuario_t s_usr[USR_MAX];
static int s_n = 0;
static uint32_t s_next_id = 1;

/* hash = SHA-256(sal || clave) */
static void calcular_hash(const uint8_t *sal, const char *clave, uint8_t *out)
{
    mbedtls_sha256_context ctx;
    mbedtls_sha256_init(&ctx);
    mbedtls_sha256_starts(&ctx, 0);
    mbedtls_sha256_update(&ctx, sal, USR_LARGO_SAL);
    mbedtls_sha256_update(&ctx, (const uint8_t *)clave, strlen(clave));
    mbedtls_sha256_finish(&ctx, out);
    mbedtls_sha256_free(&ctx);
}

/* Comparacion en tiempo constante: no revela informacion por el tiempo. */
static bool iguales(const uint8_t *a, const uint8_t *b, size_t n)
{
    uint8_t dif = 0;
    for (size_t i = 0; i < n; i++) dif |= a[i] ^ b[i];
    return dif == 0;
}

static bool guardar(void)
{
    return alm_guardar_tabla(F_USR, s_usr, sizeof(usuario_t), s_n);
}

void usr_cargar(void)
{
    s_n = alm_cargar_tabla(F_USR, s_usr, sizeof(usuario_t), USR_MAX);
    s_next_id = 1;
    for (int i = 0; i < s_n; i++) if (s_usr[i].id >= s_next_id) s_next_id = s_usr[i].id + 1;
    if (s_n == 0) {
        usr_crear("admin", "Administrador", "admin123", ROL_ADMIN);
        ESP_LOGW(TAG, "creado el usuario inicial 'admin' con clave 'admin123' - CAMBIELA");
    }
    ESP_LOGI(TAG, "%d usuarios del sistema cargados", s_n);
}

int usr_cantidad(void) { return s_n; }
const usuario_t *usr_por_indice(int i) { return (i >= 0 && i < s_n) ? &s_usr[i] : NULL; }

usuario_t *usr_por_nombre(const char *usuario)
{
    if (!usuario) return NULL;
    for (int i = 0; i < s_n; i++)
        if (strcasecmp(s_usr[i].usuario, usuario) == 0) return &s_usr[i];
    return NULL;
}

usuario_t *usr_verificar(const char *usuario, const char *clave)
{
    if (!usuario || !clave) return NULL;
    usuario_t *u = usr_por_nombre(usuario);
    if (!u || !u->activo) return NULL;
    uint8_t h[USR_LARGO_HASH];
    calcular_hash(u->sal, clave, h);
    if (!iguales(h, u->hash, USR_LARGO_HASH)) {
        ESP_LOGW(TAG, "intento de acceso fallido para el usuario '%s'", usuario);
        return NULL;
    }
    return u;
}

bool usr_crear(const char *usuario, const char *nombre, const char *clave, rol_t rol)
{
    if (!usuario || !clave || strlen(clave) < 4) return false;
    alm_lock();
    if (s_n >= USR_MAX || usr_por_nombre(usuario)) { alm_unlock(); return false; }
    usuario_t *u = &s_usr[s_n++];
    memset(u, 0, sizeof(*u));
    u->id = s_next_id++;
    strncpy(u->usuario, usuario, sizeof(u->usuario) - 1);
    strncpy(u->nombre, nombre ? nombre : usuario, sizeof(u->nombre) - 1);
    esp_fill_random(u->sal, USR_LARGO_SAL);      /* sal distinta por usuario */
    calcular_hash(u->sal, clave, u->hash);
    u->rol = (uint8_t)rol;
    u->activo = 1;
    u->creado = u->id;
    bool ok = guardar();
    if (!ok) s_n--;
    alm_unlock();
    return ok;
}

bool usr_cambiar_clave(const char *usuario, const char *clave_nueva)
{
    if (!clave_nueva || strlen(clave_nueva) < 4) return false;
    alm_lock();
    usuario_t *u = usr_por_nombre(usuario);
    if (!u) { alm_unlock(); return false; }
    esp_fill_random(u->sal, USR_LARGO_SAL);      /* sal nueva en cada cambio */
    calcular_hash(u->sal, clave_nueva, u->hash);
    bool ok = guardar();
    alm_unlock();
    ESP_LOGI(TAG, "clave actualizada para '%s'", usuario);
    return ok;
}

bool usr_borrar(uint32_t id)
{
    alm_lock();
    int idx = -1, admins = 0;
    for (int i = 0; i < s_n; i++) {
        if (s_usr[i].id == id) idx = i;
        if (s_usr[i].rol == ROL_ADMIN && s_usr[i].activo) admins++;
    }
    /* nunca dejar el sistema sin ningun administrador */
    if (idx < 0 || (s_usr[idx].rol == ROL_ADMIN && admins <= 1)) { alm_unlock(); return false; }
    for (int i = idx; i < s_n - 1; i++) s_usr[i] = s_usr[i + 1];
    s_n--;
    bool ok = guardar();
    alm_unlock();
    return ok;
}

bool usr_clave_por_defecto(void)
{
    /* comparacion directa, sin pasar por usr_verificar: esto es un chequeo
       informativo y no debe registrar "intento de acceso fallido" */
    usuario_t *u = usr_por_nombre("admin");
    if (!u || !u->activo) return false;
    uint8_t h[USR_LARGO_HASH];
    calcular_hash(u->sal, "admin123", h);
    return iguales(h, u->hash, USR_LARGO_HASH);
}
