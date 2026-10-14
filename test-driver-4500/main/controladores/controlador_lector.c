/* =====================================================================
 * ALIMETRIK - CONTROLADOR / Lector de huellas U.are.U 4500
 * ---------------------------------------------------------------------
 * Dialoga con el lector por USB: lo enciende, espera el dedo, captura y
 * descifra la imagen, y entrega el trabajo a la tarea que extrae las
 * minucias. Tambien decide que hacer con cada huella: enrolarla al
 * alumno indicado desde la web, o identificarla y registrar la entrega.
 *
 * Driver portado del proyecto libfprint (uru4000), perfil DP_URU4000B.
 * ===================================================================== */


#include <string.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "esp_log.h"
#include "esp_heap_caps.h"
#include "esp_intr_alloc.h"
#include "esp_timer.h"
#include "esp_system.h"
#include "esp_memory_utils.h"
#include "usb/usb_host.h"
#include "nbis_wrap.h"
#include "xyt_test.h"
#include "controlador_lector.h"
#include "controlador_red.h"
#include "modelos/modelo_estudiante.h"
#include "modelos/modelo_biometrico.h"
#include "modelos/modelo_registro.h"
#include "modelos/almacenamiento.h"

static const char *TAG = "URU4500";

/* =====================================================================
 * Estado visible en la web y enrolamiento pendiente
 * ===================================================================== */
#define ENROL_MUESTRAS       3
#define ENROL_CADUCIDAD_US   (90LL * 1000000)   /* 90 s sin dedo -> cancelar */

static portMUX_TYPE s_mux_msg = portMUX_INITIALIZER_UNLOCKED;
static char    s_mensaje[96] = "Iniciando...";
static int64_t s_msg_fijo_hasta = 0;

static portMUX_TYPE s_mux_enr = portMUX_INITIALIZER_UNLOCKED;
static volatile uint32_t s_enrol_id = 0;
static volatile int      s_enrol_faltan = 0;
static volatile int64_t  s_enrol_t0 = 0;

void lector_mensaje(const char *texto)
{
    portENTER_CRITICAL(&s_mux_msg);
    strlcpy(s_mensaje, texto ? texto : "", sizeof(s_mensaje));
    s_msg_fijo_hasta = 0;
    portEXIT_CRITICAL(&s_mux_msg);
}

void lector_mensaje_reposo(const char *texto)
{
    portENTER_CRITICAL(&s_mux_msg);
    if (esp_timer_get_time() >= s_msg_fijo_hasta)
        strlcpy(s_mensaje, texto ? texto : "", sizeof(s_mensaje));
    portEXIT_CRITICAL(&s_mux_msg);
}

void lector_mensaje_resultado(const char *texto)
{
    portENTER_CRITICAL(&s_mux_msg);
    strlcpy(s_mensaje, texto ? texto : "", sizeof(s_mensaje));
    s_msg_fijo_hasta = esp_timer_get_time() + 5000000LL;
    portEXIT_CRITICAL(&s_mux_msg);
}

void lector_estado_actual(char *destino, size_t n)
{
    portENTER_CRITICAL(&s_mux_msg);
    strlcpy(destino, s_mensaje, n);
    portEXIT_CRITICAL(&s_mux_msg);
}

void lector_enrolamiento_pedir(uint32_t id)
{
    s_enrol_id = id;
    s_enrol_faltan = ENROL_MUESTRAS;
    s_enrol_t0 = esp_timer_get_time();
}

uint32_t lector_enrolamiento_pendiente(void)
{
    /* caduca solo: nunca dejar la web "esperando" indefinidamente */
    if (s_enrol_id && esp_timer_get_time() - s_enrol_t0 > ENROL_CADUCIDAD_US) {
        s_enrol_id = 0; s_enrol_faltan = 0;
        lector_mensaje_resultado("Enrolamiento cancelado: no se puso el dedo a tiempo");
    }
    return s_enrol_id;
}

int  lector_enrolamiento_faltan(void)   { return s_enrol_faltan; }
void lector_enrolamiento_cancelar(void) { s_enrol_id = 0; s_enrol_faltan = 0; }

void lector_enrolamiento_terminar(uint32_t id)
{
    portENTER_CRITICAL(&s_mux_enr);
    if (s_enrol_id == id) { s_enrol_id = 0; s_enrol_faltan = 0; }
    portEXIT_CRITICAL(&s_mux_enr);
}

int lector_enrolamiento_muestra(uint32_t id)
{
    portENTER_CRITICAL(&s_mux_enr);
    int faltan = 0;
    if (s_enrol_id == id) {
        if (s_enrol_faltan > 0) s_enrol_faltan--;
        faltan = s_enrol_faltan;
        if (faltan == 0) s_enrol_id = 0;
        else s_enrol_t0 = esp_timer_get_time();   /* renovar la ventana */
    }
    portEXIT_CRITICAL(&s_mux_enr);
    return faltan;
}



/* ---- constantes del protocolo (ver PROTOCOLO-4500.md) ---- */
#define URU_VID                 0x05BA
#define URU_PID                 0x000A
#define EP_INTR                 0x81
#define EP_DATA                 0x82
#define USB_RQ                  0x04
#define BMREQ_IN                0xC0   /* VENDOR | DEVICE | IN  */
#define BMREQ_OUT               0x40   /* VENDOR | DEVICE | OUT */

#define REG_HWSTAT              0x07
#define REG_SCRAMBLE_INDEX      0x33
#define REG_SCRAMBLE_KEY        0x34
#define REG_MODE                0x4e
#define REG_DEVICE_INFO         0xf0

#define MODE_INIT               0x00
#define MODE_AWAIT_FINGER_ON    0x10
#define MODE_AWAIT_FINGER_OFF   0x12
#define MODE_CAPTURE            0x20
#define MODE_OFF                0x70
#define MODE_READY              0x80

#define IRQ_SCANPWR_ON          0x56aa
#define IRQ_FINGER_ON           0x0101
#define IRQ_FINGER_OFF          0x0200
#define IRQ_DEATH               0x0800

#define BLOCKF_CHANGE_KEY       0x80
#define BLOCKF_NO_KEY_UPDATE    0x04
#define BLOCKF_ENCRYPTED        0x02
#define BLOCKF_NOT_PRESENT      0x01
#define ENC_THRESHOLD           5000
#define SCRAMBLE_SEED           0x784f2a9cu   /* fijo: se cancela en el intercambio */

#define IMAGE_WIDTH             384
#define IMAGE_HEIGHT            290
#define IMG_BUF_SIZE            (IMAGE_WIDTH * IMAGE_HEIGHT + 4096)

