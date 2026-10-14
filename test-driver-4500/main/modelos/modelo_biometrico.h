/* =====================================================================
 * ALIMETRIK - MODELO / Biometria
 * ---------------------------------------------------------------------
 * Guarda las PLANTILLAS de minucias (no imagenes de huella) y resuelve
 * la identificacion 1:N. Principio de minimizacion de datos: de la
 * huella solo se conservan coordenadas y angulos, con los que NO se
 * puede reconstruir el dedo.
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "nbis_wrap.h"
#include "modelo_estudiante.h"

#define BIO_MAX_HUELLAS   3000
#define BIO_MUESTRAS      3      /* muestras por dedo al enrolar */

typedef struct {
    uint32_t       estudiante_id;
    char           dedo[24];
    fp_template_t  plantilla;
} huella_t;

typedef struct {
    bool         encontrado;
    estudiante_t estudiante;
    int          score;
} identificacion_t;

void bio_cargar(void);
int  bio_cantidad(void);                    /* total de plantillas */
int  bio_cantidad_de(uint32_t estudiante_id);

/* Enrola una plantilla. Exige que el estudiante tenga autorizacion vigente. */
bool bio_agregar(uint32_t estudiante_id, const char *dedo, const fp_template_t *t);

/* Identificacion 1:N contra todas las plantillas. */
identificacion_t bio_identificar(const fp_template_t *t);

/* Supresion de los datos biometricos de una persona (derecho de supresion). */
int  bio_borrar_de(uint32_t estudiante_id);
void bio_borrar_todo(void);
bool bio_guardar_todo(void);
