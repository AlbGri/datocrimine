"""
generate_report.py - Genera il JSON per il report annuale interattivo.

Carica i dati del progetto, calcola le variazioni dell'anno target rispetto all'anno
precedente e all'ultimo anno prima del COVID, e produce public/data/report_{anno}.json
per il frontend.

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
    PROPENSIONE_DENUNCIA,
    interpret_with_propensione,
    load_json,
    run_mann_kendall,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# Confronto di lungo periodo: l'ultimo anno prima del COVID
ANNO_PRE_COVID = min(COVID_YEARS) - 1

# Reati mostrati per lato (aumenti, cali); gli altri finiscono in una sola barra
N_CONTRIBUTI = 5

# Anni fuori dal COVID sotto i quali una tendenza storica non si dichiara
MIN_PUNTI_TREND = 8

# Mappa codice reato ISTAT -> id insight curato (per link nel frontend)
CODICE_TO_INSIGHT_ID: dict[str, str] = {
    "SWINCYB": "truffe",
    "INTENHOM": "omicidi",
    "KIDNAPP": "sequestri",
    "USURY": "usura",
    "EXTORT": "estorsioni",
}

# Note sui dati di reati specifici, non derivabili dai numeri
NOTE_MANUALI: dict[str, str] = {
    "OTHCRIM": (
        "Voce residua dell'ISTAT: raccoglie i delitti che non rientrano nelle altre voci "
        "e con questi dati non si può scomporre."
    ),
}


# Ripartizioni per delitti_regioni.json (ITD12 = Trentino-Alto Adige unificato)
RIPARTIZIONI_DELITTI = {
    "Nord": {"ITC1", "ITC2", "ITC3", "ITC4", "ITD12", "ITD3", "ITD4", "ITD5"},
    "Centro": {"ITE1", "ITE2", "ITE3", "ITE4"},
    "Sud e Isole": {"ITF1", "ITF2", "ITF3", "ITF4", "ITF5", "ITF6", "ITG1", "ITG2"},
}


def _tasso(row: pd.Series, per: int) -> float:
    """Tasso dai valori esatti: i tassi nei JSON sono arrotondati e falserebbero le variazioni."""
    return float(row["Delitti"]) / float(row["Popolazione"]) * per


def _trend_strutturale_with_covid(
    series: np.ndarray, anni: np.ndarray
) -> str | None:
    """Mann-Kendall escludendo anni COVID; None se la serie e' troppo breve."""
    mask = ~np.isin(anni, list(COVID_YEARS))
    clean = series[mask]
    if len(clean) < MIN_PUNTI_TREND:
        return None
    return run_mann_kendall(clean)["mk_trend"]


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

    tasso_curr = _tasso(row_curr.iloc[0], 1000)
    tasso_prev = _tasso(row_prev.iloc[0], 1000)
    variazione_pct = (tasso_curr - tasso_prev) / abs(tasso_prev) * 100

    # Media storica (tutti gli anni disponibili escluso il target)
    precedenti = df[df["Anno"] < target_year]
    media_storica = float((precedenti["Delitti"] / precedenti["Popolazione"] * 1000).mean())

    return {
        "tasso_totale": round(tasso_curr, 2),
        "tasso_precedente": round(tasso_prev, 2),
        "variazione_pct": round(variazione_pct, 1),
        "media_storica": round(media_storica, 2),
        "popolazione": int(row_curr.iloc[0]["Popolazione"]),
        "delitti_totali": int(row_curr.iloc[0]["Delitti"]),
    }


def _build_contesto(
    trend: str | None, series: np.ndarray, anni: np.ndarray
) -> str | None:
    """Segnala se la tendenza storica cambia includendo gli anni COVID. None se non serve."""
    if trend is None or run_mann_kendall(series)["mk_trend"] == trend:
        return None
    return "La tendenza storica cambia se si includono gli anni COVID (2020-2021)."


def _build_caveat(codice: str, differenza: int) -> str | None:
    """Avviso sulla propensione alla denuncia. Ritorna None se non serve.

    Segue il verso della differenza mostrata, non la tendenza storica: l'avviso commenta
    il numero che il lettore ha davanti.
    """
    propensione = PROPENSIONE_DENUNCIA.get(codice)
    verso = "increasing" if differenza > 0 else "decreasing"
    interp = interpret_with_propensione(verso, propensione)
    livello = (propensione or "").replace("_", " ")
    if interp == "emersione_probabile":
        return (
            f"La propensione alla denuncia per questo reato è {livello}: l'aumento "
            "potrebbe riflettere maggiore emersione più che un aumento reale."
        )
    if interp == "calo_ambiguo":
        return (
            f"La propensione alla denuncia per questo reato è {livello}: il calo delle "
            "denunce non implica necessariamente un calo del fenomeno."
        )
    if interp in ("aumento_misto", "calo_misto"):
        return (
            "Il dato riflette sia variazioni reali sia possibili cambiamenti nella "
            "propensione alla denuncia."
        )
    return None