/* ---- estado global del cliente USB ---- */
static usb_host_client_handle_t s_client = NULL;
static usb_device_handle_t s_dev = NULL;
static uint8_t s_dev_addr = 0;
static QueueHandle_t s_dev_queue = NULL;      /* recibe direcciones de dispositivos nuevos */
static SemaphoreHandle_t s_ctrl_done = NULL;  /* completa control transfers */
static SemaphoreHandle_t s_in_done = NULL;    /* completa transfers IN (intr/bulk) */
static usb_transfer_t *s_ctrl = NULL;         /* transfer reutilizable de control */
static usb_transfer_t *s_intr = NULL;         /* transfer para EP_INTR */
static usb_transfer_t *s_bulk = NULL;         /* transfer para EP_DATA */
static uint8_t *s_img = NULL;                 /* imagen cruda (cabecera + datos) en PSRAM */
static uint8_t *s_img_out = NULL;             /* imagen reensamblada y limpia en PSRAM */
static int s_captura_n = 0;                   /* contador para etiquetar volcados */

/* ---- procesamiento EN PARALELO: el lector queda libre apenas lee (~1.5s);
 * extraer minucias (~4s) y guardar corren en otra tarea. Sin esto, cada
 * muestra "congelaba" el lector 6-9s y enrolar 3 muestras era eterno. ---- */
typedef struct {
    uint8_t *img;          /* copia de la imagen limpia (PSRAM) */
    int lines;
    uint32_t enroll;       /* latch de enrolamiento al momento del dedo */
} trabajo_t;
#define N_TRABAJOS 2
static trabajo_t s_trab[N_TRABAJOS];
static QueueHandle_t s_q_libres = NULL;   /* slots disponibles */
static QueueHandle_t s_q_listos = NULL;   /* capturas por procesar */
static bool s_dump_raw = false;               /* (ya no hace falta: descifrado OK) */
static uint32_t s_dbg_seed = 0, s_dbg_key = 0;/* material de llave para depurar offline */

/* ---- callbacks de transfer: solo liberan el semaforo ---- */
static void ctrl_cb(usb_transfer_t *t) { xSemaphoreGive(s_ctrl_done); }
static void in_cb(usb_transfer_t *t)   { xSemaphoreGive(s_in_done); }

/* ---- helpers sincronos de acceso a registros ---- */
static esp_err_t reg_read(uint16_t reg, uint8_t *out, uint16_t len)
{
    usb_setup_packet_t *s = (usb_setup_packet_t *)s_ctrl->data_buffer;
    s->bmRequestType = BMREQ_IN;
    s->bRequest = USB_RQ;
    s->wValue = reg;
    s->wIndex = 0;
    s->wLength = len;
    s_ctrl->num_bytes = 8 + len;   /* setup (8) + datos */
    s_ctrl->bEndpointAddress = 0;
    s_ctrl->device_handle = s_dev;
    s_ctrl->callback = ctrl_cb;
    s_ctrl->context = NULL;
    esp_err_t r = usb_host_transfer_submit_control(s_client, s_ctrl);
    if (r != ESP_OK) return r;
    if (xSemaphoreTake(s_ctrl_done, pdMS_TO_TICKS(5000)) != pdTRUE) return ESP_ERR_TIMEOUT;
    if (s_ctrl->status != USB_TRANSFER_STATUS_COMPLETED) return ESP_FAIL;
    memcpy(out, s_ctrl->data_buffer + 8, len);
    return ESP_OK;
}

static esp_err_t reg_write(uint16_t reg, const uint8_t *data, uint16_t len)
{
    usb_setup_packet_t *s = (usb_setup_packet_t *)s_ctrl->data_buffer;
    s->bmRequestType = BMREQ_OUT;
    s->bRequest = USB_RQ;
    s->wValue = reg;
    s->wIndex = 0;
    s->wLength = len;
    memcpy(s_ctrl->data_buffer + 8, data, len);
    s_ctrl->num_bytes = 8 + len;
    s_ctrl->bEndpointAddress = 0;
    s_ctrl->device_handle = s_dev;
    s_ctrl->callback = ctrl_cb;
    s_ctrl->context = NULL;
    esp_err_t r = usb_host_transfer_submit_control(s_client, s_ctrl);
    if (r != ESP_OK) return r;
    if (xSemaphoreTake(s_ctrl_done, pdMS_TO_TICKS(5000)) != pdTRUE) return ESP_ERR_TIMEOUT;
    return (s_ctrl->status == USB_TRANSFER_STATUS_COMPLETED) ? ESP_OK : ESP_FAIL;
}

static esp_err_t reg_write1(uint16_t reg, uint8_t value)
{
    return reg_write(reg, &value, 1);
}

/* Aborta cualquier transfer pendiente en un endpoint y lo deja usable.
 * CRITICO: un timeout deja el transfer "en vuelo"; sin esta limpieza, TODO
 * submit posterior falla al instante y el lector queda muerto para siempre
 * (visto en produccion: timeout de 60s sin dedo -> bucle de fallos infinito). */
static void ep_limpiar(uint8_t ep)
{
    if (!s_dev) return;
    usb_host_endpoint_halt(s_dev, ep);
    usb_host_endpoint_flush(s_dev, ep);   /* completa pendientes como CANCELED */
    usb_host_endpoint_clear(s_dev, ep);
    /* drenar el semaforo: el flush dispara el callback del transfer abortado */
    while (xSemaphoreTake(s_in_done, pdMS_TO_TICKS(20)) == pdTRUE) { }
}

