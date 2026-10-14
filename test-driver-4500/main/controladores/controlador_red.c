/* ALIMETRIK - CONTROLADOR / Red y reloj: implementacion. */
#include "controlador_red.h"
#include "modelos/modelo_servicio.h"
#include <string.h>
#include "modelos/almacenamiento.h"
#include <time.h>
#include <sys/time.h>
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_hosted.h"
#include "lwip/sockets.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "RED";
static esp_netif_t *s_ap = NULL;
static bool s_hay_hora = false;
static int  s_desfase = 0;      /* segundos respecto a UTC */

bool red_iniciar_wifi(const char *ssid, const char *clave)
{
    esp_err_t e = nvs_flash_init();
    if (e == ESP_ERR_NVS_NO_FREE_PAGES || e == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        nvs_flash_erase();
        nvs_flash_init();
    }
    /* el radio WiFi es un chip aparte (ESP32-C6) que se enlaza por SDIO */
    ESP_LOGI(TAG, "enlazando con el chip de radio...");
    if (esp_hosted_init() != ESP_OK) {
        ESP_LOGE(TAG, "el chip de radio no responde: la placa se queda sin WiFi");
        return false;
    }
    if (esp_netif_init() != ESP_OK) return false;
    esp_event_loop_create_default();
    s_ap = esp_netif_create_default_wifi_ap();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    if (esp_wifi_init(&cfg) != ESP_OK) { ESP_LOGE(TAG, "no se pudo iniciar el WiFi"); return false; }

    wifi_config_t wc = { 0 };
    strlcpy((char *)wc.ap.ssid, ssid, sizeof(wc.ap.ssid));
    wc.ap.ssid_len = strlen(ssid);
    wc.ap.channel = 6;
    wc.ap.max_connection = 6;
    if (clave && strlen(clave) >= 8) {
        strlcpy((char *)wc.ap.password, clave, sizeof(wc.ap.password));
        wc.ap.authmode = WIFI_AUTH_WPA2_PSK;
    } else {
        wc.ap.authmode = WIFI_AUTH_OPEN;
    }
    if (esp_wifi_set_mode(WIFI_MODE_AP) != ESP_OK) return false;
    if (esp_wifi_set_config(WIFI_IF_AP, &wc) != ESP_OK) return false;
    if (esp_wifi_start() != ESP_OK) return false;

    esp_netif_ip_info_t ip;
    esp_netif_get_ip_info(s_ap, &ip);
    ESP_LOGI(TAG, "red '%s' activa (%s) - portal en http://" IPSTR,
             ssid, wc.ap.authmode == WIFI_AUTH_OPEN ? "abierta" : "con clave", IP2STR(&ip.ip));
    return true;
}

/* DNS de portal cautivo: responde toda consulta con la IP de la placa. */
static void tarea_dns(void *arg)
{
    int sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (sock < 0) { vTaskDelete(NULL); return; }
    struct sockaddr_in sa = { .sin_family = AF_INET, .sin_port = htons(53),
                              .sin_addr.s_addr = htonl(INADDR_ANY) };
    if (bind(sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) { close(sock); vTaskDelete(NULL); return; }
    ESP_LOGI(TAG, "DNS de portal cautivo escuchando");
    uint8_t buf[512];
    while (1) {
        struct sockaddr_in cli; socklen_t cl = sizeof(cli);
        int n = recvfrom(sock, buf, sizeof(buf), 0, (struct sockaddr *)&cli, &cl);
        if (n < 12) continue;
        buf[2] |= 0x80;   /* marcar como respuesta */
        buf[3] |= 0x80;
        buf[7] = 1;       /* una respuesta */
        uint8_t ans[] = { 0xc0, 0x0c, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x3c,
                          0x00, 0x04, 192, 168, 4, 1 };
        if (n + (int)sizeof(ans) <= (int)sizeof(buf)) {
            memcpy(buf + n, ans, sizeof(ans));
            sendto(sock, buf, n + sizeof(ans), 0, (struct sockaddr *)&cli, cl);
        }
    }
}

void red_iniciar_dns(void) { xTaskCreate(tarea_dns, "dns", 4096, NULL, 4, NULL); }

void red_fijar_hora(long epoch_utc, int desfase_seg)
{
    struct timeval tv = { .tv_sec = epoch_utc, .tv_usec = 0 };
    settimeofday(&tv, NULL);
    s_desfase = desfase_seg;
    s_hay_hora = true;
    char f[12], h[10];
    red_fecha_hora(f, h);
    ESP_LOGI(TAG, "hora del sistema ajustada: %s %s", f, h);
}

bool red_hay_hora(void) { return s_hay_hora; }

void red_fecha_hora(char *fecha, char *hora)
{
    time_t t = time(NULL) + s_desfase;
    struct tm tmv;
    gmtime_r(&t, &tmv);           /* el desfase ya esta sumado */
    if (fecha) strftime(fecha, 12, "%Y-%m-%d", &tmv);
    if (hora)  strftime(hora, 10, "%H:%M:%S", &tmv);
}

/* Los horarios NO estan escritos aqui: se consultan al modelo de servicios,
 * que el encargado configura desde el portal web. */
void red_servicio_actual(char *destino, size_t n)
{
    if (!destino || n == 0) return;
    if (!s_hay_hora) { strlcpy(destino, SRV_SIN_HORA, n); return; }
    time_t t = time(NULL) + s_desfase;
    struct tm tmv; gmtime_r(&t, &tmv);
    srv_en_minuto(tmv.tm_hour * 60 + tmv.tm_min, destino, n);
}