def _fmt_int(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def _fmt_signed(n: int) -> str:
    return ("+" if n > 0 else "") + _fmt_int(n)


def _sintesi_contributi(
    base_year: int, differenza: int, variazione_pct: float,
    aumenti: list[dict], cali: list[dict],
) -> str:
    """Frase d'apertura: variazione totale e i due reati che pesano di piu' per lato."""
    verso = "aumentati" if differenza >= 0 else "diminuiti"
    pct = f"{variazione_pct:+.1f}%".replace(".", ",")
    frase = (
        f"Rispetto al {base_year} i delitti denunciati sono {verso} di "
        f"{_fmt_int(abs(differenza))} ({pct})."
    )
    parti = []
    for voci, verbo in ((aumenti, "aumentano"), (cali, "calano")):
        if voci:
            elenco = " e ".join(
                f"{v['reato'][0].lower()}{v['reato'][1:]} ({_fmt_signed(v['differenza'])})"
                for v in voci[:2]
            )
            parti.append(f"{verbo} soprattutto {elenco}")
    if parti:
        testo = "; ".join(parti)
        frase += f" {testo[0].upper()}{testo[1:]}."
    return frase


def build_contributi(
    df_reati: pd.DataFrame, df_italia: pd.DataFrame, target_year: int, base_year: int
) -> dict:
    """Contributo di ogni reato alla variazione dei delitti fra base_year e target_year.

    Usa solo i codici che non sono sottotipi: sommano al totale, quindi i contributi
    piu' la voce "altri" sommano alla differenza totale.
    """
    totali = df_italia.set_index("Anno")["Delitti"]
    delitti_base = int(totali[base_year])
    delitti_corrente = int(totali[target_year])
    differenza = delitti_corrente - delitti_base

    voci = []
    for codice, grp in df_reati[df_reati["Anno"] <= target_year].groupby("Codice"):
        serie = grp.sort_values("Anno").set_index("Anno")["Delitti"]
        if base_year not in serie.index or target_year not in serie.index:
            continue
        anni = serie.index.to_numpy()
        valori = serie.to_numpy(dtype=float)
        trend = _trend_strutturale_with_covid(valori, anni)
        val_base = int(serie[base_year])
        diff = int(serie[target_year]) - val_base
        codice_str = str(codice)
        voci.append({
            "codice": codice_str,
            "reato": grp["Reato"].iloc[0],
            "delitti_base": val_base,
            "delitti_corrente": int(serie[target_year]),
            "differenza": diff,
            "variazione_pct": round(diff / val_base * 100, 1),
            "trend_strutturale": trend,
            "inizio_serie": int(anni[0]),
            "contesto": _build_contesto(trend, valori, anni),
            "caveat": _build_caveat(codice_str, diff),
            "insight_id": CODICE_TO_INSIGHT_ID.get(codice_str),
            "nota": NOTE_MANUALI.get(codice_str),
        })

    aumenti = sorted((v for v in voci if v["differenza"] > 0), key=lambda v: -v["differenza"])
    cali = sorted((v for v in voci if v["differenza"] < 0), key=lambda v: v["differenza"])
    aumenti, cali = aumenti[:N_CONTRIBUTI], cali[:N_CONTRIBUTI]
    mostrate = aumenti + cali
    variazione_pct = round(differenza / delitti_base * 100, 1)

    return {
        "anno_base": base_year,
        "delitti_base": delitti_base,
        "delitti_corrente": delitti_corrente,
        "differenza": differenza,
        "variazione_pct": variazione_pct,
        "sintesi": _sintesi_contributi(base_year, differenza, variazione_pct, aumenti, cali),
        "aumenti": aumenti,
        "cali": cali,
        "altri": {
            "differenza": differenza - sum(v["differenza"] for v in mostrate),
            "n_reati": len(voci) - len(mostrate),
        },
    }


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
        tasso_curr = _tasso(row_curr.iloc[0], 1000)
        tasso_prev = _tasso(row_prev.iloc[0], 1000)
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
        tasso_curr = _tasso(row_curr.iloc[0], 100_000)
        tasso_prev = _tasso(row_prev.iloc[0], 100_000)
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
    df_reati = pd.DataFrame(load_json("delitti_reati_italia.json"))
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

    log.info("Contributi dei reati alla variazione...")
    contributi = [
        build_contributi(df_reati, df_italia, target_year, base)
        for base in dict.fromkeys([target_year - 1, ANNO_PRE_COVID])
        if base < target_year
    ]

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
        "contributi": contributi,
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