/* Espera un paquete del endpoint de interrupcion y devuelve el codigo IRQ. */
static esp_err_t intr_wait(uint16_t *type, uint32_t timeout_ms)
{
    s_intr->num_bytes = 64;
    s_intr->bEndpointAddress = EP_INTR;
    s_intr->device_handle = s_dev;
    s_intr->callback = in_cb;
    s_intr->context = NULL;
    esp_err_t r = usb_host_transfer_submit(s_intr);
    if (r != ESP_OK) return r;
    if (xSemaphoreTake(s_in_done, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        ep_limpiar(EP_INTR);   /* abortar el transfer para no dejar el pipe muerto */
        return ESP_ERR_TIMEOUT;
    }
    if (s_intr->status != USB_TRANSFER_STATUS_COMPLETED) return ESP_FAIL;
    if (s_intr->actual_num_bytes < 2) return ESP_FAIL;
    *type = (s_intr->data_buffer[0] << 8) | s_intr->data_buffer[1];
    return ESP_OK;
}

/* Lee toda la imagen del endpoint bulk en UNA sola transferencia (sin pausas
 * entre trozos, para no perder bytes: el 4500 transmite sin buffer). El buffer
 * del transfer es s_bulk, ya dimensionado para la imagen completa. */
static esp_err_t bulk_read_todo(int esperado, int *got, uint32_t timeout_ms)
{
    s_bulk->num_bytes = esperado;   /* multiplo de MPS (64) */
    s_bulk->bEndpointAddress = EP_DATA;
    s_bulk->device_handle = s_dev;
    s_bulk->callback = in_cb;
    s_bulk->context = NULL;
    esp_err_t r = usb_host_transfer_submit(s_bulk);
    if (r != ESP_OK) return r;
    if (xSemaphoreTake(s_in_done, pdMS_TO_TICKS(timeout_ms)) != pdTRUE) {
        ep_limpiar(EP_DATA);   /* abortar el transfer para no dejar el pipe muerto */
        return ESP_ERR_TIMEOUT;
    }
    if (s_bulk->status != USB_TRANSFER_STATUS_COMPLETED) {
        ESP_LOGW(TAG, "bulk status %d", s_bulk->status);
        return ESP_FAIL;
    }
    *got = s_bulk->actual_num_bytes;
    return ESP_OK;
}

/* ---- secuencia de init (traducida del SSM de libfprint) ---- */

static esp_err_t hwstat_set(uint8_t v) { return reg_write1(REG_HWSTAT, v); }

static esp_err_t do_rebootpwr(uint8_t *last_hwstat)
{
    ESP_LOGI(TAG, "rebootpwr: reiniciando alimentacion del lector");
    if (hwstat_set(*last_hwstat & 0x0f) != ESP_OK) return ESP_FAIL;
    for (int i = 0; i < 100; i++) {
        uint8_t st;
        if (reg_read(REG_HWSTAT, &st, 1) != ESP_OK) return ESP_FAIL;
        *last_hwstat = st;
        if (st & 0x01) return ESP_OK;
        vTaskDelay(pdMS_TO_TICKS(10));
    }
    ESP_LOGE(TAG, "rebootpwr: no se pudo reiniciar");
    return ESP_FAIL;
}

static esp_err_t do_powerup(uint8_t *last_hwstat)
{
    ESP_LOGI(TAG, "powerup: encendiendo el lector");
    uint8_t hw = *last_hwstat & 0x0f;
    for (int i = 0; i < 100; i++) {
        if (hwstat_set(hw) != ESP_OK) return ESP_FAIL;
        uint8_t st;
        if (reg_read(REG_HWSTAT, &st, 1) != ESP_OK) return ESP_FAIL;
        *last_hwstat = st;
        if ((st & 0x80) == 0) return ESP_OK;
        vTaskDelay(pdMS_TO_TICKS(10));
    }
    ESP_LOGE(TAG, "powerup: no se pudo encender");
    return ESP_FAIL;
}

static esp_err_t uru_init(void)
{
    uint8_t info[16] = {0};
    if (reg_read(REG_DEVICE_INFO, info, 16) != ESP_OK) {
        ESP_LOGE(TAG, "no se pudo leer REG_DEVICE_INFO (canal de control fallo)");
        return ESP_FAIL;
    }
    ESP_LOGI(TAG, "canal de control OK. device_info: %02x %02x %02x %02x %02x %02x %02x %02x",
             info[0], info[1], info[2], info[3], info[4], info[5], info[6], info[7]);

    uint8_t hw;
    if (reg_read(REG_HWSTAT, &hw, 1) != ESP_OK) return ESP_FAIL;
    ESP_LOGI(TAG, "hwstat inicial = 0x%02x", hw);

    if ((hw & 0x84) == 0x84) {
        if (do_rebootpwr(&hw) != ESP_OK) return ESP_FAIL;
    }
    if ((hw & 0x80) == 0) {
        if (hwstat_set(hw | 0x80) != ESP_OK) return ESP_FAIL;
        hw |= 0x80;
    }
    if (do_powerup(&hw) != ESP_OK) return ESP_FAIL;

    ESP_LOGI(TAG, "esperando IRQ SCANPWR_ON (0x56aa)...");
    for (int i = 0; i < 20; i++) {
        uint16_t type;
        esp_err_t r = intr_wait(&type, 2000);
        if (r == ESP_OK) {
            ESP_LOGI(TAG, "  IRQ recibida: 0x%04x", type);
            if (type == IRQ_SCANPWR_ON) {
                ESP_LOGI(TAG, "lector encendido y listo");
                return ESP_OK;
            }
        } else if (r == ESP_ERR_TIMEOUT) {
            ESP_LOGW(TAG, "  timeout esperando IRQ (%d/20)", i + 1);
        }
    }
    ESP_LOGW(TAG, "no llego SCANPWR_ON, pero seguimos (algunos lectores no lo mandan)");
    return ESP_OK;
}

/* ---- descifrado de la imagen (LFSR, portado de libfprint) ---- */

static uint32_t update_key(uint32_t key)
{
    uint32_t bit = key & 0x9248144d;
    bit ^= bit << 16;
    bit ^= bit << 8;
    bit ^= bit << 4;
    bit ^= bit << 2;
    bit ^= bit << 1;
    return (bit & 0x80000000) | (key >> 1);
}

static uint32_t do_decode(uint8_t *data, int num_bytes, uint32_t key)
{
    uint8_t xorbyte;
    int i;
    for (i = 0; i < num_bytes - 1; i++) {
        xorbyte  = ((key >>  4) & 1) << 0;
        xorbyte |= ((key >>  8) & 1) << 1;
        xorbyte |= ((key >> 11) & 1) << 2;
        xorbyte |= ((key >> 14) & 1) << 3;
        xorbyte |= ((key >> 18) & 1) << 4;
        xorbyte |= ((key >> 21) & 1) << 5;
        xorbyte |= ((key >> 24) & 1) << 6;
        xorbyte |= ((key >> 29) & 1) << 7;
        key = update_key(key);
        data[i] = data[i + 1] ^ xorbyte;
    }
    data[i] = 0;
    return update_key(key);
}

/* mide el "ruido" de 2 lineas consecutivas a partir de la linea 'y0' */
static int calc_dev2_en(const uint8_t *data, int y0)
{
    const uint8_t *b0 = data + y0 * IMAGE_WIDTH;
    const uint8_t *b1 = b0 + IMAGE_WIDTH;
    int mean = 0;
    for (int i = 0; i < IMAGE_WIDTH; i++) mean += (int)b0[i] + (int)b1[i];
    mean /= IMAGE_WIDTH;
    int res = 0;
    for (int i = 0; i < IMAGE_WIDTH; i++) {
        int dev = (int)b0[i] + (int)b1[i] - mean;
        res += dev * dev;
    }
    return res / IMAGE_WIDTH;
}

static int calc_dev2(const uint8_t *data, int num_lines)
{
    if (num_lines < 2) return 0;
    return calc_dev2_en(data, 0);
}

/* Revisa el ruido en varias franjas verticales. Devuelve el MAXIMO dev2:
 * si alguna franja quedo ruidosa (mal descifrada / sin dedo), sera alto. */
static int calc_ruido_max(const uint8_t *img, int lines)
{
    int worst = 0;
    int puntos[] = { 4, lines / 4, lines / 2, (3 * lines) / 4, lines - 4 };
    for (int k = 0; k < 5; k++) {
        int y = puntos[k];
        if (y < 0 || y >= lines - 1) continue;
        int d = calc_dev2_en(img, y);
        if (d > worst) worst = d;
    }
    return worst;
}

/* Porcentaje del sensor realmente cubierto por el dedo: se cuenta cuantas
 * franjas tienen contraste (crestas y valles). Es el criterio HONESTO de
 * "dedo bien puesto"; la desviacion entre lineas NO sirve porque una huella
 * nitida produce, por definicion, mucha variacion entre lineas. */
static int calc_cobertura(const uint8_t *img, int lines)
{
    int con_dedo = 0, franjas = 0;
    for (int y = 2; y < lines - 2; y += 8) {
        const uint8_t *f = img + (size_t)y * IMAGE_WIDTH;
        int mn = 255, mx = 0;
        for (int x = 40; x < IMAGE_WIDTH - 40; x += 3) {
            if (f[x] < mn) mn = f[x];
            if (f[x] > mx) mx = f[x];
        }
        franjas++;
        if (mx - mn > 45) con_dedo++;
    }
    return franjas ? (con_dedo * 100 / franjas) : 0;
}

/* Diagnostico de la captura: dice DONDE hay huella y donde hay ruido, para
 * distinguir un dedo mal puesto (zonas vacias) de un descifrado defectuoso
 * (ruido parejo en toda la imagen). */
static void diagnosticar_captura(const uint8_t *img, int lines)
{
    int puntos[] = { 4, lines / 4, lines / 2, (3 * lines) / 4, lines - 4 };
    char det[110] = "";
    int o = 0;
    for (int k = 0; k < 5; k++) {
        int y = puntos[k];
        if (y < 0 || y >= lines - 1) continue;
        o += snprintf(det + o, sizeof(det) - o, "y%d=%d ", y, calc_dev2_en(img, y));
    }
    /* cobertura: cuantas franjas tienen contraste real (hay dedo apoyado) */
    int con_dedo = 0, franjas = 0;
    for (int y = 2; y < lines - 2; y += 8) {
        const uint8_t *f = img + (size_t)y * IMAGE_WIDTH;
        int mn = 255, mx = 0;
        for (int x = 40; x < IMAGE_WIDTH - 40; x += 3) {
            if (f[x] < mn) mn = f[x];
            if (f[x] > mx) mx = f[x];
        }
        franjas++;
        if (mx - mn > 45) con_dedo++;     /* contraste = crestas y valles */
    }
    int cobertura = franjas ? (con_dedo * 100 / franjas) : 0;
    ESP_LOGI(TAG, "DIAGNOSTICO: ruido por franja [%s] | dedo cubre %d%% del sensor", det, cobertura);
}

/* Descifra la imagen in situ. hdr apunta a la cabecera de 64 bytes;
 * los pixeles empiezan en hdr+64. Devuelve nº de lineas presentes. */
static int descramble(uint8_t *hdr, int num_lines)
{
    uint8_t key_number = hdr[6];
    uint8_t *data = hdr + 64;

    /* intercambio semilla -> llave */
    uint32_t seed = SCRAMBLE_SEED;
    uint8_t idxbuf[5] = { key_number, (uint8_t)seed, (uint8_t)(seed >> 8),
                          (uint8_t)(seed >> 16), (uint8_t)(seed >> 24) };
    if (reg_write(REG_SCRAMBLE_INDEX, idxbuf, 5) != ESP_OK) { ESP_LOGE(TAG, "write scramble idx fallo"); return -1; }
    uint8_t keybuf[4] = {0};
    if (reg_read(REG_SCRAMBLE_KEY, keybuf, 4) != ESP_OK) { ESP_LOGE(TAG, "read scramble key fallo"); return -1; }
    uint32_t key = keybuf[0] | ((uint32_t)keybuf[1] << 8) |
                   ((uint32_t)keybuf[2] << 16) | ((uint32_t)keybuf[3] << 24);
    key ^= seed;
    s_dbg_seed = seed;
    s_dbg_key = key;

    int lines_done = 0;
    for (int blk = 0; blk < 15; blk++) {
        uint8_t flags = hdr[16 + blk * 2];
        uint8_t nlines = hdr[16 + blk * 2 + 1];
        if (nlines == 0) break;
        ESP_LOGI(TAG, "  bloque %d: flags=0x%02x lineas=%d%s%s%s%s", blk, flags, nlines,
                 (flags & BLOCKF_ENCRYPTED) ? " ENC" : "",
                 (flags & BLOCKF_NOT_PRESENT) ? " NOPRESENTE" : "",
                 (flags & BLOCKF_NO_KEY_UPDATE) ? " NOKEY" : "",
                 (flags & BLOCKF_CHANGE_KEY) ? " CHGKEY" : "");

        if (flags & BLOCKF_CHANGE_KEY) {
            key_number++;
            uint8_t ib[5] = { key_number, (uint8_t)seed, (uint8_t)(seed >> 8),
                              (uint8_t)(seed >> 16), (uint8_t)(seed >> 24) };
            reg_write(REG_SCRAMBLE_INDEX, ib, 5);
            reg_read(REG_SCRAMBLE_KEY, keybuf, 4);
            key = (keybuf[0] | ((uint32_t)keybuf[1] << 8) |
                   ((uint32_t)keybuf[2] << 16) | ((uint32_t)keybuf[3] << 24)) ^ seed;
            flags &= ~BLOCKF_CHANGE_KEY;
        }

        int nbytes = IMAGE_WIDTH * nlines;
        switch (flags & (BLOCKF_NO_KEY_UPDATE | BLOCKF_ENCRYPTED)) {
        case BLOCKF_ENCRYPTED:
            key = do_decode(&data[lines_done * IMAGE_WIDTH], nbytes, key);
            break;
        case 0:
            for (int r = 0; r < nbytes; r++) key = update_key(key);
            break;
        default:
            break;   /* NO_KEY_UPDATE solo: no tocar */
        }
        if (!(flags & BLOCKF_NOT_PRESENT)) lines_done += nlines;
    }
    return lines_done;
}

/* Reensambla los bloques en una imagen contigua y limpia (como IMAGING_REPORT_IMAGE).
 * Devuelve el nº total de lineas de la imagen final. */
static int reensamblar(const uint8_t *hdr, uint8_t *out)
{
    const uint8_t *data = hdr + 64;
    int to = 0, r = 0, total = 0;
    for (int blk = 0; blk < 15; blk++) {
        uint8_t flags = hdr[16 + blk * 2];
        uint8_t nlines = hdr[16 + blk * 2 + 1];
        if (nlines == 0) break;
        if (to + nlines * IMAGE_WIDTH > IMAGE_HEIGHT * IMAGE_WIDTH) break;
        memcpy(out + to, data + r * IMAGE_WIDTH, nlines * IMAGE_WIDTH);
        if (!(flags & BLOCKF_NOT_PRESENT)) r += nlines;
        to += nlines * IMAGE_WIDTH;
        total += nlines;
    }
    return total;
}

static void b64_row(const uint8_t *src, int n, char *out)
{
    static const char *B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    int col = 0;
    for (int i = 0; i < n; i += 3) {
        uint32_t v = src[i] << 16;
        int rem = n - i;
        if (rem > 1) v |= src[i + 1] << 8;
        if (rem > 2) v |= src[i + 2];
        out[col++] = B64[(v >> 18) & 0x3f];
        out[col++] = B64[(v >> 12) & 0x3f];
        out[col++] = (rem > 1) ? B64[(v >> 6) & 0x3f] : '=';
        out[col++] = (rem > 2) ? B64[v & 0x3f] : '=';
    }
    out[col] = 0;
}

static uint16_t crc16_ccitt(const uint8_t *d, int n)
{
    uint16_t crc = 0xFFFF;
    for (int i = 0; i < n; i++) {
        crc ^= (uint16_t)d[i] << 8;
        for (int b = 0; b < 8; b++)
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1);
    }
    return crc;
}

