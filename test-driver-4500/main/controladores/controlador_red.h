/* =====================================================================
 * ALIMETRIK - CONTROLADOR / Red y reloj
 * ---------------------------------------------------------------------
 * Levanta la red WiFi propia de la placa (punto de acceso), el DNS de
 * portal cautivo y mantiene la hora del sistema (el equipo no tiene
 * reloj con bateria: la recibe del navegador al conectarse).
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stddef.h>

/* Crea la red WiFi propia. Devuelve true si el radio respondio. */
bool red_iniciar_wifi(const char *ssid, const char *clave);

/* Arranca el DNS que redirige cualquier consulta al portal. */
void red_iniciar_dns(void);

/* ---- Reloj ---- */
void red_fijar_hora(long epoch_utc, int desfase_seg);
bool red_hay_hora(void);
void red_fecha_hora(char *fecha, char *hora);   /* fecha>=12, hora>=10 */

/* Copia en 'destino' el servicio del comedor vigente. destino >= 24 bytes. */
void red_servicio_actual(char *destino, size_t n);
