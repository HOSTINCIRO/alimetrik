/* =====================================================================
 * ALIMETRIK - MODELO / Estudiantes
 * ---------------------------------------------------------------------
 * Ficha del beneficiario del comedor y su AUTORIZACION de tratamiento
 * de datos biometricos (Ley 1581 de 2012, art. 5, 6 y 9; Decreto 1377
 * de 2013, art. 12 para menores de edad).
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stdint.h>

#define EST_MAX   1000

typedef struct {
    uint32_t id;
    char     documento[24];
    char     nombre[40];
    char     apellido[40];
    char     grado[12];
    uint8_t  activo;
    uint32_t creado;
    /* ---- Consentimiento informado (dato sensible: huella dactilar) ---- */
    uint8_t  autorizacion;        /* 1 = autorizo el tratamiento biometrico */
    char     acudiente[60];       /* representante legal que autoriza */
    char     doc_acudiente[24];   /* su documento de identidad */
    char     fecha_autoriza[12];  /* YYYY-MM-DD en que autorizo */
} estudiante_t;

/* Carga la tabla desde la memoria permanente (migra el formato anterior). */
void est_cargar(void);

int  est_cantidad(void);
const estudiante_t *est_por_indice(int i);
estudiante_t *est_por_id(uint32_t id);
estudiante_t *est_por_documento(const char *documento);

/* Alta. Devuelve el id nuevo, o 0 si no se pudo guardar (memoria llena) o
 * si falta la autorizacion de tratamiento de datos. */
uint32_t est_crear(const char *documento, const char *nombre, const char *apellido,
                   const char *grado, bool autorizacion, const char *acudiente,
                   const char *doc_acudiente, const char *fecha);

bool est_actualizar(uint32_t id, const char *documento, const char *nombre,
                    const char *apellido, const char *grado, bool activo);

/* Baja: elimina al estudiante. Las huellas asociadas las borra el modelo
 * biometrico (derecho de supresion, Ley 1581 art. 8 lit. e). */
bool est_borrar(uint32_t id);

/* Revoca la autorizacion: desactiva y marca sin consentimiento. */
bool est_revocar_autorizacion(uint32_t id);

/* Utilidades de mantenimiento. */
int  est_borrar_pruebas(void);      /* documentos que empiezan por "TEST" */
int  est_borrar_todos(void);        /* deja la tabla vacia (reinicio de datos) */
bool est_guardar_todo(void);