/* Vuelca la imagen FILA POR FILA con nº de fila y CRC, con pausas para no
 * saturar la UART. Si una fila se corrompe, la siguiente se re-sincroniza por
 * su nº. El Mac reconstruye validando el CRC de cada fila. */
static void volcar_base64(const uint8_t *img, int n, int w, int h)
{
    char rowb64[520];
    printf("\n<<<IMG cap=%d %d %d %d>>>\n", s_captura_n, w, h, n);
    fflush(stdout);
    vTaskDelay(pdMS_TO_TICKS(20));
    for (int y = 0; y < h; y++) {
        const uint8_t *row = img + y * w;
        b64_row(row, w, rowb64);
        uint16_t crc = crc16_ccitt(row, w);
        printf("R%d,%04x,%s\n", y, crc, rowb64);
        fflush(stdout);
        if ((y & 3) == 3) vTaskDelay(pdMS_TO_TICKS(6));  /* dejar drenar la FIFO */
    }
    printf("<<<END>>>\n");
    fflush(stdout);
}

/* ---- captura de una huella ---- */

static void resumen_imagen(const uint8_t *img, int n, int lines)
{
    long sum = 0;
    int mn = 255, mx = 0;
    for (int i = 0; i < n; i++) {
        sum += img[i];
        if (img[i] < mn) mn = img[i];
        if (img[i] > mx) mx = img[i];
    }
    int mean = n ? (int)(sum / n) : 0;
    ESP_LOGI(TAG, "IMAGEN: %d bytes, %d lineas (%dx%d), pixel min=%d max=%d media=%d",
             n, lines, IMAGE_WIDTH, lines, mn, mx, mean);
    ESP_LOGI(TAG, "  primeros 16 bytes: %02x %02x %02x %02x %02x %02x %02x %02x "
             "%02x %02x %02x %02x %02x %02x %02x %02x",
             img[0], img[1], img[2], img[3], img[4], img[5], img[6], img[7],
             img[8], img[9], img[10], img[11], img[12], img[13], img[14], img[15]);
    if (mx - mn > 40)
        ESP_LOGI(TAG, "  -> parece una huella real (buen contraste)");
    else
        ESP_LOGW(TAG, "  -> contraste bajo: puede ser imagen vacia o cifrada");
}

