#!/bin/bash
# ALIMETRIK - reaplica los parches a los componentes descargados.
#
# esp_hosted se auto-arranca por __attribute__((constructor)) ANTES de app_main,
# agota la RAM interna y la placa entra en BUCLE DE REINICIO
# (assert esp_startup_start_app). El parche vacia ese constructor; el firmware
# llama esp_hosted_init() a mano desde controlador_red.c.
#
# La carpeta managed_components/ NO se guarda en git (la descarga idf.py), asi
# que tras clonar el proyecto hay que ejecutar este script UNA VEZ:
#
#   idf.py reconfigure          # descarga los componentes
#   ./parches/aplicar-parches.sh
#   idf.py build
set -e
cd "$(dirname "$0")/.."
DEST="managed_components/espressif__esp_hosted/host/port/esp/freertos/src/port_esp_hosted_host_init.c"
if [ ! -f "$DEST" ]; then
  echo "No existe $DEST"
  echo "Ejecute primero:  idf.py reconfigure"
  exit 1
fi
cp parches/port_esp_hosted_host_init.c "$DEST"
echo "Parche de esp_hosted aplicado (auto-arranque desactivado)."
