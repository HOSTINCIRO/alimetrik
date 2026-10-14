/* Wrapper NBIS para ALIMETRIK:
 *  - extraccion de minucias con mindtct/lfs (get_minutiae) — NBIS del NIST.
 *  - comparacion con un matcher PROPIO ligero (alineacion rigida + conteo de
 *    correspondencias), en vez de bozorth3 (que diverge en 32-bit y pide 46MB).
 *    Validado contra bozorth: mismo dedo 22-29 correspondencias, distinto <=6.
 */
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <math.h>
#include <stdbool.h>
#include <stdint.h>
#include "nbis_wrap.h"
#include <lfs.h>

extern LFSPARMS lfsparms_V2;

/* conversion LFS -> NIST (definida en xytreps.c de lfs) */
void lfs2nist_minutia_XYT(int *ox, int *oy, int *ot, const MINUTIA *minutia,
                          const int iw, const int ih);

int fp_extraer(const uint8_t *imagen, int w, int h, fp_template_t *out)
{
    MINUTIAE *minutiae = NULL;
    int *quality_map = NULL, *direction_map = NULL, *low_contrast_map = NULL;
    int *low_flow_map = NULL, *high_curve_map = NULL;
    int map_w = 0, map_h = 0;
    unsigned char *bdata = NULL;
    int bw = 0, bh = 0, bd = 0;
    const double ppmm = 500.0 / 25.4;   /* 500 dpi */

    int ret = get_minutiae(&minutiae, &quality_map, &direction_map,
                           &low_contrast_map, &low_flow_map, &high_curve_map,
                           &map_w, &map_h, &bdata, &bw, &bh, &bd,
                           (unsigned char *)imagen, w, h, 8, ppmm, &lfsparms_V2);
    if (ret) return -1;

    int n = minutiae->num;
    if (n > FP_MAX_MINUTIAE) n = FP_MAX_MINUTIAE;
    out->nrows = n;
    for (int i = 0; i < n; i++) {
        int ox, oy, ot;
        lfs2nist_minutia_XYT(&ox, &oy, &ot, minutiae->list[i], w, h);
        out->xcol[i] = ox;
        out->ycol[i] = oy;
        out->thetacol[i] = ot;
    }

    free_minutiae(minutiae);
    if (quality_map) free(quality_map);
    if (direction_map) free(direction_map);
    if (low_contrast_map) free(low_contrast_map);
    if (low_flow_map) free(low_flow_map);
    if (high_curve_map) free(high_curve_map);
    if (bdata) free(bdata);
    return n;
}

/* ---- matcher propio ---- */

#define FP_DIST_TOL   11      /* tolerancia de posicion (pixeles) */
#define FP_DIST_TOL2  (FP_DIST_TOL * FP_DIST_TOL)
#define FP_ANG_TOL    20      /* tolerancia de angulo (grados) */

static int ang_diff(int a, int b)
{
    int d = abs((a - b) % 360);
    return d < 360 - d ? d : 360 - d;
}

/* Rejilla espacial de la galeria (B) para busqueda O(1) del vecino cercano. */
#define GRID_CELL   FP_DIST_TOL       /* tamano de celda = tolerancia */
#define GRID_W      40                /* 40*11 = 440 px cubre 384 de ancho */
#define GRID_H      32                /* 32*11 = 352 px cubre 290 de alto  */
#define GRID_CAP    6                 /* max minucias por celda */

static int16_t s_grid[GRID_W][GRID_H][GRID_CAP];
static uint8_t s_gridn[GRID_W][GRID_H];

/* seno/coseno en grados enteros (tabla), evita float en el bucle caliente */
static float s_cos[360], s_sin[360];
static bool s_trig_listo = false;

static void trig_init(void)
{
    for (int d = 0; d < 360; d++) {
        s_cos[d] = cosf(d * (float)(M_PI / 180.0));
        s_sin[d] = sinf(d * (float)(M_PI / 180.0));
    }
    s_trig_listo = true;
}

int fp_comparar(const fp_template_t *A, const fp_template_t *B)
{
    int na = A->nrows, nb = B->nrows;
    if (na < 4 || nb < 4) return 0;
    if (!s_trig_listo) trig_init();

    /* construir la rejilla de B una sola vez */
    memset(s_gridn, 0, sizeof(s_gridn));
    for (int q = 0; q < nb; q++) {
        int cx = B->xcol[q] / GRID_CELL, cy = B->ycol[q] / GRID_CELL;
        if (cx < 0) cx = 0; if (cx >= GRID_W) cx = GRID_W - 1;
        if (cy < 0) cy = 0; if (cy >= GRID_H) cy = GRID_H - 1;
        if (s_gridn[cx][cy] < GRID_CAP) s_grid[cx][cy][s_gridn[cx][cy]++] = (int16_t)q;
    }

    static char usado[FP_MAX_MINUTIAE];
    int best = 0;

    for (int ia = 0; ia < na; ia++) {
        for (int jb = 0; jb < nb; jb++) {
            int dth = ((B->thetacol[jb] - A->thetacol[ia]) % 360 + 360) % 360;
            float c = s_cos[dth], s = s_sin[dth];
            int xi = A->xcol[ia], yi = A->ycol[ia];
            int xj = B->xcol[jb], yj = B->ycol[jb];

            memset(usado, 0, nb);
            int cnt = 0;
            for (int p = 0; p < na; p++) {
                float dx = A->xcol[p] - xi, dy = A->ycol[p] - yi;
                int nx = (int)(xj + (dx * c - dy * s));
                int ny = (int)(yj + (dx * s + dy * c));
                int nt = (A->thetacol[p] + dth) % 360;
                /* buscar en las celdas 3x3 alrededor de (nx,ny) */
                int cx = nx / GRID_CELL, cy = ny / GRID_CELL;
                int mejor = -1, mejord = FP_DIST_TOL2 + 1;
                for (int gx = cx - 1; gx <= cx + 1; gx++) {
                    if (gx < 0 || gx >= GRID_W) continue;
                    for (int gy = cy - 1; gy <= cy + 1; gy++) {
                        if (gy < 0 || gy >= GRID_H) continue;
                        for (int k = 0; k < s_gridn[gx][gy]; k++) {
                            int q = s_grid[gx][gy][k];
                            if (usado[q]) continue;
                            int ex = nx - B->xcol[q], ey = ny - B->ycol[q];
                            int dd = ex * ex + ey * ey;
                            if (dd <= FP_DIST_TOL2 && dd < mejord &&
                                ang_diff(nt, B->thetacol[q]) < FP_ANG_TOL) {
                                mejord = dd; mejor = q;
                            }
                        }
                    }
                }
                if (mejor >= 0) { usado[mejor] = 1; cnt++; }
            }
            if (cnt > best) best = cnt;
        }
    }
    return best;
}