/* Procesa una plantilla ya extraida: enrolamiento o asistencia. MISMA ruta
 * para huellas reales y para el auto-test interno de arranque.
 * enroll = id LATCHEADO en el momento en que se puso el dedo: solo se enrola
 * si la web SIGUE pidiendo ese mismo alumno (asi "Cancelar" cancela de verdad
 * y un "+huella" pulsado a mitad de proceso no roba la huella equivocada). */
void lector_procesar_plantilla(const fp_template_t *t, uint32_t enroll)
{
    char msg[160];
    if (enroll && lector_enrolamiento_pendiente() == enroll) {
        /* ---- ENROLAR: guardar esta muestra; se piden 3 del mismo dedo ---- */
        char dedo[24];
        snprintf(dedo, sizeof(dedo), "muestra %d", 4 - lector_enrolamiento_faltan());
        alm_lock();
        estudiante_t *e = est_por_id(enroll);
        char nom[84] = "?";
        if (e) snprintf(nom, sizeof(nom), "%s %s", e->nombre, e->apellido);
        bool ok = e && bio_agregar(enroll, dedo, t);
        alm_unlock();
        if (!ok) {
            ESP_LOGW(TAG, "no se pudo enrolar la huella (id %lu)", (unsigned long)enroll);
            snprintf(msg, sizeof(msg), "No se pudo enrolar (alumno %lu)", (unsigned long)enroll);
            lector_mensaje_resultado(msg);
            lector_enrolamiento_terminar(enroll);
            return;
        }
        int faltan = lector_enrolamiento_muestra(enroll);
        if (faltan > 0) {
            ESP_LOGI(TAG, ">>> muestra guardada para %s; faltan %d <<<", nom, faltan);
            snprintf(msg, sizeof(msg), "Muestra guardada. LEVANTA y pon el MISMO dedo otra vez (faltan %d)", faltan);
        } else {
            ESP_LOGI(TAG, ">>> HUELLA ENROLADA a %s (id %lu, 3 muestras) <<<", nom, (unsigned long)enroll);
            snprintf(msg, sizeof(msg), "Huella enrolada: %s (3 muestras)", nom);
        }
        lector_mensaje_resultado(msg);
        return;
    }

    /* ---- ASISTENCIA: identificar 1:N y registrar ----
     * db_identificar toma su PROPIO cerrojo; no lo retenemos nosotros para que
     * la web siga respondiendo mientras se compara contra toda la matricula. */
    char fecha[12], hora[10];
    red_fecha_hora(fecha, hora);
    char serv[24];
    red_servicio_actual(serv, sizeof(serv));
    identificacion_t id = bio_identificar(t);

    const char *resultado;
    char quien[84] = "Desconocido";
    uint32_t est_id = 0;
    alm_lock();   /* cerrojo CORTO: solo el anti-duplicado */
    if (!id.encontrado) {
        resultado = "desconocido";
    } else {
        est_id = id.estudiante.id;
        snprintf(quien, sizeof(quien), "%s %s", id.estudiante.nombre, id.estudiante.apellido);
        if (!id.estudiante.activo)                       resultado = "no_autorizado";
        else if (!reg_hay_servicio(serv))                resultado = "sin_servicio";
        else if (reg_ya_entregado(est_id, serv, fecha))  resultado = "duplicado";
        else                                             resultado = "permitido";
    }
    alm_unlock();
    /* mostrar el RESULTADO primero (la escritura a flash tarda ~1s y congela
     * el firmware; que la persona no espere por eso) */
    ESP_LOGI(TAG, ">>> ASISTENCIA: %s  [%s]  servicio=%s  score=%d  %s <<<",
             quien, resultado, serv, id.score, hora);
    snprintf(msg, sizeof(msg), "%s: %s (%s)", quien, resultado, serv);
    lector_mensaje_resultado(msg);
    reg_crear(est_id, serv, resultado, id.score, fecha, hora);
}

