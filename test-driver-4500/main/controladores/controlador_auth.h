/* =====================================================================
 * ALIMETRIK - CONTROLADOR / Autenticacion y sesiones
 * ---------------------------------------------------------------------
 * Valida las credenciales del encargado y mantiene su sesion mediante
 * una cookie con un identificador aleatorio. Las sesiones viven en
 * memoria y caducan por inactividad.
 * ===================================================================== */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_http_server.h"
#include "modelo_usuario.h"

#define AUTH_MAX_SESIONES   8
#define AUTH_LARGO_TOKEN    33     /* 32 caracteres hex + fin de cadena */
#define AUTH_CADUCIDAD_MIN  480    /* 8 horas de inactividad */

typedef struct {
    char     token[AUTH_LARGO_TOKEN];
    uint32_t usuario_id;
    char     usuario[24];
    char     nombre[48];
    uint8_t  rol;
    int64_t  ultimo_uso;      /* microsegundos desde el arranque */
    bool     usada;
} sesion_t;

/* Abre sesion si las credenciales son correctas. Devuelve la sesion o NULL. */
sesion_t *auth_iniciar_sesion(const char *usuario, const char *clave);

/* Cierra la sesion del token indicado. */
void auth_cerrar_sesion(const char *token);

/* Devuelve la sesion valida de la peticion (lee la cookie) o NULL. */
sesion_t *auth_sesion_de(httpd_req_t *req);

/* Exige sesion: si no hay, responde 401 y devuelve NULL.
 * Si solo_admin es true, exige ademas el rol de administrador (403). */
sesion_t *auth_exigir(httpd_req_t *req, bool solo_admin);

int auth_sesiones_activas(void);

/* Cierra TODAS las sesiones abiertas de un usuario (al borrarlo o al cambiar
 * su contrasena): de lo contrario seguiria operando con la sesion vieja. */
void auth_cerrar_sesiones_de(uint32_t usuario_id);
