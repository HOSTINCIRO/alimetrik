/*
 * SPDX-FileCopyrightText: 2024-2025 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: Apache-2.0
 */

#include "esp_log.h"
#include "esp_hosted.h"

#include "port_esp_hosted_host_log.h"

#include "esp_private/startup_internal.h"

DEFINE_LOG_TAG(host_init);

/* PARCHE ALIMETRIK: el auto-arranque por constructor corre ANTES de app_main y
 * agota la RAM interna -> la tarea main (48KB) no se crea -> boot loop
 * (assert esp_startup_start_app). Lo desactivamos y llamamos esp_hosted_init()
 * a mano desde portal_wifi_init(), donde SÍ podemos capturar el fallo del C6
 * sin abortar. (Se pierde si se re-descarga el managed component: re-aplicar.) */
//ESP_SYSTEM_INIT_FN(esp_hosted_host_init, BIT(0), 120)
static void __attribute__((constructor)) esp_hosted_host_init(void)
{
	ESP_LOGI(TAG, "ESP Hosted : auto-init DESACTIVADO (se inicia desde el portal)");
}

static void __attribute__((destructor)) esp_hosted_host_deinit(void)
{
	/* no-op: no lo inicializamos por constructor */
}