/* Tarea procesadora: saca capturas de la cola, extrae minucias y decide
 * (enrolar/identificar). Corre EN PARALELO con el lector: mientras esto
 * trabaja, la siguiente persona ya puede poner el dedo. */
static void procesador_task(void *arg)
{
    trabajo_t *j;
    while (1) {
        if (xQueueReceive(s_q_listos, &j, portMAX_DELAY) != pdTRUE) continue;
        fp_template_t t;
        int64_t t0 = esp_timer_get_time();
        int nm = fp_extraer(j->img, IMAGE_WIDTH, j->lines, &t);
        int64_t ms = (esp_timer_get_time() - t0) / 1000;
        int minimo = j->enroll ? 12 : 6;   /* al enrolar se exige mejor calidad */
        if (nm < minimo) {
            ESP_LOGW(TAG, "huella pobre (%d minucias, se piden %d): repetir", nm, minimo);
            lector_mensaje_resultado(nm < 4 ? "No se detecto la huella: apoya bien el dedo"
                                            : "Huella tenue: presiona un poco mas firme");
        } else {
            ESP_LOGI(TAG, "*** HUELLA TOMADA: %d minucias en %lld ms ***", nm, ms);
            lector_procesar_plantilla(&t, j->enroll);
        }
        xQueueSend(s_q_libres, &j, 0);   /* devolver el slot */
    }
}

/* Espera a que el dedo se retire DE VERDAD (con tope). Sin esto, un dedo que
 * queda apoyado se re-captura en bucle: el lector parpadea sin parar, salen
 * capturas parciales y parece que "sigue pidiendo huellas". */
static void esperar_dedo_fuera(int max_ms)
{
    ESP_LOGI(TAG, "retira el dedo...");
    int64_t t0 = esp_timer_get_time();
    while ((esp_timer_get_time() - t0) / 1000 < max_ms) {
        uint16_t ty;
        esp_err_t r = intr_wait(&ty, 1500);
        if (r == ESP_OK && ty == IRQ_FINGER_OFF) {
            /* dedo fuera = el lector queda libre YA: decirselo al usuario al
             * instante (esto es lo que marca el ritmo de las 3 muestras) */
            lector_mensaje(lector_enrolamiento_pendiente()
                              ? "Recibida. Pon el MISMO dedo OTRA VEZ"
                              : "Listo. Pon el dedo en el lector");
            return;
        }
        if (r == ESP_FAIL) return;   /* error de pipe: la escalera lo maneja */
    }
}

