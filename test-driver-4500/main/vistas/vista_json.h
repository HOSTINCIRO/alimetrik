/* =====================================================================
 * ALIMETRIK - VISTA / Presentacion en formato JSON
 * ---------------------------------------------------------------------
 * Convierte los datos de los modelos al texto que consume la interfaz
 * web. Es la "vista" de la API: aqui se decide QUE se muestra y COMO,
 * sin logica de negocio.
 * ===================================================================== */
#pragma once
#include <stddef.h>
#include "modelos/modelo_estudiante.h"
#include "modelos/modelo_registro.h"

/* Escapa un texto para incrustarlo entre comillas en JSON. */
const char *json_escapar(char *destino, size_t n, const char *origen);

/* Serializa una ficha de estudiante (sin datos biometricos). */
int json_estudiante(char *destino, size_t n, const estudiante_t *e, int huellas, bool primero);

/* Serializa un registro de entrega, resolviendo el nombre del alumno. */
int json_registro(char *destino, size_t n, const registro_t *r, const char *nombre, bool primero);
