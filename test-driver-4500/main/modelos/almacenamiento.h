/* =====================================================================
 * ALIMETRIK - MODELO / Capa de almacenamiento persistente
 * ---------------------------------------------------------------------
 * Responsabilidad: montar la memoria flash (FATFS con nivelado de
 * desgaste) y ofrecer a los demas modelos primitivas seguras para
 * guardar y cargar sus tablas, mas el cerrojo que evita que dos tareas
 * escriban a la vez.
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define ALM_BASE   "/almacen"

/* Monta la particion de datos. Devuelve true si quedo lista para usarse. */
bool alm_montar(void);

/* Cerrojo compartido por TODOS los modelos (recursivo). */
void alm_lock(void);
void alm_unlock(void);

/* Guardado completo de una tabla: [n][elem][elem]...
 * Devuelve false si la flash rechazo la escritura (disco lleno, error). */
bool alm_guardar_tabla(const char *ruta, const void *datos, size_t elem, int n);

/* Anexa SOLO el ultimo elemento y actualiza el contador de la cabecera.
 * Mucho mas rapido que reescribir toda la tabla (escribir en flash congela
 * el firmware). Si el archivo no existe o esta desincronizado, devuelve
 * false para que el llamador haga un guardado completo. */
bool alm_anexar(const char *ruta, const void *datos, size_t elem, int n_total);

/* Carga una tabla. Devuelve cuantos elementos se leyeron realmente. */
int alm_cargar_tabla(const char *ruta, void *datos, size_t elem, int maxn);

/* Espacio de la particion de datos, en bytes. */
void alm_espacio(size_t *total, size_t *libre);
