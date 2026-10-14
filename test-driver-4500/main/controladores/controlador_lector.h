/* =====================================================================
 * ALIMETRIK - CONTROLADOR / Lector de huellas: interfaz publica
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "nbis_wrap.h"

/* Arranca el subsistema (USB + tareas de captura y procesamiento). */
bool lector_iniciar(void);

/* ---- Mensajes que la web muestra en vivo ----
 * mensaje()          : instruccion al usuario; tiene prioridad sobre todo.
 * mensaje_reposo()   : texto de espera; respeta un resultado reciente.
 * mensaje_resultado(): resultado; permanece unos segundos en pantalla. */
void lector_mensaje(const char *texto);
void lector_mensaje_reposo(const char *texto);
void lector_mensaje_resultado(const char *texto);
void lector_estado_actual(char *destino, size_t n);

/* ---- Enrolamiento pedido desde la web (3 muestras del mismo dedo) ---- */
void     lector_enrolamiento_pedir(uint32_t estudiante_id);
uint32_t lector_enrolamiento_pendiente(void);
int      lector_enrolamiento_faltan(void);
void     lector_enrolamiento_cancelar(void);
void     lector_enrolamiento_terminar(uint32_t estudiante_id);
int      lector_enrolamiento_muestra(uint32_t estudiante_id);

/* Procesa una plantilla ya extraida (uso interno y de autopruebas). */
void lector_procesar_plantilla(const fp_template_t *t, uint32_t enrolamiento);
