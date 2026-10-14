/* =====================================================================
 * ALIMETRIK - CONTROLADOR / Servidor web
 * ---------------------------------------------------------------------
 * Publica la interfaz y la API. Decide que puede hacer cada usuario
 * segun su sesion y su rol, invoca a los modelos y devuelve la vista.
 * ===================================================================== */
#pragma once
#include <stdbool.h>

bool web_iniciar(void);

/* Autoprueba interna: la placa se consulta a si misma y reporta latencias. */
void web_autoprueba(void);
