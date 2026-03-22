"""
generate_report.py - Genera il JSON per il report annuale interattivo.

Carica i dati del progetto, calcola variazioni anno-su-anno per l'anno target
e produce public/data/report_{anno}.json per il frontend.

Uso: python generate_report.py [--anno 2024]

Dipendenze: numpy, pandas, pymannkendall (via generate_insights)
"""

import argparse
import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from generate_insights import (
    COVID_YEARS,
    DATA_DIR,
    PROJECT_ROOT,
    calc_year_on_year,
    load_json,
    run_mann_kendall,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# Soglia minima valore assoluto per includere un reato nel top crescita/calo.
# Variazioni % su numeri piccoli sono rumore statistico.
MIN_ABS_REPORT = 100


def _fix_accenti(text: str) -> str:
    """Sostituisce apostrofi usati come accenti (dalla pipeline ISTAT) con accenti."""
    import re
    mapping = {"a": "à", "e": "è", "i": "ì", "o": "ò", "u": "ù"}
    def _replace(m: re.Match) -> str:
        return mapping[m.group(1)] + m.group(2)
    return re.sub(r"([aeiou])'(\s|$|,|\.|;|:|\))", _replace, text)


# Ripartizioni per delitti_regioni.json (ITD12 = Trentino-Alto Adige unificato)
RIPARTIZIONI_DELITTI = {
    "Nord": {"ITC1", "ITC2", "ITC3", "ITC4", "ITD12", "ITD3", "ITD4", "ITD5"},
    "Centro": {"ITE1", "ITE2", "ITE3", "ITE4"},
    "Sud e Isole": {"ITF1", "ITF2", "ITF3", "ITF4", "ITF5", "ITF6", "ITG1", "ITG2"},
}


def _trend_strutturale_with_covid(
    series: np.ndarray, anni: np.ndarray
) -> str:
    """Mann-Kendall escludendo anni COVID."""
    mask = ~np.isin(anni, list(COVID_YEARS))
    clean = series[mask]
    if len(clean) >= 5:
        return run_mann_kendall(clean)["mk_trend"]
    return run_mann_kendall(series)["mk_trend"]


def build_executive_summary(
    df_italia: pd.DataFrame, target_year: int
) -> dict:
    """Numeri chiave del report: tasso, variazione, media storica."""
    df = df_italia.sort_values("Anno")
    row_curr = df[df["Anno"] == target_year]
    row_prev = df[df["Anno"] == target_year - 1]
    if row_curr.empty or row_prev.empty:
        raise ValueError(
            f"Dati mancanti per {target_year} o {target_year - 1} in delitti_italia"
        )

    tasso_curr = float(row_curr.iloc[0]["Tasso_per_1000"])
    tasso_prev = float(row_prev.iloc[0]["Tasso_per_1000"])
    variazione_pct = (tasso_curr - tasso_prev) / abs(tasso_prev) * 100

    # Media storica (tutti gli anni disponibili escluso il target)
    media_storica = float(df[df["Anno"] < target_year]["Tasso_per_1000"].mean())

    return {
        "tasso_totale": round(tasso_curr, 2),
        "tasso_precedente": round(tasso_prev, 2),
        "variazione_pct": round(variazione_pct, 1),
        "media_storica": round(media_storica, 2),
        "popolazione": int(row_curr.iloc[0]["Popolazione"]),
        "delitti_totali": int(row_curr.iloc[0]["Delitti"]),
    }


def build_top_variazioni(
    df_avt: pd.DataFrame, target_year: int, n: int = 5
) -> tuple[list[dict], list[dict]]:
    """Top N reati in crescita e in calo per variazione anno-su-anno.

    Usa solo OFFEND + colonna 'totale' per i singoli reati con dati nel target_year.
    Esclude TOT (assente 2023-2024).
    """
    offend = df_avt[
        (df_avt["data_type"] == "OFFEND")
        & (df_avt["codice_reato"] != "TOT")
    ].copy()

    results = []
    for codice_reato, grp in offend.groupby("codice_reato"):
        grp = grp.sort_values("anno")
        anni = grp["anno"].values
        totali = grp["totale"].values.astype(float)
        yoy = calc_year_on_year(totali, anni, target_year)
        if np.isnan(yoy["yoy_pct"]):
            continue
        if max(yoy["curr_value"], yoy["prev_value"]) < MIN_ABS_REPORT:
            continue
        # Trend strutturale
        trend = _trend_strutturale_with_covid(totali, anni)
        results.append({
            "reato": _fix_accenti(grp["reato"].iloc[0]),
            "codice": str(codice_reato),
            "yoy_pct": round(yoy["yoy_pct"], 1),
            "valore_corrente": int(yoy["curr_value"]),
            "valore_precedente": int(yoy["prev_value"]),
            "trend_strutturale": trend,
        })

    df_res = pd.DataFrame(results)
    if df_res.empty:
        return [], []

    top_crescita = (
        df_res.sort_values("yoy_pct", ascending=False)
        .head(n)
        .to_dict("records")
    )
    top_calo = (
        df_res.sort_values("yoy_pct", ascending=True)
        .head(n)
        .to_dict("records")
    )
    return top_crescita, top_calo


def build_variazione_regioni(
    df_regioni: pd.DataFrame, target_year: int
) -> list[dict]:
    """Variazione tasso per regione rispetto all'anno precedente."""
    results = []
    for _, grp in df_regioni.groupby("REF_AREA"):
        grp = grp.sort_values("Anno")
        row_curr = grp[grp["Anno"] == target_year]
        row_prev = grp[grp["Anno"] == target_year - 1]
        if row_curr.empty or row_prev.empty:
            continue
        tasso_curr = float(row_curr.iloc[0]["Tasso_per_1000"])
        tasso_prev = float(row_prev.iloc[0]["Tasso_per_1000"])
        var_pct = (tasso_curr - tasso_prev) / abs(tasso_prev) * 100
        results.append({
            "REF_AREA": row_curr.iloc[0]["REF_AREA"],
            "Territorio": row_curr.iloc[0]["Territorio"],
            "tasso_corrente": round(tasso_curr, 2),
            "tasso_precedente": round(tasso_prev, 2),
            "variazione_pct": round(var_pct, 1),
        })
    return sorted(results, key=lambda x: x["variazione_pct"], reverse=True)


def build_variazione_ripartizioni(
    df_regioni: pd.DataFrame, target_year: int
) -> list[dict]:
    """Variazione tasso per ripartizione (Nord/Centro/Sud), media pesata."""
    results = []
    for rip_name, rip_codes in RIPARTIZIONI_DELITTI.items():
        rip_df = df_regioni[df_regioni["REF_AREA"].isin(rip_codes)]
        for year in [target_year, target_year - 1]:
            year_df = rip_df[rip_df["Anno"] == year]
            if year_df.empty:
                break
        else:
            curr = rip_df[rip_df["Anno"] == target_year]
            prev = rip_df[rip_df["Anno"] == target_year - 1]
            # Tasso = sum(delitti) / sum(pop) * 1000
            tasso_curr = curr["Delitti"].sum() / curr["Popolazione"].sum() * 1000
            tasso_prev = prev["Delitti"].sum() / prev["Popolazione"].sum() * 1000
            var_pct = (tasso_curr - tasso_prev) / abs(tasso_prev) * 100
            results.append({
                "ripartizione": rip_name,
                "tasso_corrente": round(float(tasso_curr), 2),
                "tasso_precedente": round(float(tasso_prev), 2),
                "variazione_pct": round(float(var_pct), 1),
            })
    return results


def build_percezione(df_perc: pd.DataFrame, target_year: int) -> dict | None:
    """Dato percezione per l'anno target."""
    row = df_perc[df_perc["Anno"] == target_year]
    if row.empty:
        return None
    r = row.iloc[0]
    return {
        "anno": int(r["Anno"]),
        "percezione_pct": float(r["Percezione_pct"]),
        "tasso_delitti": float(r["Tasso_per_1000"]),
    }


def build_reati_allarme(
    df_allarme: pd.DataFrame, target_year: int
) -> list[dict]:
    """Variazione anno-su-anno per i 6 reati di allarme sociale."""
    results = []
    for reato, grp in df_allarme.groupby("Reato"):
        grp = grp.sort_values("Anno")
        row_curr = grp[grp["Anno"] == target_year]
        row_prev = grp[grp["Anno"] == target_year - 1]
        if row_curr.empty or row_prev.empty:
            continue
        tasso_curr = float(row_curr.iloc[0]["Tasso_per_100k"])
        tasso_prev = float(row_prev.iloc[0]["Tasso_per_100k"])
        var_pct = (tasso_curr - tasso_prev) / abs(tasso_prev) * 100 if tasso_prev != 0 else 0
        results.append({
            "reato": reato,
            "tasso_corrente": round(tasso_curr, 2),
            "tasso_precedente": round(tasso_prev, 2),
            "variazione_pct": round(var_pct, 1),
            "delitti_corrente": int(row_curr.iloc[0]["Delitti"]),
        })
    return sorted(results, key=lambda x: abs(x["variazione_pct"]), reverse=True)


def generate_report_data(target_year: int) -> dict:
    """Genera il dizionario completo per il report annuale."""
    log.info(f"Caricamento dati per report {target_year}...")

    df_italia = pd.DataFrame(load_json("delitti_italia.json"))
    df_regioni = pd.DataFrame(load_json("delitti_regioni.json"))
    df_avt = pd.DataFrame(load_json("autori_vittime_trend.json"))
    df_perc = pd.DataFrame(load_json("percezione_vs_dati.json"))
    df_allarme = pd.DataFrame(load_json("reati_allarme_sociale.json"))

    # Verifica anno disponibile
    anni_disponibili = sorted(df_italia["Anno"].unique())
    if target_year not in anni_disponibili:
        raise ValueError(
            f"Anno {target_year} non disponibile. Anni: {anni_disponibili}"
        )

    log.info("Executive summary...")
    summary = build_executive_summary(df_italia, target_year)

    log.info("Top variazioni reati (autori denunciati)...")
    top_crescita, top_calo = build_top_variazioni(df_avt, target_year)

    log.info("Variazione regioni...")
    var_regioni = build_variazione_regioni(df_regioni, target_year)

    log.info("Variazione ripartizioni...")
    var_ripartizioni = build_variazione_ripartizioni(df_regioni, target_year)

    log.info("Percezione...")
    percezione = build_percezione(df_perc, target_year)

    log.info("Reati allarme sociale...")
    allarme = build_reati_allarme(df_allarme, target_year)

    report = {
        "anno": target_year,
        "executive_summary": summary,
        "top_crescita": top_crescita,
        "top_calo": top_calo,
        "variazione_regioni": var_regioni,
        "variazione_ripartizioni": var_ripartizioni,
        "percezione": percezione,
        "reati_allarme_sociale": allarme,
    }
    return report


def main():
    parser = argparse.ArgumentParser(
        description="Genera report annuale criminalita'"
    )
    parser.add_argument(
        "--anno",
        type=int,
        default=None,
        help="Anno target (default: ultimo anno disponibile nei dati)",
    )
    args = parser.parse_args()

    # Se anno non specificato, usa ultimo disponibile
    if args.anno is None:
        df_italia = pd.DataFrame(load_json("delitti_italia.json"))
        target_year = int(df_italia["Anno"].max())
        log.info(f"Anno non specificato, uso ultimo disponibile: {target_year}")
    else:
        target_year = args.anno

    report = generate_report_data(target_year)

    output_path = DATA_DIR / f"report_{target_year}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    log.info(f"Report salvato: {output_path}")


if __name__ == "__main__":
    main()
