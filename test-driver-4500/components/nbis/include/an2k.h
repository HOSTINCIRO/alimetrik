/* Stub minimo de an2k.h para ALIMETRIK.
 * Los tipos reales solo los usan funciones de salida ANSI-NIST (to_type9.c,
 * update.c) que NO compilamos. Basta con declaraciones adelantadas para que
 * las firmas en lfs.h compilen. */
#ifndef _AN2K_STUB_H
#define _AN2K_STUB_H

typedef struct ansi_nist_struct ANSI_NIST;
typedef struct record_struct RECORD;
typedef struct field_struct FIELD;
typedef struct subfield_struct SUBFIELD;
typedef struct item_struct ITEM;

#endif
