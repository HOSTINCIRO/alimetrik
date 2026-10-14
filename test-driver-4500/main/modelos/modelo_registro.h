/* =====================================================================
 * ALIMETRIK - MODELO / Registros de entrega
 * ---------------------------------------------------------------------
 * Bitacora de cada intento de reclamar un servicio del comedor y la
 * regla anti-duplicado (una racion por servicio y por dia).
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stdint.h>

#define REG_MAX   2000    /* al llenarse, rota descartando el mas antiguo */

typedef struct {
    uint32_t id;
    uint32_t estudiante_id;   /* 0 = no identificado */
    char     servicio[24];    /* Desayuno / Almuerzo / Refrigerio / Fuera de horario */
    char     resultado[20];   /* permitido | duplicado | no_autorizado |
                               * desconocido | sin_servicio                    */
    int      score;
    char     fecha[12];       /* YYYY-MM-DD */
    char     hora[10];        /* HH:MM:SS */
} registro_t;

void reg_cargar(void);
int  reg_cantidad(void);
const registro_t *reg_por_indice(int i);   /* 0 = el mas reciente */

uint32_t reg_crear(uint32_t estudiante_id, const char *servicio, const char *resultado,
                   int score, const char *fecha, const char *hora);

/* Anti-duplicado: ¿ya recibio ESE servicio ESE dia? */
bool reg_ya_entregado(uint32_t estudiante_id, const char *servicio, const char *fecha);

/* true si a esta hora NO hay ningun servicio activo (no se entrega racion). */
bool reg_hay_servicio(const char *servicio);

void reg_borrar_todo(void);