static esp_err_t capturar_una(void)
{
    ESP_LOGI(TAG, "modo AWAIT_FINGER_ON; pon el dedo en el lector...");
    uint32_t enr = lector_enrolamiento_pendiente();
    if (enr) {
        char m[80];
        snprintf(m, sizeof(m), "Pon el dedo del alumno (muestra %d de 3)", 4 - lector_enrolamiento_faltan());
        lector_mensaje_reposo(m);   /* idle: no tapa el resultado de la muestra anterior */
    } else {
        lector_mensaje_reposo("Listo. Pon el dedo en el lector");
    }
    if (reg_write1(REG_MODE, MODE_AWAIT_FINGER_ON) != ESP_OK) return ESP_FAIL;

    /* esperar dedo (hasta 60 s) */
    while (1) {
        uint16_t type;
        esp_err_t r = intr_wait(&type, 60000);
        if (r == ESP_ERR_TIMEOUT) { ESP_LOGW(TAG, "sin dedo en 60s, reintentando"); return ESP_ERR_TIMEOUT; }
        if (r != ESP_OK) return ESP_FAIL;
        ESP_LOGI(TAG, "IRQ 0x%04x", type);
        if (type == IRQ_FINGER_ON) break;
        if (type == IRQ_DEATH) { ESP_LOGE(TAG, "IRQ de muerte"); return ESP_FAIL; }
    }
    ESP_LOGI(TAG, "dedo detectado! capturando...");
    lector_mensaje("Dedo detectado, capturando...");
    /* latch: el modo (enrolar/asistencia) se decide con lo que la web pedia
     * EN ESTE instante, no ~2s despues cuando termine el procesamiento */
    uint32_t enroll_latch = lector_enrolamiento_pendiente();

    /* dejar que el dedo asiente (menos capturas parciales de 4 minucias) */
    vTaskDelay(pdMS_TO_TICKS(250));

    if (reg_write1(REG_MODE, MODE_CAPTURE) != ESP_OK) return ESP_FAIL;

    /* leer la imagen COMPLETA en una sola transferencia (sin perder bytes) */
    int total = 0;
    esp_err_t r = bulk_read_todo(IMG_BUF_SIZE, &total, 4000);
    if (r != ESP_OK) {
        ESP_LOGW(TAG, "fallo la lectura bulk (%d)", r);
        lector_mensaje_resultado("No se pudo leer la huella, intenta de nuevo");
        reg_write1(REG_MODE, MODE_AWAIT_FINGER_OFF);
        return ESP_FAIL;
    }
    memcpy(s_img, s_bulk->data_buffer, total);

    /* CALMAR el sensor YA: si se queda en modo CAPTURE durante los ~4-6s de
     * procesamiento, sigue "transmitiendo" y el LED parpadea como loco.
     * (libfprint hace lo mismo: imagen leida -> AWAIT_FINGER_OFF de una) */
    reg_write1(REG_MODE, MODE_AWAIT_FINGER_OFF);
    /* avisar YA y PEGAJOSO (resultado): la persona termino aqui (~1s). Si
     * fuera transitorio, el proximo mensaje lo pisa en 200ms y el celular
     * (que refresca cada 1s) jamas lo muestra -> el usuario cree que no leyo */
    lector_mensaje_resultado("HUELLA LEIDA. Retira el dedo");

    if (total < 64 + IMAGE_WIDTH) {
        ESP_LOGW(TAG, "captura demasiado corta: %d bytes", total);
        return ESP_FAIL;
    }

    int lines = (total - 64) / IMAGE_WIDTH;

    /* detectar cifrado y descifrar si hace falta */
    int dev2 = calc_dev2(s_img + 64, lines);
    ESP_LOGI(TAG, "dev2 = %d (umbral %d)", dev2, ENC_THRESHOLD);
    /* volcar UNA vez la imagen cruda cifrada + cabecera, para depurar offline */
    if (s_dump_raw) {
        ESP_LOGI(TAG, "volcando imagen CRUDA (cifrada) para depuracion...");
        printf("\n<<<RAWHDR ");
        for (int b = 0; b < 64; b++) printf("%02x", s_img[b]);
        printf(">>>\n");
        volcar_base64(s_img, 64 + lines * IMAGE_WIDTH, IMAGE_WIDTH, lines);
    }

    if (dev2 >= ENC_THRESHOLD) {
        ESP_LOGI(TAG, "imagen cifrada, descifrando...");
        descramble(s_img, lines);
        if (s_dump_raw) {
            s_dump_raw = false;
            printf("<<<KEY seed=%08lx key=%08lx>>>\n", (unsigned long)s_dbg_seed, (unsigned long)s_dbg_key);
            fflush(stdout);
        }
        int dev2b = calc_dev2(s_img + 64, lines);
        ESP_LOGI(TAG, "dev2 tras descifrar = %d %s", dev2b,
                 dev2b < ENC_THRESHOLD ? "(OK, imagen limpia)" : "(aun ruidosa)");
    } else {
        ESP_LOGI(TAG, "imagen ya en claro");
    }

    /* reensamblar los bloques en una imagen final contigua */
    int lines_ok = reensamblar(s_img, s_img_out);
    if (lines_ok <= 0) lines_ok = lines;

    /* control de calidad: revisar que TODA la imagen quedo limpia, no solo arriba */
    int ruido = calc_ruido_max(s_img_out, lines_ok);
    ESP_LOGI(TAG, "ruido maximo en la imagen = %d", ruido);
    diagnosticar_captura(s_img_out, lines_ok);

    /* Control de calidad.
     * OJO: NO se rechaza por la desviacion entre lineas ("ruido"). Se medía
     * para detectar un descifrado defectuoso, pero una huella nitida produce
     * exactamente el mismo efecto: cuanto mejor apoyado el dedo, mayor el
     * contraste y mayor la desviacion. El umbral anterior (3000) rechazaba
     * capturas perfectas de 86-100% de cobertura. El descifrado ya se valida
     * antes (dev2 sobre la imagen cruda) y la calidad final la decide el
     * numero de minucias que logre extraer el algoritmo. */
    int cobertura = calc_cobertura(s_img_out, lines_ok);
    if (cobertura < 35) {
        ESP_LOGW(TAG, "CAPTURA RECHAZADA: el dedo solo cubre el %d%% del sensor", cobertura);
        lector_mensaje_resultado("Apoya el dedo completo sobre el lector");
        esperar_dedo_fuera(3000);
        return ESP_FAIL;
    }
    if (ruido > 25000) {   /* descifrado catastrofico: la imagen es ruido puro */
        ESP_LOGW(TAG, "CAPTURA RECHAZADA: imagen ilegible (desviacion %d)", ruido);
        lector_mensaje_resultado("No se pudo leer la imagen, intenta de nuevo");
        esperar_dedo_fuera(3000);
        return ESP_FAIL;
    }

    resumen_imagen(s_img_out, lines_ok * IMAGE_WIDTH, lines_ok);

    /* ---- encolar para el procesador paralelo: el lector queda libre YA ---- */
    trabajo_t *j = NULL;
    if (xQueueReceive(s_q_libres, &j, pdMS_TO_TICKS(8000)) == pdTRUE) {
        memcpy(j->img, s_img_out, IMAGE_WIDTH * lines_ok);
        j->lines = lines_ok;
        j->enroll = enroll_latch;
        xQueueSend(s_q_listos, &j, portMAX_DELAY);
    } else {
        ESP_LOGW(TAG, "procesador atascado: captura descartada");
        lector_mensaje_resultado("Sistema ocupado, intenta de nuevo");
    }

    s_captura_n++;

    /* el sensor ya esta en AWAIT_FINGER_OFF desde que se leyo la imagen;
     * solo falta esperar a que el dedo se retire de verdad */
    esperar_dedo_fuera(8000);
    return ESP_OK;
}

