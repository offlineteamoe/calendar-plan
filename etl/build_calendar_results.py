# -*- coding: utf-8 -*-
"""
Convierte los JSON de resultados de Spotfire en el archivo compacto que lee la
pestana Resultados del calendario.

POR QUE ESTE PASO EXISTE
------------------------
La fuente son 8 archivos (marca x region) que suman ~77 MB; OE-LATAM.json solo
ya pesa 30 MB. Descargarlos desde el navegador en cada carga seria de varios
segundos por archivo, y cambiar de marca obligaria a bajar otro tanto. Aqui se
reducen a UN archivo de pocos cientos de KB: solo el channel grouping
"Brand TV Channels", solo las ocho cifras que las metricas necesitan, y ya
agrupado por los territorios que usa el calendario (LatAm excl. MX y AR,
Mexico, Argentina, Brasil).

La salida queda en la misma carpeta de Drive que las fuentes, asi que la web la
lee con la sesion de Google de quien entra y no hace falta copiar nada a
Firestore.

RUTAS
-----
Las rutas de origen NO se escriben aqui: se leen de "Reglas y Rutas.xlsx"
(fila "Data MCP Marketing Spotfire"), que es el archivo que el equipo mantiene
cuando algo se mueve de sitio. Ver etl/README.md.

USO
---
    python etl/build_calendar_results.py            # rutas desde el Excel
    python etl/build_calendar_results.py --src DIR  # o una carpeta explicita
"""

from __future__ import annotations

import argparse
import datetime as dt
import io
import json
import os

RULES_XLSX = (
    "G:\\Unidades compartidas\\Proyectos Automatizaci\u00f3n Branformance"
    "\\30-Calendario Planeaci\u00f3n\\Raw Data\\Reglas y Rutas.xlsx"
)
RULES_ROW = "Data MCP Marketing Spotfire"

OUTPUT_NAME = "calendar-results.json"

# El calendario tiene dos marcas; cada una tiene su propio deck por region.
# OE = Open English (adulto, OEA en el calendario), JR = Open English Junior.
DECKS = {
    ("OEA", "LT_EXCL_MX_AR"): "OE-LATAM",
    ("OEA", "MX"): "OE-LATAM",
    ("OEA", "AR"): "OE-LATAM",
    ("OEA", "BR"): "OE-BR",
    ("OEJR", "LT_EXCL_MX_AR"): "JR-LATAM",
    ("OEJR", "MX"): "JR-LATAM",
    ("OEJR", "AR"): "JR-LATAM",
    ("OEJR", "BR"): "JR-BR",
}

CHANNEL = "Brand TV Channels"

# Paises que el deck LATAM trae y que NO son Mexico ni Argentina. Es una lista
# cerrada a proposito, no un "todo lo que no sea MX/AR": el origen tambien trae
# un codigo de agregacion 'LATAM' que no es un pais real y que inflaria el
# bloque. Misma decision que toma el pipeline de los decks (viewBuilder.js,
# LATAM_RESIDUAL) y por la misma razon.
REST_OF_LATAM = {
    "Colombia", "Chile", "Ecuador", "Peru", "Costa Rica",
    "Bolivia", "Dominican Republic", "El Salvador", "Guatemala", "Honduras",
    "Nicaragua", "Panama", "Paraguay", "Uruguay",
    # Compra de TV hecha al bloque entero, no a un pais: es exactamente lo que
    # el calendario llama "LatAm (excl. MX y AR)".
    "TV LATAM Excl Arg Mex",
}

# Media Spend = solo estos Types dentro de Brand TV Channels. Lista dictada por
# el equipo de medios: es la inversion de medios propiamente dicha, sin buscador
# de marca ni trafico propio (Direct, SEO, Mobile App, Agent Created...).
# Incluye tipos que hoy no aparecen en los datos (Radio, CTV-DV360): estan
# previstos para cuando se compren.
MEDIA_SPEND_TYPES = {
    "BrandLift Media",
    "BrandLift Production",
    "CTV",
    "CTV-DV360",
    "Out of Home",
    "Radio",
    "TV Cable",
    "TV Open Air",
    "Web QR Code",
    "WhatsApp Web",
}


def region_of(country, deck):
    """Territorio del calendario al que pertenece una fila, o None si se descarta."""
    if deck.endswith("-BR"):
        return "BR" if country == "Brazil" else None
    if country == "Mexico":
        return "MX"
    if country == "Argentina":
        return "AR"
    if country in REST_OF_LATAM:
        return "LT_EXCL_MX_AR"
    return None  # 'LATAM' y cualquier codigo de agregacion futuro


def source_dir_from_rules():
    """Lee la ruta de los JSON de Spotfire del Excel de rutas del equipo."""
    try:
        import openpyxl
    except ImportError:
        raise SystemExit("Falta openpyxl: pip install openpyxl")
    if not os.path.exists(RULES_XLSX):
        raise SystemExit("No se encuentra el Excel de rutas:\n  " + RULES_XLSX)
    wb = openpyxl.load_workbook(RULES_XLSX, data_only=True)
    ws = wb.worksheets[0]
    for row in ws.iter_rows(values_only=True):
        if row and row[0] and str(row[0]).strip() == RULES_ROW:
            path = str(row[-1]).strip()
            if path:
                return path
            break
    raise SystemExit('El Excel de rutas no tiene una fila "%s" con ruta.' % RULES_ROW)


