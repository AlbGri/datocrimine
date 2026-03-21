"""
generate_insights.py - Fase 1: analisi statistica sistematica dei dati ISTAT

Carica tutti i JSON del progetto, genera combinazioni reato x dimensione x tempo,
applica test statistici e produce un CSV candidati per la curazione manuale.

Output: data/processed/insights_candidates.csv

Dipendenze: scipy, pymannkendall, statsmodels, numpy, pandas
"""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats
from statsmodels.stats.multitest import multipletests

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configurazione
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "public" / "data"
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"

# Soglie filtraggio pre-analisi
MIN_ABS_PER_YEAR = 50        # minimo valore assoluto per anno
MIN_DATA_POINTS = 5          # minima lunghezza serie
MIN_EFFECT_PP = 3.0          # variazione minima in punti percentuali
MIN_ABS_PRACTICAL = 200      # soglia pratica per confidenza alta

# FDR
FDR_ALPHA = 0.05

# Cambiamenti normativi noti (per annotazione, non esclusione)
KNOWN_EVENTS = {
    2016: "Depenalizzazione ingiurie (d.lgs. 7/2016)",
    2020: "COVID-19 lockdown",
    2021: "COVID-19 restrizioni parziali",
    2018: "GDPR (impatto su reati informatici)",
}

# Classificazione reati per analisi diff-in-diff
REATI_VIOLENTI = {
    "INTENHOM", "ATTEMPHOM", "MAFIAHOM", "ROBBHOM", "MANSHOM", "INFANTHOM",
    "MASSMURD", "CULPINJU", "BLOWS", "RAPE", "RAPEUN18", "STALK", "CP612BIS",
    "KIDNAPP", "MENACE", "CP572", "CORRUPUN18", "PORNO", "CP612TER",
}
REATI_PATRIMONIALI = {
    "THEFT", "BAGTHEF", "BURGTHEF", "PICKTHEF", "SHOPTHEF", "CARTHEF",
    "VEHITHEF", "MOPETHEF", "MOTORTHEF", "TRUCKTHEF", "ARTTHEF",
    "ROBBER", "STREETROB", "HOUSEROB", "BANKROB", "SHOPROB", "POSTROB",
    "EXTORT", "RECEIV", "USURY", "DAMAGE", "ARSON", "DAMARS",
}
REATI_INFORMATICI = {"CYBERCRIM", "SWINCYB"}
REATI_DROGA = {"DRUG"}

CATEGORIE_REATI = {
    "violenti": REATI_VIOLENTI,
    "patrimoniali": REATI_PATRIMONIALI,
    "informatici": REATI_INFORMATICI,
    "droga": REATI_DROGA,
}

# Ripartizioni territoriali
NORD = {"ITC1", "ITC2", "ITC3", "ITC4", "ITD1+ITD2", "ITD3", "ITD4", "ITD5"}
CENTRO = {"ITE1", "ITE2", "ITE3", "ITE4"}
SUD_ISOLE = {"ITF1", "ITF2", "ITF3", "ITF4", "ITF5", "ITF6", "ITG1", "ITG2"}

RIPARTIZIONI = {
    "Nord": NORD,
    "Centro": CENTRO,
    "Sud e Isole": SUD_ISOLE,
}

# ---------------------------------------------------------------------------
# Caricamento dati
# ---------------------------------------------------------------------------

