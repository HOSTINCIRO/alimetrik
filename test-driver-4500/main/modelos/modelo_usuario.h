/* =====================================================================
 * ALIMETRIK - MODELO / Usuarios del sistema
 * ---------------------------------------------------------------------
 * Encargados que administran el comedor. La contrasena NUNCA se guarda
 * en texto plano: se almacena el resumen SHA-256 de (sal + contrasena),
 * que es un calculo de una sola via.
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stdint.h>

#define USR_MAX          16
#define USR_LARGO_HASH   32     /* SHA-256 = 32 bytes */
#define USR_LARGO_SAL    8

typedef enum {
    ROL_OPERADOR = 0,     /* solo kiosco del comedor y consulta */
    ROL_ADMIN    = 1,     /* ademas: alumnos, enrolamiento, configuracion */
} rol_t;

typedef struct {
    uint32_t id;
    char     usuario[24];
    char     nombre[48];
    uint8_t  sal[USR_LARGO_SAL];
    uint8_t  hash[USR_LARGO_HASH];
    uint8_t  rol;
    uint8_t  activo;
    uint32_t creado;
} usuario_t;

/* Carga la tabla; si esta vacia crea el administrador inicial
 * (usuario "admin", contrasena "admin123") que DEBE cambiarse. */
void usr_cargar(void);

int  usr_cantidad(void);
const usuario_t *usr_por_indice(int i);
usuario_t *usr_por_nombre(const char *usuario);

/* Comprueba credenciales. Devuelve el usuario o NULL si no coinciden. */
usuario_t *usr_verificar(const char *usuario, const char *clave);

bool usr_crear(const char *usuario, const char *nombre, const char *clave, rol_t rol);
bool usr_cambiar_clave(const char *usuario, const char *clave_nueva);
bool usr_borrar(uint32_t id);

/* true si la clave de "admin" sigue siendo la de fabrica (para avisar). */
bool usr_clave_por_defecto(void);
