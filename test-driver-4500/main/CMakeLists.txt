# ALIMETRIK - registro del componente principal (arquitectura MVC)
idf_component_register(
    SRCS
        # Punto de entrada
        "main.c"
        # MODELOS: datos y reglas de negocio
        "modelos/almacenamiento.c"
        "modelos/modelo_estudiante.c"
        "modelos/modelo_biometrico.c"
        "modelos/modelo_registro.c"
        "modelos/modelo_usuario.c"
        "modelos/modelo_servicio.c"
        # VISTAS: presentacion de datos
        "vistas/vista_json.c"
        # CONTROLADORES: coordinacion
        "controladores/controlador_auth.c"
        "controladores/controlador_red.c"
        "controladores/controlador_web.c"
        "controladores/controlador_lector.c"
    INCLUDE_DIRS
        "." "modelos" "vistas" "controladores"
    # Vistas HTML incrustadas en la memoria del programa
    EMBED_TXTFILES
        "vistas/vista_sistema.html"
        "vistas/vista_login.html"
        "vistas/vista_terminos.html"
    PRIV_REQUIRES
        usb esp_psram esp_timer nbis fatfs wear_levelling
        esp_wifi esp_netif esp_event nvs_flash lwip esp_wifi_remote
        espressif__esp_hosted esp_http_server mbedtls
)