def load_json(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_all_data() -> dict[str, pd.DataFrame]:
    """Carica tutti i JSON e restituisce un dizionario di DataFrame."""
    datasets = {}

    datasets["avt"] = pd.DataFrame(load_json("autori_vittime_trend.json"))
    datasets["avr"] = pd.DataFrame(load_json("autori_vittime_regioni.json"))
    datasets["avp"] = pd.DataFrame(load_json("autori_vittime_province.json"))
    datasets["delitti_italia"] = pd.DataFrame(load_json("delitti_italia.json"))
    datasets["delitti_regioni"] = pd.DataFrame(load_json("delitti_regioni.json"))
    datasets["delitti_province"] = pd.DataFrame(load_json("delitti_province.json"))
    datasets["percezione"] = pd.DataFrame(load_json("percezione_vs_dati.json"))
    datasets["allarme"] = pd.DataFrame(load_json("reati_allarme_sociale.json"))
    datasets["allarme_regioni"] = pd.DataFrame(
        load_json("reati_allarme_sociale_regioni.json")
    )

    for name, df in datasets.items():
        log.info(f"  {name}: {len(df)} righe, colonne: {list(df.columns)}")

    return datasets


# ---------------------------------------------------------------------------
# Test statistici
# ---------------------------------------------------------------------------

def run_mann_kendall(series: np.ndarray) -> dict:
    """Mann-Kendall trend test + Theil-Sen slope."""
    try:
        result = mk.original_test(series)
        return {
            "mk_trend": result.trend,       # "increasing", "decreasing", "no trend"
            "mk_p": result.p,
            "mk_z": result.z,
            "mk_tau": result.Tau,
            "theil_sen_slope": result.slope,
            "theil_sen_intercept": result.intercept,
        }
    except Exception:
        return {
            "mk_trend": "error",
            "mk_p": np.nan,
            "mk_z": np.nan,
            "mk_tau": np.nan,
            "theil_sen_slope": np.nan,
            "theil_sen_intercept": np.nan,
        }


def calc_zscore_last(series: np.ndarray) -> dict:
    """Z-score dell'ultimo valore rispetto alla serie."""
    if len(series) < 3:
        return {"zscore_last": np.nan, "last_value": np.nan}
    mean = np.nanmean(series[:-1])
    std = np.nanstd(series[:-1], ddof=1)
    if std == 0:
        return {"zscore_last": 0.0, "last_value": series[-1]}
    z = (series[-1] - mean) / std
    return {"zscore_last": z, "last_value": series[-1]}


def calc_cv(series: np.ndarray) -> float:
    """Coefficiente di variazione."""
    mean = np.nanmean(series)
    if mean == 0:
        return 0.0
    return float(np.nanstd(series, ddof=1) / abs(mean))


def calc_monotonicity(series: np.ndarray) -> float:
    """Proporzione di passi consecutivi nella stessa direzione del trend."""
    if len(series) < 2:
        return 0.0
    diffs = np.diff(series)
    if np.sum(diffs > 0) >= np.sum(diffs < 0):
        # trend positivo
        return np.sum(diffs > 0) / len(diffs)
    else:
        return np.sum(diffs < 0) / len(diffs)


def analyze_series(
    series: np.ndarray, anni: np.ndarray
) -> dict:
    """Applica tutti i test su una serie temporale."""
    result = {}
    result.update(run_mann_kendall(series))
    result.update(calc_zscore_last(series))
    result["cv"] = calc_cv(series)
    result["monotonicity"] = calc_monotonicity(series)
    result["first_value"] = series[0]
    result["total_change_pp"] = series[-1] - series[0]
    result["anno_min"] = int(anni[0])
    result["anno_max"] = int(anni[-1])
    result["n_points"] = len(series)
    # Sparkline (valori arrotondati per compattezza)
    result["sparkline"] = [round(float(v), 1) for v in series]
    return result


# ---------------------------------------------------------------------------
# Analisi 1: Trend nazionali reato x dimensione (autori_vittime_trend)
# ---------------------------------------------------------------------------

def analyze_trend_nazionale(df: pd.DataFrame) -> list[dict]:
    """Per ogni reato x data_type x dimensione, analizza il trend temporale."""
    candidates = []
    dimensions = [
        ("pct_stranieri", "% stranieri", "totale"),
        ("pct_maschi", "% maschi", "totale"),
        ("pct_femmine", "% femmine", "totale"),
        ("pct_minori", "% minori", "totale"),
    ]

    for data_type in ["OFFEND", "VICTIM"]:
        dt_df = df[df["data_type"] == data_type]
        for codice_reato, grp in dt_df.groupby("codice_reato"):
            grp = grp.sort_values("anno")
            reato_label = grp["reato"].iloc[0]

            # Trend sul totale assoluto
            totali = grp["totale"].values
            anni = grp["anno"].values
            if len(totali) >= MIN_DATA_POINTS and np.all(totali >= MIN_ABS_PER_YEAR):
                result = analyze_series(totali.astype(float), anni)
                result.update({
                    "analysis_type": "trend_nazionale_assoluto",
                    "data_type": data_type,
                    "codice_reato": codice_reato,
                    "reato": reato_label,
                    "dimensione": "totale",
                    "territorio": "Italia",
                })
                candidates.append(result)

            # Trend sulle dimensioni percentuali
            for col, dim_label, abs_col in dimensions:
                sub = grp.dropna(subset=[col])
                if len(sub) < MIN_DATA_POINTS:
                    continue
                # Filtro numeri assoluti
                if not np.all(sub[abs_col].values >= MIN_ABS_PER_YEAR):
                    continue
                series = sub[col].values.astype(float)
                anni_dim = sub["anno"].values
                # Filtro variazione minima
                if abs(series[-1] - series[0]) < MIN_EFFECT_PP:
                    continue

                result = analyze_series(series, anni_dim)
                result.update({
                    "analysis_type": "trend_nazionale_pct",
                    "data_type": data_type,
                    "codice_reato": codice_reato,
                    "reato": reato_label,
                    "dimensione": dim_label,
                    "territorio": "Italia",
                })
                candidates.append(result)

    log.info(f"Trend nazionali: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 2: Trend regionali (autori_vittime_regioni)
# ---------------------------------------------------------------------------

def analyze_trend_regionali(df: pd.DataFrame) -> list[dict]:
    """Per ogni regione x reato x dimensione, analizza il trend."""
    candidates = []
    dimensions = [
        ("pct_stranieri", "% stranieri"),
        ("pct_maschi", "% maschi"),
        ("pct_femmine", "% femmine"),
        ("pct_minori", "% minori"),
        ("tasso", "tasso per 100k"),
    ]

    for data_type in ["OFFEND", "VICTIM"]:
        dt_df = df[df["data_type"] == data_type]
        for (regione, codice_reato), grp in dt_df.groupby(["regione", "codice_reato"]):
            grp = grp.sort_values("anno")
            reato_label = grp["reato"].iloc[0]

            for col, dim_label in dimensions:
                if col not in grp.columns:
                    continue
                sub = grp.dropna(subset=[col])
                if len(sub) < MIN_DATA_POINTS:
                    continue
                if col != "tasso" and not np.all(sub["totale"].values >= MIN_ABS_PER_YEAR):
                    continue
                series = sub[col].values.astype(float)
                anni = sub["anno"].values

                if col in ("pct_stranieri", "pct_maschi", "pct_femmine", "pct_minori"):
                    if abs(series[-1] - series[0]) < MIN_EFFECT_PP:
                        continue

                result = analyze_series(series, anni)
                result.update({
                    "analysis_type": "trend_regionale",
                    "data_type": data_type,
                    "codice_reato": codice_reato,
                    "reato": reato_label,
                    "dimensione": dim_label,
                    "territorio": regione,
                })
                candidates.append(result)

    log.info(f"Trend regionali: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 3: Divergenza inter-regionale
# ---------------------------------------------------------------------------

def analyze_divergenza_regionale(df: pd.DataFrame) -> list[dict]:
    """Per ogni reato x anno x dimensione, misura la dispersione tra regioni."""
    candidates = []
    dimensions = [
        ("pct_stranieri", "% stranieri"),
        ("pct_maschi", "% maschi"),
        ("pct_femmine", "% femmine"),
        ("tasso", "tasso per 100k"),
    ]

    for data_type in ["OFFEND", "VICTIM"]:
        dt_df = df[df["data_type"] == data_type]
        for codice_reato, reato_grp in dt_df.groupby("codice_reato"):
            reato_label = reato_grp["reato"].iloc[0]
            anni = sorted(reato_grp["anno"].unique())
            if len(anni) < MIN_DATA_POINTS:
                continue

            for col, dim_label in dimensions:
                # Calcola std inter-regionale per ogni anno, poi trend della std
                stds = []
                valid_anni = []
                for anno in anni:
                    anno_df = reato_grp[reato_grp["anno"] == anno]
                    vals = anno_df[col].dropna().values.astype(float)
                    if len(vals) >= 10:  # almeno metà regioni
                        stds.append(np.std(vals, ddof=1))
                        valid_anni.append(anno)

                if len(stds) < MIN_DATA_POINTS:
                    continue

                stds_arr = np.array(stds)
                anni_arr = np.array(valid_anni)

                result = analyze_series(stds_arr, anni_arr)
                result.update({
                    "analysis_type": "divergenza_regionale",
                    "data_type": data_type,
                    "codice_reato": codice_reato,
                    "reato": reato_label,
                    "dimensione": f"dispersione {dim_label}",
                    "territorio": "inter-regionale",
                })
                candidates.append(result)

    log.info(f"Divergenza regionale: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 4: Delitti Italia - trend tassi
# ---------------------------------------------------------------------------

def analyze_delitti_italia(df: pd.DataFrame) -> list[dict]:
    """Trend tasso delitti totale nazionale."""
    candidates = []
    df = df.sort_values("Anno")
    if len(df) >= MIN_DATA_POINTS:
        series = df["Tasso_per_1000"].values.astype(float)
        anni = df["Anno"].values
        result = analyze_series(series, anni)
        result.update({
            "analysis_type": "trend_nazionale_assoluto",
            "data_type": "DELITTI",
            "codice_reato": "TOT",
            "reato": "Totale delitti",
            "dimensione": "tasso per 1000",
            "territorio": "Italia",
        })
        candidates.append(result)

    log.info(f"Delitti Italia: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 5: Delitti regionali - trend e outlier
# ---------------------------------------------------------------------------

def analyze_delitti_regionali(df: pd.DataFrame) -> list[dict]:
    """Trend tasso delitti per regione."""
    candidates = []
    for territorio, grp in df.groupby("Territorio"):
        grp = grp.sort_values("Anno")
        if len(grp) < MIN_DATA_POINTS:
            continue
        series = grp["Tasso_per_1000"].values.astype(float)
        anni = grp["Anno"].values
        result = analyze_series(series, anni)
        result.update({
            "analysis_type": "trend_regionale",
            "data_type": "DELITTI",
            "codice_reato": "TOT",
            "reato": "Totale delitti",
            "dimensione": "tasso per 1000",
            "territorio": territorio,
        })
        candidates.append(result)

    log.info(f"Delitti regionali: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 6: Percezione vs dati reali
# ---------------------------------------------------------------------------

def analyze_percezione(df: pd.DataFrame) -> list[dict]:
    """Correlazione e divergenza tra percezione e tasso reale."""
    candidates = []
    df = df.sort_values("Anno")
    if len(df) < MIN_DATA_POINTS:
        return candidates

    percezione = df["Percezione_pct"].values.astype(float)
    tasso = df["Tasso_per_1000"].values.astype(float)
    anni = df["Anno"].values

    # Trend percezione
    result = analyze_series(percezione, anni)
    result.update({
        "analysis_type": "trend_nazionale_pct",
        "data_type": "PERCEZIONE",
        "codice_reato": "PERCEZIONE",
        "reato": "Percezione insicurezza",
        "dimensione": "% famiglie",
        "territorio": "Italia",
    })
    candidates.append(result)

    # Correlazione percezione-tasso
    corr, p_val = stats.pearsonr(percezione, tasso)
    # Divergenza: tasso scende ma percezione sale?
    mk_tasso = mk.original_test(tasso)
    mk_perc = mk.original_test(percezione)

    candidates.append({
        "analysis_type": "percezione_vs_dati",
        "data_type": "PERCEZIONE",
        "codice_reato": "PERCEZIONE",
        "reato": "Percezione vs dati reali",
        "dimensione": "correlazione",
        "territorio": "Italia",
        "mk_trend": f"tasso:{mk_tasso.trend}, percezione:{mk_perc.trend}",
        "mk_p": p_val,  # p della correlazione
        "mk_z": corr,   # coefficiente correlazione
        "mk_tau": np.nan,
        "theil_sen_slope": np.nan,
        "theil_sen_intercept": np.nan,
        "zscore_last": np.nan,
        "last_value": np.nan,
        "cv": np.nan,
        "monotonicity": np.nan,
        "first_value": np.nan,
        "total_change_pp": np.nan,
        "anno_min": int(anni[0]),
        "anno_max": int(anni[-1]),
        "n_points": len(anni),
        "sparkline": [round(float(v), 1) for v in percezione],
    })

    log.info(f"Percezione: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 7: Reati allarme sociale - trend nazionali e regionali
# ---------------------------------------------------------------------------

def analyze_allarme_sociale(
    df_naz: pd.DataFrame, df_reg: pd.DataFrame
) -> list[dict]:
    """Trend tassi per 100k dei 6 reati di allarme sociale."""
    candidates = []

    # Nazionale
    for reato, grp in df_naz.groupby("Reato"):
        grp = grp.sort_values("Anno")
        if len(grp) < MIN_DATA_POINTS:
            continue
        series = grp["Tasso_per_100k"].values.astype(float)
        anni = grp["Anno"].values
        result = analyze_series(series, anni)
        result.update({
            "analysis_type": "trend_nazionale_assoluto",
            "data_type": "ALLARME",
            "codice_reato": reato,
            "reato": reato,
            "dimensione": "tasso per 100k",
            "territorio": "Italia",
        })
        candidates.append(result)

    # Regionale
    for (territorio, reato), grp in df_reg.groupby(["Territorio", "Reato"]):
        grp = grp.sort_values("Anno")
        if len(grp) < MIN_DATA_POINTS:
            continue
        series = grp["Tasso_per_100k"].values.astype(float)
        anni = grp["Anno"].values
        result = analyze_series(series, anni)
        result.update({
            "analysis_type": "trend_regionale",
            "data_type": "ALLARME",
            "codice_reato": reato,
            "reato": reato,
            "dimensione": "tasso per 100k",
            "territorio": territorio,
        })
        candidates.append(result)

    log.info(f"Allarme sociale: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 8: Correlazione tra reati diversi (trend nazionali)
# ---------------------------------------------------------------------------

def analyze_correlazioni_reati(df: pd.DataFrame) -> list[dict]:
    """Correlazione di Spearman tra serie temporali di reati diversi."""
    candidates = []

    for data_type in ["OFFEND", "VICTIM"]:
        dt_df = df[df["data_type"] == data_type]

        # Costruisci matrice reato x anno (totale)
        pivot = dt_df.pivot_table(
            index="anno", columns="codice_reato", values="totale", aggfunc="first"
        )
        # Solo reati con serie lunga e valori sufficienti
        valid_cols = [
            c for c in pivot.columns
            if pivot[c].notna().sum() >= MIN_DATA_POINTS
            and (pivot[c].dropna() >= MIN_ABS_PER_YEAR).all()
        ]
        pivot = pivot[valid_cols].dropna()

        if len(pivot) < MIN_DATA_POINTS or len(valid_cols) < 2:
            continue

        # Nomi reati per lookup
        nomi = dict(
            zip(dt_df["codice_reato"], dt_df["reato"])
        )

        # Calcola correlazioni tra tutte le coppie
        tested = set()
        for i, col_a in enumerate(valid_cols):
            for col_b in valid_cols[i + 1:]:
                pair = tuple(sorted([col_a, col_b]))
                if pair in tested:
                    continue
                tested.add(pair)

                series_a = pivot[col_a].values
                series_b = pivot[col_b].values

                corr, p_val = stats.spearmanr(series_a, series_b)

                # Solo correlazioni forti
                if abs(corr) < 0.7:
                    continue

                direction = "positiva" if corr > 0 else "negativa"
                candidates.append({
                    "analysis_type": "correlazione_reati",
                    "data_type": data_type,
                    "codice_reato": f"{col_a}_vs_{col_b}",
                    "reato": f"{nomi.get(col_a, col_a)} vs {nomi.get(col_b, col_b)}",
                    "dimensione": f"correlazione {direction}",
                    "territorio": "Italia",
                    "mk_trend": direction,
                    "mk_p": p_val,
                    "mk_z": corr,  # rho di Spearman
                    "mk_tau": np.nan,
                    "theil_sen_slope": np.nan,
                    "theil_sen_intercept": np.nan,
                    "zscore_last": np.nan,
                    "last_value": corr,
                    "cv": np.nan,
                    "monotonicity": np.nan,
                    "first_value": np.nan,
                    "total_change_pp": np.nan,
                    "anno_min": int(pivot.index.min()),
                    "anno_max": int(pivot.index.max()),
                    "n_points": len(pivot),
                    "sparkline": [],
                })

    log.info(f"Correlazioni tra reati: {len(candidates)} candidati (|rho| >= 0.7)")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 9: Diff-in-diff tra categorie di reati
# ---------------------------------------------------------------------------

def analyze_diff_categorie(df: pd.DataFrame) -> list[dict]:
    """Confronta trend tra categorie di reati (violenti vs patrimoniali etc.)."""
    candidates = []

    for data_type in ["OFFEND", "VICTIM"]:
        dt_df = df[df["data_type"] == data_type]
        dimensions = [
            ("totale", "totale"),
            ("pct_stranieri", "% stranieri"),
            ("pct_maschi", "% maschi"),
            ("pct_femmine", "% femmine"),
        ]

        # Per ogni categoria, calcola la serie aggregata per anno
        cat_series = {}
        for cat_name, cat_codes in CATEGORIE_REATI.items():
            cat_df = dt_df[dt_df["codice_reato"].isin(cat_codes)]
            if len(cat_df) == 0:
                continue

            for col, dim_label in dimensions:
                if col == "totale":
                    # Somma i totali per anno
                    agg = cat_df.groupby("anno")["totale"].sum().sort_index()
                else:
                    # Media pesata delle % per anno (pesata sul totale)
                    sub = cat_df.dropna(subset=[col])
                    if len(sub) == 0:
                        continue
                    sub = sub.copy()
                    sub["_weighted"] = sub[col] * sub["totale"]
                    agg_num = sub.groupby("anno")["_weighted"].sum()
                    agg_den = sub.groupby("anno")["totale"].sum()
                    agg = (agg_num / agg_den).sort_index()

                if len(agg) < MIN_DATA_POINTS:
                    continue

                cat_series[(cat_name, dim_label)] = agg

        # Confronta coppie di categorie
        cat_names = list(CATEGORIE_REATI.keys())
        for i, cat_a in enumerate(cat_names):
            for cat_b in cat_names[i + 1:]:
                for _, dim_label in dimensions:
                    key_a = (cat_a, dim_label)
                    key_b = (cat_b, dim_label)
                    if key_a not in cat_series or key_b not in cat_series:
                        continue

                    s_a = cat_series[key_a]
                    s_b = cat_series[key_b]

                    # Allinea sugli anni comuni
                    common = s_a.index.intersection(s_b.index)
                    if len(common) < MIN_DATA_POINTS:
                        continue

                    vals_a = s_a.loc[common].values.astype(float)
                    vals_b = s_b.loc[common].values.astype(float)
                    anni = common.values

                    # Calcola la differenza e il suo trend
                    diff = vals_a - vals_b
                    result = analyze_series(diff, anni)

                    # Solo se il trend della differenza e' significativo
                    if result["mk_p"] > 0.1:
                        continue

                    result.update({
                        "analysis_type": "diff_categorie",
                        "data_type": data_type,
                        "codice_reato": f"{cat_a}_vs_{cat_b}",
                        "reato": f"{cat_a} vs {cat_b}",
                        "dimensione": dim_label,
                        "territorio": "Italia",
                    })
                    candidates.append(result)

    log.info(f"Diff-in-diff categorie: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 10: Confronti territoriali (Nord vs Centro vs Sud)
# ---------------------------------------------------------------------------

def analyze_confronti_territoriali(df_regioni: pd.DataFrame) -> list[dict]:
    """Confronta trend tra ripartizioni (Nord/Centro/Sud) per dimensione."""
    candidates = []

    dimensions = [
        ("pct_stranieri", "% stranieri"),
        ("pct_maschi", "% maschi"),
        ("pct_femmine", "% femmine"),
        ("tasso", "tasso per 100k"),
    ]

    for data_type in ["OFFEND", "VICTIM"]:
        dt_df = df_regioni[df_regioni["data_type"] == data_type]

        for codice_reato, reato_df in dt_df.groupby("codice_reato"):
            reato_label = reato_df["reato"].iloc[0]

            for col, dim_label in dimensions:
                if col not in reato_df.columns:
                    continue

                # Calcola media per ripartizione e anno
                rip_series = {}
                for rip_name, rip_codes in RIPARTIZIONI.items():
                    rip_df = reato_df[reato_df["codice_regione"].isin(rip_codes)]
                    sub = rip_df.dropna(subset=[col])
                    if len(sub) == 0:
                        continue

                    if col == "tasso":
                        # Media pesata per popolazione (approssimata con totale)
                        agg = sub.groupby("anno")[col].mean().sort_index()
                    else:
                        # Media pesata delle % sul totale
                        sub = sub.copy()
                        sub["_w"] = sub[col] * sub["totale"]
                        agg_num = sub.groupby("anno")["_w"].sum()
                        agg_den = sub.groupby("anno")["totale"].sum()
                        agg_den = agg_den.replace(0, np.nan)
                        agg = (agg_num / agg_den).dropna().sort_index()

                    if len(agg) >= MIN_DATA_POINTS:
                        rip_series[rip_name] = agg

                # Confronta coppie di ripartizioni
                rip_names = list(rip_series.keys())
                for i, rip_a in enumerate(rip_names):
                    for rip_b in rip_names[i + 1:]:
                        s_a = rip_series[rip_a]
                        s_b = rip_series[rip_b]
                        common = s_a.index.intersection(s_b.index)
                        if len(common) < MIN_DATA_POINTS:
                            continue

                        vals_a = s_a.loc[common].values.astype(float)
                        vals_b = s_b.loc[common].values.astype(float)
                        anni = common.values

                        diff = vals_a - vals_b
                        result = analyze_series(diff, anni)

                        if result["mk_p"] > 0.1:
                            continue

                        result.update({
                            "analysis_type": "confronto_territoriale",
                            "data_type": data_type,
                            "codice_reato": codice_reato,
                            "reato": reato_label,
                            "dimensione": f"{dim_label} ({rip_a} - {rip_b})",
                            "territorio": f"{rip_a} vs {rip_b}",
                        })
                        candidates.append(result)

    log.info(f"Confronti territoriali: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Correzione FDR
# ---------------------------------------------------------------------------

def apply_fdr(df: pd.DataFrame) -> pd.DataFrame:
    """Applica Benjamini-Hochberg FDR per famiglia di analisi."""
    df = df.copy()
    df["mk_p_adjusted"] = np.nan
    df["fdr_significant"] = False

    # Raggruppa per famiglia di test
    families = {
        "trend": df["analysis_type"].isin([
            "trend_nazionale_assoluto", "trend_nazionale_pct", "trend_regionale"
        ]),
        "divergenza": df["analysis_type"] == "divergenza_regionale",
        "percezione": df["analysis_type"] == "percezione_vs_dati",
        "correlazione": df["analysis_type"] == "correlazione_reati",
        "diff_categorie": df["analysis_type"] == "diff_categorie",
        "territoriale": df["analysis_type"] == "confronto_territoriale",
    }

    for family_name, mask in families.items():
        family_df = df.loc[mask]
        p_values = family_df["mk_p"].values
        valid = ~np.isnan(p_values)

        if valid.sum() == 0:
            continue

        reject, p_adj, _, _ = multipletests(
            p_values[valid], alpha=FDR_ALPHA, method="fdr_bh"
        )

        # Riassegna i p-value corretti
        valid_idx = family_df.index[valid]
        df.loc[valid_idx, "mk_p_adjusted"] = p_adj
        df.loc[valid_idx, "fdr_significant"] = reject
        n_sig = reject.sum()
        log.info(
            f"FDR famiglia '{family_name}': {valid.sum()} test, "
            f"{n_sig} significativi ({n_sig/valid.sum()*100:.1f}%)"
        )

    return df


# ---------------------------------------------------------------------------
# Scoring e ranking
# ---------------------------------------------------------------------------

def score_candidates(df: pd.DataFrame) -> pd.DataFrame:
    """Assegna un punteggio composito ai candidati per il ranking."""
    df = df.copy()

    # Componenti dello score (tutti normalizzati 0-1)
    # 1. Significativita' statistica (p-value basso = score alto)
    p_vals = df["mk_p_adjusted"].fillna(df["mk_p"]).fillna(1.0)
    df["score_significance"] = 1 - p_vals.clip(0, 1)

    # 2. Dimensione dell'effetto (total_change_pp o theil_sen_slope)
    abs_change = df["total_change_pp"].abs().fillna(0)
    max_change = abs_change.quantile(0.95) if abs_change.max() > 0 else 1
    df["score_effect"] = (abs_change / max_change).clip(0, 1)

    # 3. Monotonia (trend consistente)
    df["score_monotonicity"] = df["monotonicity"].fillna(0)

    # 4. Z-score ultimo anno (anomalia)
    abs_z = df["zscore_last"].abs().fillna(0)
    df["score_anomaly"] = (abs_z / 3).clip(0, 1)  # z=3 -> score 1

    # 5. Lunghezza serie (serie piu' lunghe = piu' affidabili)
    df["score_length"] = (df["n_points"] / 18).clip(0, 1)  # max 18 anni

    # Score composito pesato
    df["score"] = (
        0.30 * df["score_significance"]
        + 0.25 * df["score_effect"]
        + 0.15 * df["score_monotonicity"]
        + 0.15 * df["score_anomaly"]
        + 0.15 * df["score_length"]
    )

    # Confidenza
    df["confidence"] = "low"
    df.loc[df["fdr_significant"] & (df["score"] >= 0.5), "confidence"] = "medium"
    df.loc[
        df["fdr_significant"]
        & (df["score"] >= 0.7)
        & (df["monotonicity"] >= 0.8),
        "confidence",
    ] = "high"

    # Annotazioni eventi noti
    def check_known_events(row):
        events = []
        if pd.notna(row.get("anno_min")) and pd.notna(row.get("anno_max")):
            for year, desc in KNOWN_EVENTS.items():
                if row["anno_min"] <= year <= row["anno_max"]:
                    events.append(f"{year}: {desc}")
        return "; ".join(events) if events else ""

    df["known_events"] = df.apply(check_known_events, axis=1)

    return df.sort_values("score", ascending=False)


# ---------------------------------------------------------------------------
# Report markdown leggibile
# ---------------------------------------------------------------------------

def generate_report(df: pd.DataFrame, output_path: Path) -> None:
    """Genera un report markdown leggibile con i candidati top."""
    sig = df[df["fdr_significant"] == True].copy()
    lines = []

    lines.append("# Insights Candidates Report")
    lines.append("")
    lines.append(f"Generato: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("")
    lines.append(f"- Candidati totali analizzati: {len(df)}")
    lines.append(f"- FDR significativi (p < 0.05 dopo correzione): {len(sig)}")
    lines.append(f"- Confidenza alta: {(sig['confidence'] == 'high').sum()}")
    lines.append(f"- Confidenza media: {(sig['confidence'] == 'medium').sum()}")
    lines.append("")

    # --- Sezione 1: trend nazionali assoluti ---
    lines.append("---")
    lines.append("")
    lines.append("## 1. Trend nazionali - numeri assoluti")
    lines.append("")
    naz_abs = sig[
        (sig["analysis_type"] == "trend_nazionale_assoluto")
        & (sig["data_type"].isin(["OFFEND", "VICTIM"]))
    ].head(20)
    for _, r in naz_abs.iterrows():
        direction = "crescente" if r["mk_trend"] == "increasing" else "decrescente"
        dt = "autori" if r["data_type"] == "OFFEND" else "vittime"
        lines.append(
            f"- **{r['reato']}** ({dt}) [{r['confidence']}]: "
            f"trend {direction}, "
            f"{r['first_value']:.0f} -> {r['last_value']:.0f} "
            f"({r['total_change_pp']:+.0f}), "
            f"p={r['mk_p_adjusted']:.4f}, "
            f"monotonia={r['monotonicity']:.0%}, "
            f"z-ultimo={r['zscore_last']:+.2f}, "
            f"{r['anno_min']:.0f}-{r['anno_max']:.0f}"
        )
    lines.append("")

    # --- Sezione 2: trend nazionali % ---
    lines.append("---")
    lines.append("")
    lines.append("## 2. Trend nazionali - composizione demografica (%)")
    lines.append("")
    naz_pct = sig[sig["analysis_type"] == "trend_nazionale_pct"].head(30)
    for _, r in naz_pct.iterrows():
        direction = "crescente" if r["mk_trend"] == "increasing" else "decrescente"
        dt = "autori" if r["data_type"] == "OFFEND" else "vittime"
        lines.append(
            f"- **{r['reato']}** ({dt}) | {r['dimensione']} [{r['confidence']}]: "
            f"trend {direction}, "
            f"{r['first_value']:.1f}% -> {r['last_value']:.1f}% "
            f"({r['total_change_pp']:+.1f} pp), "
            f"p={r['mk_p_adjusted']:.4f}, "
            f"monotonia={r['monotonicity']:.0%}, "
            f"{r['anno_min']:.0f}-{r['anno_max']:.0f}"
        )
    lines.append("")

    # --- Sezione 3: divergenza regionale ---
    lines.append("---")
    lines.append("")
    lines.append("## 3. Divergenza inter-regionale")
    lines.append("")
    lines.append(
        "Misura come cambia la dispersione (deviazione standard) tra regioni "
        "nel tempo. Un trend crescente indica che le regioni divergono; "
        "decrescente che convergono."
    )
    lines.append("")
    div = sig[sig["analysis_type"] == "divergenza_regionale"].head(15)
    for _, r in div.iterrows():
        direction = (
            "divergenza crescente"
            if r["mk_trend"] == "increasing"
            else "convergenza"
        )
        dt = "autori" if r["data_type"] == "OFFEND" else "vittime"
        lines.append(
            f"- **{r['reato']}** ({dt}) | {r['dimensione']} [{r['confidence']}]: "
            f"{direction}, "
            f"cambio={r['total_change_pp']:+.1f}, "
            f"p={r['mk_p_adjusted']:.4f}, "
            f"{r['anno_min']:.0f}-{r['anno_max']:.0f}"
        )
    lines.append("")

    # --- Sezione 4: allarme sociale ---
    lines.append("---")
    lines.append("")
    lines.append("## 4. Reati di allarme sociale (nazionali)")
    lines.append("")
    allarme = sig[
        (sig["data_type"] == "ALLARME") & (sig["territorio"] == "Italia")
    ]
    for _, r in allarme.iterrows():
        direction = "crescente" if r["mk_trend"] == "increasing" else "decrescente"
        lines.append(
            f"- **{r['reato']}**: trend {direction}, "
            f"tasso {r['first_value']:.2f} -> {r['last_value']:.2f} per 100k "
            f"({r['total_change_pp']:+.2f}), "
            f"p={r['mk_p_adjusted']:.4f}"
        )
    lines.append("")

    # --- Sezione 5: delitti regionali ---
    lines.append("---")
    lines.append("")
    lines.append("## 5. Delitti totali per regione")
    lines.append("")
    del_reg = sig[
        (sig["data_type"] == "DELITTI") & (sig["territorio"] != "Italia")
    ].head(20)
    for _, r in del_reg.iterrows():
        direction = "crescente" if r["mk_trend"] == "increasing" else "decrescente"
        lines.append(
            f"- **{r['territorio']}**: trend {direction}, "
            f"tasso {r['first_value']:.1f} -> {r['last_value']:.1f} per 1000 "
            f"({r['total_change_pp']:+.1f}), "
            f"p={r['mk_p_adjusted']:.4f}"
        )
    lines.append("")

    # --- Sezione 6: correlazioni tra reati ---
    lines.append("---")
    lines.append("")
    lines.append("## 6. Correlazioni tra reati")
    lines.append("")
    lines.append(
        "Correlazione di Spearman tra le serie temporali di reati diversi. "
        "Valori prossimi a +1 indicano che i due reati si muovono insieme, "
        "prossimi a -1 che si muovono in direzioni opposte."
    )
    lines.append("")
    corr = sig[sig["analysis_type"] == "correlazione_reati"].head(20)
    if len(corr) == 0:
        corr = df[df["analysis_type"] == "correlazione_reati"].head(20)
    for _, r in corr.iterrows():
        dt = "autori" if r["data_type"] == "OFFEND" else "vittime"
        rho = r.get("last_value", r.get("mk_z", 0))
        p = r["mk_p_adjusted"] if pd.notna(r.get("mk_p_adjusted")) else r["mk_p"]
        fdr = " [FDR sig.]" if r.get("fdr_significant", False) else ""
        lines.append(
            f"- **{r['reato']}** ({dt}): "
            f"rho={rho:+.3f}, p={p:.4f}{fdr}"
        )
    lines.append("")

    # --- Sezione 7: diff-in-diff categorie ---
    lines.append("---")
    lines.append("")
    lines.append("## 7. Differenze tra categorie di reati")
    lines.append("")
    lines.append(
        "Trend della differenza tra categorie (es. violenti - patrimoniali). "
        "Un trend crescente indica che la prima categoria cresce piu' della seconda."
    )
    lines.append("")
    diff_cat = sig[sig["analysis_type"] == "diff_categorie"].head(20)
    if len(diff_cat) == 0:
        diff_cat = df[df["analysis_type"] == "diff_categorie"].head(10)
    for _, r in diff_cat.iterrows():
        dt = "autori" if r["data_type"] == "OFFEND" else "vittime"
        direction = "crescente" if r["mk_trend"] == "increasing" else "decrescente"
        p = r["mk_p_adjusted"] if pd.notna(r.get("mk_p_adjusted")) else r["mk_p"]
        fdr = " [FDR sig.]" if r.get("fdr_significant", False) else ""
        lines.append(
            f"- **{r['reato']}** ({dt}) | {r['dimensione']}: "
            f"trend {direction}, cambio={r['total_change_pp']:+.1f}, "
            f"p={p:.4f}{fdr}"
        )
    lines.append("")

    # --- Sezione 8: confronti territoriali ---
    lines.append("---")
    lines.append("")
    lines.append("## 8. Confronti territoriali (Nord vs Centro vs Sud)")
    lines.append("")
    lines.append(
        "Trend della differenza tra ripartizioni per reato e dimensione. "
        "Un trend crescente indica che la prima ripartizione diverge verso l'alto."
    )
    lines.append("")
    terr = sig[sig["analysis_type"] == "confronto_territoriale"].head(25)
    if len(terr) == 0:
        terr = df[df["analysis_type"] == "confronto_territoriale"].head(15)
    for _, r in terr.iterrows():
        dt = "autori" if r["data_type"] == "OFFEND" else "vittime"
        direction = "crescente" if r["mk_trend"] == "increasing" else "decrescente"
        p = r["mk_p_adjusted"] if pd.notna(r.get("mk_p_adjusted")) else r["mk_p"]
        fdr = " [FDR sig.]" if r.get("fdr_significant", False) else ""
        lines.append(
            f"- **{r['reato']}** ({dt}) | {r['dimensione']} | {r['territorio']}: "
            f"trend {direction}, cambio={r['total_change_pp']:+.1f}, "
            f"p={p:.4f}{fdr}"
        )
    lines.append("")

    # --- Sezione 9: top 50 assoluti per score ---
    lines.append("---")
    lines.append("")
    lines.append("## 9. Top 50 candidati per score (tutti i tipi)")
    lines.append("")
    lines.append(
        "| # | Score | Conf. | Reato | Tipo | Dimensione | Territorio | "
        "Trend | Cambio | p (adj) | Monotonia |"
    )
    lines.append(
        "|---|-------|-------|-------|------|------------|------------|"
        "-------|--------|---------|-----------|"
    )
    for i, (_, r) in enumerate(sig.head(50).iterrows(), 1):
        dt = r["data_type"]
        change = (
            f"{r['total_change_pp']:+.1f}"
            if pd.notna(r["total_change_pp"])
            else "n/a"
        )
        p_adj = (
            f"{r['mk_p_adjusted']:.4f}"
            if pd.notna(r["mk_p_adjusted"])
            else "n/a"
        )
        mono = (
            f"{r['monotonicity']:.0%}"
            if pd.notna(r["monotonicity"])
            else "n/a"
        )
        lines.append(
            f"| {i} | {r['score']:.3f} | {r['confidence']} | "
            f"{r['reato']} | {dt} | {r['dimensione']} | {r['territorio']} | "
            f"{r['mk_trend']} | {change} | {p_adj} | {mono} |"
        )
    lines.append("")

    report = "\n".join(lines)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)
    log.info(f"Report: {output_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    log.info("Caricamento dati...")
    data = load_all_data()

    all_candidates = []

    log.info("Analisi trend nazionali (autori/vittime)...")
    all_candidates.extend(analyze_trend_nazionale(data["avt"]))

    log.info("Analisi trend regionali (autori/vittime)...")
    all_candidates.extend(analyze_trend_regionali(data["avr"]))

    log.info("Analisi divergenza inter-regionale...")
    all_candidates.extend(analyze_divergenza_regionale(data["avr"]))

    log.info("Analisi delitti Italia...")
    all_candidates.extend(analyze_delitti_italia(data["delitti_italia"]))

    log.info("Analisi delitti regionali...")
    all_candidates.extend(analyze_delitti_regionali(data["delitti_regioni"]))

    log.info("Analisi percezione vs dati...")
    all_candidates.extend(analyze_percezione(data["percezione"]))

    log.info("Analisi allarme sociale...")
    all_candidates.extend(
        analyze_allarme_sociale(data["allarme"], data["allarme_regioni"])
    )

    log.info("Analisi correlazioni tra reati...")
    all_candidates.extend(analyze_correlazioni_reati(data["avt"]))

    log.info("Analisi diff-in-diff tra categorie di reati...")
    all_candidates.extend(analyze_diff_categorie(data["avt"]))

    log.info("Analisi confronti territoriali (Nord/Centro/Sud)...")
    all_candidates.extend(analyze_confronti_territoriali(data["avr"]))

    log.info(f"Totale candidati pre-FDR: {len(all_candidates)}")

    # DataFrame
    df = pd.DataFrame(all_candidates)

    # FDR
    log.info("Applicazione FDR Benjamini-Hochberg...")
    df = apply_fdr(df)

    # Scoring
    log.info("Scoring e ranking...")
    df = score_candidates(df)

    # Output CSV
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_csv = OUTPUT_DIR / "insights_candidates.csv"

    cols_order = [
        "score", "confidence", "analysis_type", "data_type",
        "codice_reato", "reato", "dimensione", "territorio",
        "mk_trend", "mk_p", "mk_p_adjusted", "fdr_significant",
        "mk_tau", "theil_sen_slope",
        "total_change_pp", "first_value", "last_value",
        "zscore_last", "cv", "monotonicity",
        "anno_min", "anno_max", "n_points",
        "known_events",
        "score_significance", "score_effect", "score_monotonicity",
        "score_anomaly", "score_length",
        "sparkline",
    ]
    cols_order = [c for c in cols_order if c in df.columns]
    df = df[cols_order]

    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    log.info(f"CSV: {output_csv} ({len(df)} candidati)")

    # Output report markdown
    output_report = PROJECT_ROOT / "docs" / "insights_report.md"
    generate_report(df, output_report)

    # Statistiche riassuntive
    log.info("\n--- Riepilogo ---")
    log.info(f"Candidati totali: {len(df)}")
    log.info(f"FDR significativi: {df['fdr_significant'].sum()}")
    log.info(f"Confidenza alta: {(df['confidence'] == 'high').sum()}")
    log.info(f"Confidenza media: {(df['confidence'] == 'medium').sum()}")


if __name__ == "__main__":
    main()
