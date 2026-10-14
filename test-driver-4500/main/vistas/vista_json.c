/* ALIMETRIK - VISTA / JSON: implementacion. */
#include "vista_json.h"
#include <stdio.h>
#include <string.h>

const char *json_escapar(char *destino, size_t n, const char *origen)
{
    size_t o = 0;
    if (!origen) origen = "";
    for (; *origen && o + 2 < n; origen++) {
        unsigned char c = (unsigned char)*origen;
        if (c == '"' || c == '\\') { destino[o++] = '\\'; destino[o++] = c; }
        else if (c == '\n') { destino[o++] = '\\'; if (o + 1 < n) destino[o++] = 'n'; }
        else if (c < 0x20) { /* se omiten los caracteres de control */ }
        else destino[o++] = c;
    }
    destino[o] = 0;
    return destino;
}

int json_estudiante(char *destino, size_t n, const estudiante_t *e, int huellas, bool primero)
{
    /* json_escapar DUPLICA comillas y barras: el destino necesita el doble
     * del campo origen mas el fin de cadena. */
    char doc[50], nom[82], ape[82], gra[26], acu[122];
    return snprintf(destino, n,
        "%s{\"id\":%u,\"documento\":\"%s\",\"nombre\":\"%s\",\"apellido\":\"%s\","
        "\"grado\":\"%s\",\"activo\":%d,\"huellas\":%d,\"autorizacion\":%d,\"acudiente\":\"%s\"}",
        primero ? "" : ",", (unsigned)e->id,
        json_escapar(doc, sizeof(doc), e->documento),
        json_escapar(nom, sizeof(nom), e->nombre),
        json_escapar(ape, sizeof(ape), e->apellido),
        json_escapar(gra, sizeof(gra), e->grado),
        e->activo, huellas, e->autorizacion,
        json_escapar(acu, sizeof(acu), e->acudiente));
}

int json_registro(char *destino, size_t n, const registro_t *r, const char *nombre, bool primero)
{
    char nom[182], sv[50], rs[42], hr[22];
    return snprintf(destino, n,
        "%s{\"id\":%u,\"nombre\":\"%s\",\"servicio\":\"%s\",\"resultado\":\"%s\","
        "\"fecha\":\"%s\",\"hora\":\"%s\",\"score\":%d}",
        primero ? "" : ",", (unsigned)r->id,
        json_escapar(nom, sizeof(nom), nombre),
        json_escapar(sv, sizeof(sv), r->servicio),
        json_escapar(rs, sizeof(rs), r->resultado),
        r->fecha,
        json_escapar(hr, sizeof(hr), r->hora),
        r->score);
}
