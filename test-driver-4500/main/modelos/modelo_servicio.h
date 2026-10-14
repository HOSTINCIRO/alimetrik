/* =====================================================================
 * ALIMETRIK - MODELO / Servicios del comedor
 * ---------------------------------------------------------------------
 * Define que servicios existen (desayuno, almuerzo, refrigerio...) y en
 * que franja horaria se entrega cada uno. Son CONFIGURABLES desde el
 * portal web y se guardan en la memoria permanente: cambiar un horario
 * no requiere reprogramar el equipo.
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

#define SRV_MAX          8
#define SRV_SIN_SERVICIO "Fuera de horario"
#define SRV_SIN_HORA     "Sin hora"

typedef struct {
    uint32_t id;
    char     nombre[24];    /* Desayuno, Almuerzo, Refrigerio, Cena... */
    uint16_t inicio;        /* minutos desde medianoche: 6:00 = 360     */
    uint16_t fin;           /* minutos desde medianoche: 10:00 = 600    */
    uint8_t  activo;        /* 0 = definido pero suspendido             */
    uint8_t  reserva;
} servicio_t;

/* Carga la tabla; si esta vacia crea los tres servicios habituales. */
void srv_cargar(void);

int  srv_cantidad(void);
const servicio_t *srv_por_indice(int i);
servicio_t *srv_por_id(uint32_t id);

/* Copia en 'destino' el nombre del servicio que corresponde a esa hora local.
 * Copia (no devuelve puntero) porque el portal puede borrar o renombrar la
 * fila mientras el lector la esta usando. destino >= 24 bytes. */
void srv_en_minuto(int minuto_del_dia, char *destino, size_t n);

/* true si el nombre corresponde a un servicio real (no "Fuera de horario"). */
bool srv_es_real(const char *nombre);

/* Alta, edicion y baja. Validan que la franja sea coherente y no se solape. */
uint32_t srv_crear(const char *nombre, int inicio, int fin);
bool srv_actualizar(uint32_t id, const char *nombre, int inicio, int fin, bool activo);
bool srv_borrar(uint32_t id);

/* Restaura los tres servicios habituales. */
void srv_restaurar_por_defecto(void);

/* Utilidades de formato: "07:30" <-> minutos. */
int  srv_texto_a_minutos(const char *hhmm);
void srv_minutos_a_texto(int minutos, char *destino);   /* destino >= 6 */