def load_deck(src, deck):
    path = os.path.join(src, deck + ".json")
    if not os.path.exists(path):
        raise SystemExit("No se encuentra el deck %s:\n  %s" % (deck, path))
    with io.open(path, encoding="utf-8") as fh:
        return json.load(fh)


# Las ocho cifras por dia y territorio de las que salen todas las metricas.
# Se guardan sumadas, nunca divididas: el promedio de unas razones no es la
# razon del total, asi que CPL, conversion, %MNCC y Full CM % Short se calculan
# en la web sobre la suma del rango que el usuario tenga filtrado.
FIELDS = ("leads", "spend", "media", "sales", "cash", "cm", "rev", "enr")


def build(src):
    acc = {}  # (marca, region) -> fecha -> campo -> valor
    decks_needed = sorted(set(DECKS.values()))
    cache = {}

    def cell(brand, region, date):
        scope = acc.setdefault((brand, region), {})
        row = scope.get(date)
        if row is None:
            row = dict.fromkeys(FIELDS, 0.0)
            scope[date] = row
        return row

    for deck in decks_needed:
        cache[deck] = load_deck(src, deck)

    for (brand, region), deck in DECKS.items():
        data = cache[deck]

        for r in data.get("dailyRows", []):
            if r.get("channel_grouping") != CHANNEL:
                continue
            if region_of(r.get("country", ""), deck) != region:
                continue
            c = cell(brand, region, r["date"])
            c["leads"] += r.get("leadsEligible") or 0
            c["spend"] += r.get("spend") or 0.0
            c["sales"] += r.get("coreEnrollmentsTotal") or 0
            c["cash"] += r.get("newCashCore") or 0.0

        for r in data.get("channelKpiRows", []):
            if r.get("channel_grouping") != CHANNEL:
                continue
            if region_of(r.get("country", ""), deck) != region:
                continue
            c = cell(brand, region, r["date"])
            c["cm"] += r.get("fullCmShortUsd") or 0.0
            c["rev"] += r.get("projRevShortTotal") or 0.0
            c["enr"] += r.get("totalEnrollments") or 0

        # brandedTypeRows ya viene filtrado a Brand TV Channels en origen; aqui
        # solo se acota a los Types que cuentan como inversion de medios.
        for r in data.get("brandedTypeRows", []):
            if r.get("type") not in MEDIA_SPEND_TYPES:
                continue
            if region_of(r.get("country", ""), deck) != region:
                continue
            c = cell(brand, region, r["date"])
            c["media"] += r.get("spend") or 0.0

    all_dates = sorted(set(d for scope in acc.values() for d in scope))
    if not all_dates:
        raise SystemExit("Los decks no trajeron ninguna fila de Brand TV Channels.")

    # Indice de fechas denso: un hueco en un territorio no desalinea a los demas
    # y la web puede buscar por fecha con un solo mapa.
    start = dt.date(*[int(x) for x in all_dates[0].split("-")])
    end = dt.date(*[int(x) for x in all_dates[-1].split("-")])
    dates = []
    cursor = start
    while cursor <= end:
        dates.append(cursor.isoformat())
        cursor += dt.timedelta(days=1)

    counters = ("leads", "sales", "enr")
    scopes = {}
    for key in sorted(acc):
        brand, region = key
        by_date = acc[key]
        cols = dict((f, []) for f in FIELDS)
        for d in dates:
            row = by_date.get(d)
            for f in FIELDS:
                v = row[f] if row else 0.0
                # Los contadores son enteros; el dinero, dos decimales.
                # Redondear aqui quita ruido de coma flotante y recorta el archivo.
                cols[f].append(int(round(v)) if f in counters else round(v, 2))
        scopes[brand + "|" + region] = cols

    generated = cache[decks_needed[0]].get("generatedAt") or {}
    return {
        "schema": 1,
        "generatedAt": dt.datetime.now().replace(microsecond=0).isoformat(),
        "sourceRefreshedAt": generated,
        "channelGrouping": CHANNEL,
        "mediaSpendTypes": sorted(MEDIA_SPEND_TYPES),
        "fields": list(FIELDS),
        "dates": dates,
        "scopes": scopes,
    }


def main():
    ap = argparse.ArgumentParser(description="Construye calendar-results.json")
    ap.add_argument("--src", help="Carpeta con los JSON de Spotfire (por defecto, la del Excel de rutas)")
    ap.add_argument("--out", help="Carpeta de salida (por defecto, la misma del origen)")
    args = ap.parse_args()

    src = args.src or source_dir_from_rules()
    out_dir = args.out or src
    print("Origen : " + src)

    payload = build(src)

    out_path = os.path.join(out_dir, OUTPUT_NAME)
    with io.open(out_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"), ensure_ascii=False)

    size_kb = os.path.getsize(out_path) / 1024.0
    print("Salida : " + out_path)
    print("         %d dias x %d calendarios, %.0f KB" % (len(payload["dates"]), len(payload["scopes"]), size_kb))
    print("         datos hasta " + payload["dates"][-1])


if __name__ == "__main__":
    main()