/* ---- tarea principal del driver ---- */
static void tarea_lector(void *arg)
{
    while (1) {
        uint8_t addr;
        /* mientras NO haya lector conectado, avisarlo en la web cada 5s
         * (cable flojo/desconectado era invisible para el usuario) */
        while (xQueueReceive(s_dev_queue, &addr, pdMS_TO_TICKS(5000)) != pdTRUE) {
            if (!s_dev) lector_mensaje("LECTOR NO DETECTADO: revisa el cable USB del huellero");
        }

        ESP_LOGI(TAG, "abriendo lector en direccion %d", addr);
        if (usb_host_device_open(s_client, addr, &s_dev) != ESP_OK) {
            ESP_LOGE(TAG, "no se pudo abrir el dispositivo");
            continue;
        }
        /* copia local: el callback DEV_GONE pone s_dev=NULL y sin esta copia
         * la limpieza se saltaba (interface/dispositivo quedaban sin liberar
         * y el lector no re-enumeraba al reconectarlo) */
        usb_device_handle_t dev_abierto = s_dev;
        s_dev_addr = addr;

        if (usb_host_interface_claim(s_client, s_dev, 0, 0) != ESP_OK) {
            ESP_LOGE(TAG, "no se pudo reclamar la interface 0");
            usb_host_device_close(s_client, s_dev);
            s_dev = NULL;
            continue;
        }
        ESP_LOGI(TAG, "interface 0 reclamada");

        if (uru_init() != ESP_OK) {
            ESP_LOGE(TAG, "fallo el init del lector");
            lector_mensaje_resultado("Fallo el lector: desconectalo y conectalo de nuevo");
        } else {
            int n = 0, fallos = 0, recuperaciones = 0;
            while (s_dev) {
                esp_err_t r = capturar_una();
                if (r == ESP_OK) {
                    n++; fallos = 0; recuperaciones = 0;
                    ESP_LOGI(TAG, "=== captura #%d completada ===", n);
                } else if (r == ESP_ERR_TIMEOUT) {
                    fallos = 0;   /* sin dedo: normal, el pipe ya quedo limpio */
                } else {
                    fallos++;
                    if (fallos >= 2) {
                        /* dos fallos seguidos = el lector quedo en mal estado.
                         * Escalera: limpiar endpoints -> re-init -> reiniciar equipo. */
                        ESP_LOGW(TAG, "RECUPERACION del lector (limpiar endpoints + re-init)...");
                        lector_mensaje("Recuperando el lector...");
                        ep_limpiar(EP_INTR);
                        ep_limpiar(EP_DATA);
                        while (xSemaphoreTake(s_ctrl_done, 0) == pdTRUE) { }
                        if (s_dev && uru_init() == ESP_OK) {
                            ESP_LOGI(TAG, "RECUPERACION: lector operativo de nuevo");
                            fallos = 0;
                        } else if (++recuperaciones >= 2) {
                            ESP_LOGE(TAG, "RECUPERACION imposible -> reiniciando el equipo (BD intacta, ~7s)");
                            lector_mensaje_resultado("Reiniciando el equipo...");
                            vTaskDelay(pdMS_TO_TICKS(500));
                            esp_restart();
                        }
                    } else {
                        ESP_LOGW(TAG, "captura fallida, reintentando en 2s");
                        vTaskDelay(pdMS_TO_TICKS(2000));
                    }
                }
                vTaskDelay(pdMS_TO_TICKS(150));
            }
        }

        lector_mensaje_resultado("Lector desconectado");
        /* liberar SIEMPRE con la copia local (aunque DEV_GONE haya puesto
         * s_dev=NULL); si el dispositivo ya no existe, devuelve error inocuo */
        usb_host_interface_release(s_client, dev_abierto, 0);
        usb_host_device_close(s_client, dev_abierto);
        s_dev = NULL;
    }
}

/* ---- eventos del cliente USB ---- */
static void client_event_cb(const usb_host_client_event_msg_t *msg, void *arg)
{
    switch (msg->event) {
    case USB_HOST_CLIENT_EVENT_NEW_DEV:
        ESP_LOGI(TAG, "dispositivo USB nuevo en direccion %d", msg->new_dev.address);
        xQueueSend(s_dev_queue, &msg->new_dev.address, 0);
        break;
    case USB_HOST_CLIENT_EVENT_DEV_GONE:
        ESP_LOGW(TAG, "dispositivo desconectado");
        s_dev = NULL;   /* la tarea driver saldra del bucle */
        break;
    default:
        break;
    }
}

static void client_task(void *arg)
{
    usb_host_client_config_t cfg = {
        .is_synchronous = false,
        .max_num_event_msg = 5,
        .async = { .client_event_callback = client_event_cb, .callback_arg = NULL },
    };
    ESP_ERROR_CHECK(usb_host_client_register(&cfg, &s_client));
    ESP_LOGI(TAG, "cliente USB registrado");
    while (1) {
        usb_host_client_handle_events(s_client, portMAX_DELAY);
    }
}

static void host_lib_task(void *arg)
{
    usb_host_config_t host_config = {
        .skip_phy_setup = false,
        .intr_flags = ESP_INTR_FLAG_LEVEL1,
        .peripheral_map = BIT0,
    };
    ESP_ERROR_CHECK(usb_host_install(&host_config));
    xTaskNotifyGive(arg);
    while (1) {
        uint32_t flags;
        usb_host_lib_handle_events(portMAX_DELAY, &flags);
        if (flags & USB_HOST_LIB_EVENT_FLAGS_NO_CLIENTS) usb_host_device_free_all();
    }
}


/* ---------------------------------------------------------------------
 * Arranque del subsistema del lector: reserva memoria, crea las tareas
 * de USB y la de procesamiento en paralelo.
 * ------------------------------------------------------------------- */
bool lector_iniciar(void)
{
    s_dev_queue = xQueueCreate(4, sizeof(uint8_t));
    s_ctrl_done = xSemaphoreCreateBinary();
    s_in_done   = xSemaphoreCreateBinary();

    if (usb_host_transfer_alloc(8 + 64, 0, &s_ctrl) != ESP_OK) return false;
    if (usb_host_transfer_alloc(64, 0, &s_intr) != ESP_OK) return false;
    if (usb_host_transfer_alloc(IMG_BUF_SIZE, 0, &s_bulk) != ESP_OK) {
        ESP_LOGE(TAG, "no se pudo reservar el buffer de imagen");
        return false;
    }
    ESP_LOGI(TAG, "buffer de captura listo (%s)",
             esp_ptr_internal(s_bulk->data_buffer) ? "memoria interna, correcto" : "PSRAM - FALLARA");

    s_img     = heap_caps_malloc(IMG_BUF_SIZE, MALLOC_CAP_SPIRAM);
    s_img_out = heap_caps_malloc(IMAGE_WIDTH * IMAGE_HEIGHT, MALLOC_CAP_SPIRAM);
    if (!s_img || !s_img_out) { ESP_LOGE(TAG, "sin memoria para la imagen"); return false; }

    s_q_libres = xQueueCreate(N_TRABAJOS, sizeof(trabajo_t *));
    s_q_listos = xQueueCreate(N_TRABAJOS, sizeof(trabajo_t *));
    for (int i = 0; i < N_TRABAJOS; i++) {
        s_trab[i].img = heap_caps_malloc(IMAGE_WIDTH * IMAGE_HEIGHT, MALLOC_CAP_SPIRAM);
        if (!s_trab[i].img) return false;
        trabajo_t *p = &s_trab[i];
        xQueueSend(s_q_libres, &p, 0);
    }

    TaskHandle_t host_hdl;
    xTaskCreatePinnedToCore(host_lib_task, "usb_host", 4096, xTaskGetCurrentTaskHandle(), 2, &host_hdl, 0);
    ulTaskNotifyTake(false, pdMS_TO_TICKS(2000));
    xTaskCreatePinnedToCore(client_task, "usb_client", 5120, NULL, 3, NULL, 0);
    xTaskCreatePinnedToCore(tarea_lector, "lector", 16384, NULL, 4, NULL, 1);
    xTaskCreatePinnedToCore(procesador_task, "procesador", 32768, NULL, 3, NULL, 1);
    ESP_LOGI(TAG, "subsistema del lector iniciado");
    return true;
}
