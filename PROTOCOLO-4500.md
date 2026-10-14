# Protocolo USB del DigitalPersona U.are.U 4500 (para portar a ESP32-P4)

Extraído del driver `uru4000.c` de libfprint (LGPL). Tu lector: **VID 0x05BA, PID 0x000A →
perfil `DP_URU4000B`**. Confirmado soportado (uru4000.c:1443).

## Buena noticia clave
- `DP_URU4000B` tiene **`auth_cr = FALSE`** → **NO requiere challenge-response AES** en el init.
  (El AES solo lo pide `MS_STANDALONE_V2`, un teclado Microsoft, no tu lector.)
- El "cifrado" de la imagen es un **scramble XOR con semilla que ELIGE el driver** — no hay que
  crackear nada; nosotros ponemos la semilla y des-scrambleamos. Y muchas veces la imagen vuelve
  en claro (si `calc_dev2(img) < ENC_THRESHOLD=5000`, ya está sin cifrar → usar directo).

## Endpoints USB
- `EP_INTR = 0x81` (endpoint 1, IN, INTERRUPT) — detección de dedo, paquetes de 64 bytes.
- `EP_DATA = 0x82` (endpoint 2, IN, BULK) — imagen de huella.
- Interface del lector: la que exponga la clase vendor (ver descriptores de la Capa 1).

## Acceso a registros (control transfers estándar)
`bRequest (USB_RQ) = 0x04`, `wIndex = 0`, `wValue = dirección del registro`, `wLength = nº regs`.

**Leer registro(s):** `bmRequestType = 0xC0` (VENDOR | DEVICE | IN). Devuelve `wLength` bytes.
**Escribir registro(s):** `bmRequestType = 0x40` (VENDOR | DEVICE | OUT). Data = valores.

En ESP-IDF: `usb_host_transfer_submit_control()` con un `usb_setup_packet_t` armado así.

## Registros
| Nombre | Dir | Uso |
|---|---|---|
| `REG_HWSTAT` | 0x07 | Estado HW. Bit7=low-power (hay que LIMPIARLO en init). Bit2=algo mal (rebootear). |
| `REG_SCRAMBLE_DATA_INDEX` | 0x33 | Escribir 5 bytes: [key_number, seed(4, little-endian)] |
| `REG_SCRAMBLE_DATA_KEY` | 0x34 | Leer 4 bytes: key ^ seed = llave real de descifrado |
| `REG_MODE` | 0x4e | Modo del lector (ver abajo) |
| `REG_DEVICE_INFO` | 0xf0 | Leer 16 bytes de info del dispositivo |
| `REG_RESPONSE` | 0x2000 | (solo auth_cr, no aplica al 4500) |
| `REG_CHALLENGE` | 0x2010 | (solo auth_cr, no aplica al 4500) |

## Modos (escribir en REG_MODE 0x4e)
`MODE_INIT=0x00`, `MODE_AWAIT_FINGER_ON=0x10`, `MODE_AWAIT_FINGER_OFF=0x12`,
`MODE_CAPTURE=0x20`, `MODE_CAPTURE_AUX=0x30`, `MODE_OFF=0x70`, `MODE_READY=0x80`.

## Códigos IRQ (leídos en EP_INTR 0x81, 2 bytes big-endian del paquete de 64)
- `0x56AA` = SCANPWR_ON (encendido del escáner, esperar esto tras el powerup)
- `0x0101` = FINGER_ON (dedo puesto → capturar)
- `0x0200` = FINGER_OFF (dedo retirado)
- `0x0800` = DEATH (error del dispositivo → reiniciar)

## Imagen
- `IMAGE_WIDTH = 384`, `IMAGE_HEIGHT = 290` (máx). 8 bpp escala de grises.
- Bulk read en EP_DATA: **64 bytes de cabecera** + `num_lines × 384` bytes de píxeles.
- `num_lines` viene en la cabecera. Validar `actual_length >= num_lines*384 + 64`.
- Detección de cifrado: `calc_dev2()` mide el "ruido". Si < 5000 → imagen en claro, usar directa.

## Secuencia de init (SSM del driver)
1. **REBOOTPWR**: escribir HWSTAT, leerlo, y hacer ciclos hasta que bit2 se limpie.
2. **POWERUP**: limpiar bit7 (low-power) de HWSTAT; esperar IRQ `0x56AA` (SCANPWR_ON).
3. Leer `REG_DEVICE_INFO` (0xf0, 16 bytes).
4. Para capturar: escribir `MODE_AWAIT_FINGER_ON` (0x10) → esperar IRQ 0x0101 →
   escribir `MODE_CAPTURE` (0x20) → bulk read imagen → (descramble si cifrada) →
   `MODE_AWAIT_FINGER_OFF` (0x12) → esperar IRQ 0x0200.

## Notas de portabilidad a ESP-IDF
- Todo es control + bulk + interrupt transfers estándar → `usb_host` de ESP-IDF los soporta.
- El descramble XOR es C puro, va directo.
- HWSTAT es delicado (comentario del driver: "me causó muchos dolores de cabeza"). Copiar la
  máquina de estados REBOOTPWR/POWERUP tal cual (uru4000.c líneas ~860-1060).
- Fuente completa clonada en: /tmp/uru_ref/libfprint/drivers/uru4000.c (1474 líneas).
