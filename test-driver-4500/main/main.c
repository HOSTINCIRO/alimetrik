/* =====================================================================
 * ALIMETRIK - Sistema de comedor escolar con huella dactilar
 * ---------------------------------------------------------------------
 * Punto de entrada. Arranca las tres capas de la arquitectura MVC:
 *
 *   MODELOS ....... datos y reglas de negocio  (main/modelos/)
 *   VISTAS ........ lo que ve el usuario       (main/vistas/)
 *   CONTROLADORES . coordinan modelo y vista   (main/controladores/)
 *
 * Hardware: ESP32-P4 (Guition) + lector DigitalPersona U.are.U 4500.
 * ===================================================================== */
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_heap_caps.h"

#include "modelos/almacenamiento.h"
#include "modelos/modelo_usuario.h"
#include "modelos/modelo_estudiante.h"
#include "modelos/modelo_biometrico.h"
#include "modelos/modelo_registro.h"
#include "modelos/modelo_servicio.h"

#include "controladores/controlador_lector.h"
#include "controladores/controlador_red.h"
#include "controladores/controlador_web.h"

static const char *TAG = "ALIMETRIK";

#define RED_NOMBRE   "ALIMETRIK"
#define RED_CLAVE    NULL      /* NULL = red abierta; o una clave de 8+ caracteres */

/* Mantenimiento puntual: poner en 1, grabar una vez, volver a 0 y regrabar. */
#define BORRAR_HUELLAS_Y_REGISTROS   0
#define BORRAR_ALUMNOS_DE_PRUEBA     0
#define REINICIAR_TODOS_LOS_DATOS    0   /* borra alumnos, huellas y registros */
#define PRUEBA_GUARDADO_MASIVO       0   /* N altas seguidas para diagnosticar reinicios */

void app_main(void)
{
    ESP_LOGI(TAG, "==================================================");
    ESP_LOGI(TAG, " ALIMETRIK - comedor escolar con huella dactilar");
    ESP_LOGI(TAG, "==================================================");

    /* ---------- 1. MODELO: memoria permanente y tablas ---------- */
    if (!alm_montar()) {
        ESP_LOGE(TAG, "sin memoria de datos: el sistema no puede operar");
        return;
    }
    usr_cargar();      /* usuarios del sistema (crea 'admin' la primera vez) */
    est_cargar();      /* estudiantes */
    bio_cargar();      /* plantillas biometricas */
    reg_cargar();      /* bitacora de entregas */
    srv_cargar();      /* servicios y sus horarios (configurables) */

#if BORRAR_HUELLAS_Y_REGISTROS
    bio_borrar_todo();
    reg_borrar_todo();
#endif
#if BORRAR_ALUMNOS_DE_PRUEBA
    est_borrar_pruebas();
#endif
#if REINICIAR_TODOS_LOS_DATOS
    ESP_LOGW(TAG, "*** REINICIO DE DATOS SOLICITADO ***");
    bio_borrar_todo();
    reg_borrar_todo();
    est_borrar_todos();
    ESP_LOGW(TAG, "*** SISTEMA EN BLANCO: listo para operacion real ***");
#endif

    ESP_LOGI(TAG, "datos cargados: %d alumnos, %d huellas, %d registros, %d usuarios",
             est_cantidad(), bio_cantidad(), reg_cantidad(), usr_cantidad());
    if (usr_clave_por_defecto())
        ESP_LOGW(TAG, "ATENCION: el usuario 'admin' conserva la clave de fabrica; cambiela");

    /* ---------- 2. CONTROLADOR: lector de huellas ---------- */
    if (!lector_iniciar())
        ESP_LOGE(TAG, "el lector de huellas no pudo iniciarse");

    /* ---------- 3. CONTROLADOR: red propia y servidor web ---------- */
    if (red_iniciar_wifi(RED_NOMBRE, RED_CLAVE)) {
        red_iniciar_dns();
        web_iniciar();
        vTaskDelay(pdMS_TO_TICKS(300));
        web_autoprueba();
        ESP_LOGI(TAG, "listo: conectese a la red WiFi '%s' y abra http://192.168.4.1",
                 RED_NOMBRE);
    } else {
        ESP_LOGE(TAG, "sin WiFi: el sistema funciona, pero no habra portal web");
    }

#if PRUEBA_GUARDADO_MASIVO
    /* Reproduce "guardar una cantidad de datos": N altas seguidas con el
     * lector armado y la red activa, vigilando memoria y estabilidad. */
    vTaskDelay(pdMS_TO_TICKS(8000));
    ESP_LOGW(TAG, "*** PRUEBA: %d altas seguidas (carga masiva) ***", PRUEBA_GUARDADO_MASIVO);
    int ok = 0, mal = 0;
    for (int i = 0; i < PRUEBA_GUARDADO_MASIVO; i++) {
        char doc[24], nom[24];
        snprintf(doc, sizeof(doc), "TEST%05d", i);
        snprintf(nom, sizeof(nom), "Prueba %d", i);
        uint32_t id = est_crear(doc, nom, "Masiva", "11-X", true,
                                "Acudiente Prueba", "TESTDOC", "2026-08-27");
        if (id) ok++; else mal++;
        ESP_LOGI(TAG, "  alta %2d/%d -> id %u | heap %u KB (interna %u KB)",
                 i + 1, PRUEBA_GUARDADO_MASIVO, (unsigned)id,
                 (unsigned)(esp_get_free_heap_size() / 1024),
                 (unsigned)(heap_caps_get_free_size(MALLOC_CAP_INTERNAL) / 1024));
    }
    ESP_LOGW(TAG, "*** PRUEBA TERMINADA: %d OK, %d fallidas | alumnos ahora: %d ***",
             ok, mal, est_cantidad());
#endif
}
