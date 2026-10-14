file(GLOB LFS_SRCS "lfs/*.c")

# excluir archivos de I/O / salida ANSI-NIST que get_minutiae no necesita
list(FILTER LFS_SRCS EXCLUDE REGEX "(to_type9|update|results)\\.c$")

idf_component_register(
  SRCS "nbis_wrap.c" ${LFS_SRCS}
  INCLUDE_DIRS "include"
)

# NBIS es codigo antiguo: silenciar warnings, forzar prefijo (string/stdlib/stdio)
# -O2: el proyecto compila en modo DEBUG (-Og) y mindtct tardaba ~4.7s por huella;
# con -O2 (como se compila NBIS upstream) la extraccion baja drasticamente.
target_compile_options(${COMPONENT_LIB} PRIVATE
  -w -Wno-error -std=gnu99 -DNOVERBOSE -O2
  "-include${CMAKE_CURRENT_SOURCE_DIR}/nbis_prefix.h")
