#pragma once
#include <stdint.h>

/* Plantilla de huella: minucias en formato x,y,theta (NIST/bozorth). */
#define FP_MAX_MINUTIAE 200
#define FP_MATCH_THRESHOLD 14   /* >= 14 correspondencias = mismo dedo */
typedef struct {
    int nrows;
    int xcol[FP_MAX_MINUTIAE];
    int ycol[FP_MAX_MINUTIAE];
    int thetacol[FP_MAX_MINUTIAE];
} fp_template_t;

/* Extrae minucias de una imagen en gris de 8 bpp (ancho w, alto h, 500 dpi).
 * La imagen debe tener crestas OSCURAS sobre fondo claro.
 * Devuelve nº de minucias (>=0) o -1 si falla. Rellena *out. */
int fp_extraer(const uint8_t *imagen, int w, int h, fp_template_t *out);

/* Compara dos plantillas. Devuelve el puntaje bozorth (>=40 = match). */
int fp_comparar(const fp_template_t *a, const fp_template_t *b);
