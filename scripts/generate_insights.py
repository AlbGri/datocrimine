"""
generate_insights.py - Fase 1: analisi statistica sistematica dei dati ISTAT

Carica tutti i JSON del progetto, genera combinazioni reato x dimensione x tempo,
applica test statistici e produce un CSV candidati per la curazione manuale.

Output: data/processed/insights_candidates.csv, docs/insights_report.md e, per i grafici
degli insight, public/data/insights_categorie.json e insights_ripartizioni.json

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

from reati import GERARCHIA

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

# Soglie di rilevanza, applicate dopo la FDR (vedi filtra_rilevanza)
MIN_RHO = 0.7                # correlazioni fra reati
MIN_DELTA_RAPPORTO = 0.1     # variazione del rapporto autori/vittime
MAX_P_CONFRONTI = 0.1        # confronti fra categorie e fra ripartizioni

# FDR
FDR_ALPHA = 0.05

# Cambiamenti normativi noti (per annotazione, non esclusione)
KNOWN_EVENTS = {
    2016: "Depenalizzazione ingiurie (d.lgs. 7/2016)",
    2020: "COVID-19 lockdown",
    2021: "COVID-19 restrizioni parziali",
    2018: "GDPR (impatto su reati informatici)",
}

# Classificazione reati per confronto trend tra categorie. Solo codici che non sono
# sottotipi (THEFT include gia' i tipi di furto, INTENHOM gli omicidi mafiosi, ecc.)
REATI_VIOLENTI = {
    "INTENHOM", "ATTEMPHOM", "MANSHOM", "INFANTHOM",
    "MASSMURD", "CULPINJU", "BLOWS", "RAPE", "RAPEUN18", "CP612BIS",
    "KIDNAPP", "MENACE", "CP572", "CORRUPUN18", "PORNO", "CP612TER",
}
REATI_PATRIMONIALI = {
    "THEFT", "ROBBER", "EXTORT", "RECEIV", "USURY", "DAMAGE", "ARSON", "DAMARS",
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

def is_tautological_pair(code_a: str, code_b: str) -> bool:
    """Verifica se due codici reato sono in relazione gerarchica.

    Padre-sottotipo e sottotipi dello stesso padre correlano per costruzione, e TOT con
    qualsiasi reato; due voci autonome sotto TOT invece no.
    """
    if code_a == "TOT" or code_b == "TOT":
        return True
    for parent, children in GERARCHIA.items():
        if code_a == parent and code_b in children:
            return True
        if code_b == parent and code_a in children:
            return True
        if code_a in children and code_b in children:
            return True
    return False


# Propensione alla denuncia per codice reato (fonte: indagini vittimizzazione ISTAT)
PROPENSIONE_DENUNCIA = {
    # Alta (>60%): reati con evidenza fisica o assicurativa
    "CARTHEF": "alta", "VEHITHEF": "alta", "MOPETHEF": "alta",
    "MOTORTHEF": "alta", "TRUCKTHEF": "alta",
    "BURGTHEF": "alta",
    "BANKROB": "alta", "POSTROB": "alta",

    # Media (30-60%)
    "BAGTHEF": "media", "PICKTHEF": "media",
    "SHOPTHEF": "media",
    "THEFT": "media",
    "DAMAGE": "media", "DAMARS": "media",
    "ROBBER": "media", "STREETROB": "media", "SHOPROB": "media",
    "HOUSEROB": "media",
    "BLOWS": "media", "CULPINJU": "media",

    # Bassa (<30%)
    "SWINCYB": "bassa", "CYBERCRIM": "bassa",
    "MENACE": "bassa",
    "EXTORT": "bassa",
    "RECEIV": "bassa",

    # Molto bassa (<15%)
    "RAPE": "molto_bassa", "RAPEUN18": "molto_bassa",
    "CP572": "molto_bassa",
    "CP612BIS": "molto_bassa",
    "USURY": "molto_bassa",
    "CORRUPUN18": "molto_bassa",
    "PORNO": "molto_bassa",

    # Non applicabile - reati senza vittima diretta
    "DRUG": "non_applicabile_consensuale",
    "PROSTI": "non_applicabile_consensuale",

    # Non applicabile - denuncia automatica
    "INTENHOM": "non_applicabile_automatica",
    "ATTEMPHOM": "non_applicabile_automatica",
    "MAFIAHOM": "non_applicabile_automatica",
    "ROBBHOM": "non_applicabile_automatica",
    "MANSHOM": "non_applicabile_automatica",
    "INFANTHOM": "non_applicabile_automatica",
    "MASSMURD": "non_applicabile_automatica",
}


def interpret_with_propensione(trend: str, propensione: str | None) -> str:
    """Chiave interpretativa: incrocia trend con propensione alla denuncia."""
    if propensione is None:
        return ""
    if propensione.startswith("non_applicabile"):
        return "interpretazione_non_applicabile"
    if trend == "increasing":
        if propensione in ("molto_bassa", "bassa"):
            return "emersione_probabile"
        elif propensione == "alta":
            return "aumento_reale_probabile"
        else:
            return "aumento_misto"
    elif trend == "decreasing":
        if propensione in ("molto_bassa", "bassa"):
            return "calo_ambiguo"
        elif propensione == "alta":
            return "calo_reale_probabile"
        else:
            return "calo_misto"
    return ""


# ---------------------------------------------------------------------------
# Caricamento dati
# ---------------------------------------------------------------------------

def load_json(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_serie_json(serie: pd.DataFrame, filename: str) -> None:
    """Salva in public/data/ le serie aggregate, che i grafici degli insight mostrano tali e quali."""
    path = DATA_DIR / filename
    serie.round(2).to_json(path, orient="records", force_ascii=False)
    log.info(f"  {filename}: {len(serie)} righe, {path.stat().st_size / 1024:.0f} KB")


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

    # Popolazione regionale per media pesata nei confronti territoriali
    pop_path = PROJECT_ROOT / "data" / "processed" / "popolazione_regioni_province.csv"
    pop = pd.read_csv(pop_path)
    pop_reg = pop[pop["livello"] == "regione"][["REF_AREA", "Anno", "Popolazione"]].copy()
    # Unifica ITD1+ITD2 (Trentino-Alto Adige) per coerenza con autori_vittime_regioni
    trento_bolzano = pop_reg[pop_reg["REF_AREA"].isin(["ITD1", "ITD2"])]
    if len(trento_bolzano) > 0:
        merged = trento_bolzano.groupby("Anno")["Popolazione"].sum().reset_index()
        merged["REF_AREA"] = "ITD1+ITD2"
        pop_reg = pd.concat([
            pop_reg[~pop_reg["REF_AREA"].isin(["ITD1", "ITD2"])],
            merged,
        ], ignore_index=True)
    datasets["popolazione_regioni"] = pop_reg

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


def calc_max_jump(series: np.ndarray, anni: np.ndarray) -> dict:
    """Salto massimo anno-su-anno nella serie."""
    if len(series) < 2:
        return {"max_jump_value": np.nan, "max_jump_year": np.nan,
                "max_jump_direction": ""}
    diffs = np.diff(series)
    idx = int(np.argmax(np.abs(diffs)))
    return {
        "max_jump_value": float(abs(diffs[idx])),
        "max_jump_year": int(anni[idx + 1]),
        "max_jump_direction": "up" if diffs[idx] > 0 else "down",
    }


def calc_year_on_year(
    series: np.ndarray, anni: np.ndarray, target_year: int
) -> dict:
    """Variazione anno-su-anno per un anno specifico.

    A differenza di calc_max_jump (massimo sull'intera serie), questa funzione
    calcola la variazione per target_year vs target_year-1.
    """
    result = {
        "yoy_change": np.nan, "yoy_pct": np.nan,
        "prev_value": np.nan, "curr_value": np.nan,
    }
    anni_list = list(anni)
    if target_year not in anni_list or (target_year - 1) not in anni_list:
        return result
    idx_curr = anni_list.index(target_year)
    idx_prev = anni_list.index(target_year - 1)
    curr = float(series[idx_curr])
    prev = float(series[idx_prev])
    change = curr - prev
    pct = (change / abs(prev) * 100) if prev != 0 else np.nan
    return {
        "yoy_change": change,
        "yoy_pct": pct,
        "prev_value": prev,
        "curr_value": curr,
    }


# Anni COVID da escludere per Mann-Kendall
COVID_YEARS = {2020, 2021}


def analyze_series(
    series: np.ndarray, anni: np.ndarray,
    covid_years: set[int] | None = None,
    target_year: int | None = None,
) -> dict:
    """Applica tutti i test su una serie temporale.

    Mann-Kendall e monotonicity vengono calcolati sulla serie senza anni COVID
    (risultato primario). La serie completa viene usata come controllo.
    Se i trend divergono, sensibile_covid = True.
    """
    if covid_years is None:
        covid_years = COVID_YEARS

    result = {}

    # MK sulla serie completa (controllo)
    mk_full = run_mann_kendall(series)

    # Serie pulita (senza anni COVID)
    mask_clean = ~np.isin(anni, list(covid_years))
    series_clean = series[mask_clean]

    if len(series_clean) >= MIN_DATA_POINTS and len(series_clean) < len(series):
        # Serie contiene anni COVID e la serie pulita ha abbastanza punti
        mk_clean = run_mann_kendall(series_clean)
        result.update(mk_clean)
        result["monotonicity"] = calc_monotonicity(series_clean)
        result["mk_trend_full"] = mk_full["mk_trend"]
        result["mk_p_full"] = mk_full["mk_p"]
        result["sensibile_covid"] = mk_clean["mk_trend"] != mk_full["mk_trend"]
        result["n_points_clean"] = len(series_clean)
    else:
        # Nessun anno COVID nella serie, o serie pulita troppo corta
        result.update(mk_full)
        result["monotonicity"] = calc_monotonicity(series)
        result["mk_trend_full"] = mk_full["mk_trend"]
        result["mk_p_full"] = mk_full["mk_p"]
        result["sensibile_covid"] = False
        result["n_points_clean"] = len(series)

    # Metriche descrittive sulla serie completa
    result.update(calc_zscore_last(series))
    result["cv"] = calc_cv(series)
    result["first_value"] = series[0]
    result["total_change_pp"] = series[-1] - series[0]
    result["anno_min"] = int(anni[0])
    result["anno_max"] = int(anni[-1])
    result["n_points"] = len(series)
    # Sparkline (valori arrotondati per compattezza)
    result["sparkline"] = [round(float(v), 1) for v in series]
    # Salto massimo anno-su-anno
    result.update(calc_max_jump(series, anni))
    # Variazione anno-su-anno per anno target (se specificato)
    if target_year is not None:
        result.update(calc_year_on_year(series, anni, target_year))
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
    corr, p_val = stats.spearmanr(percezione, tasso)
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
        "mk_trend_full": "",
        "mk_p_full": np.nan,
        "sensibile_covid": False,
        "zscore_last": np.nan,
        "last_value": np.nan,
        "cv": np.nan,
        "monotonicity": np.nan,
        "first_value": np.nan,
        "total_change_pp": np.nan,
        "max_jump_value": np.nan,
        "max_jump_year": np.nan,
        "max_jump_direction": "",
        "anno_min": int(anni[0]),
        "anno_max": int(anni[-1]),
        "n_points": len(anni),
        "n_points_clean": len(anni),
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
    """Correlazione di Spearman tra variazioni anno-su-anno di reati diversi.

    Detrending con differenze prime per evitare correlazioni spurie
    dovute a trend comuni (es. calo generalizzato dei delitti).
    """
    candidates = []

    for data_type in ["OFFEND", "VICTIM"]:
        dt_df = df[df["data_type"] == data_type]

        # Costruisci matrice reato x anno (totale)
        pivot = dt_df.pivot_table(
            index="anno", columns="codice_reato", values="totale", aggfunc="first"
        )
        # Solo reati con serie lunga e valori sufficienti
        # +1 perche' np.diff riduce la lunghezza di 1
        valid_cols = [
            c for c in pivot.columns
            if pivot[c].notna().sum() >= MIN_DATA_POINTS + 1
            and (pivot[c].dropna() >= MIN_ABS_PER_YEAR).all()
        ]
        pivot = pivot[valid_cols].dropna()

        if len(pivot) < MIN_DATA_POINTS + 1 or len(valid_cols) < 2:
            continue

        # Detrending: differenze prime per ogni reato
        pivot_diff = pivot.diff().iloc[1:]  # prima riga e' NaN

        # Nomi reati per lookup
        nomi = dict(
            zip(dt_df["codice_reato"], dt_df["reato"])
        )

        # Calcola correlazioni tra tutte le coppie (sulle variazioni)
        tested = set()
        for i, col_a in enumerate(valid_cols):
            for col_b in valid_cols[i + 1:]:
                pair = tuple(sorted([col_a, col_b]))
                if pair in tested:
                    continue
                tested.add(pair)

                # Escludi coppie genitore-figlio e fratelli
                if is_tautological_pair(col_a, col_b):
                    continue

                diff_a = pivot_diff[col_a].values
                diff_b = pivot_diff[col_b].values

                corr, p_val = stats.spearmanr(diff_a, diff_b)

                direction = "positiva" if corr > 0 else "negativa"
                candidates.append({
                    "analysis_type": "correlazione_reati",
                    "data_type": data_type,
                    "codice_reato": f"{col_a}_vs_{col_b}",
                    "reato": f"{nomi.get(col_a, col_a)} vs {nomi.get(col_b, col_b)}",
                    "dimensione": f"correlazione {direction} (detrended)",
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
                    "n_points": len(pivot_diff),
                    "n_points_clean": len(pivot_diff),
                    "sensibile_covid": False,
                    "max_jump_value": np.nan,
                    "max_jump_year": np.nan,
                    "max_jump_direction": "",
                    "sparkline": [],
                })

    log.info(f"Correlazioni tra reati: {len(candidates)} coppie testate (detrended)")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 9: Confronto trend tra categorie di reati
# ---------------------------------------------------------------------------

DIMENSIONI_CATEGORIE = {
    "totale": "totale",
    "pct_stranieri": "% stranieri",
    "pct_maschi": "% maschi",
    "pct_femmine": "% femmine",
}


def build_serie_categorie(df: pd.DataFrame) -> pd.DataFrame:
    """Serie annuali per categoria di reato: totale e percentuali pesate sul totale.

    Paniere costante: per ogni dimensione entrano solo i codici con un valore in tutti gli
    anni in cui la dimensione esiste, cosi' un codice che compare tardi (maltrattamenti dal
    2022) non crea un salto finto. Le stesse serie vanno ai grafici degli insight.

    Returns:
        Una riga per data_type, categoria e anno, una colonna per dimensione.
    """
    tables = []
    for data_type, dt_df in df.groupby("data_type"):
        for cat_name, cat_codes in CATEGORIE_REATI.items():
            cat_df = dt_df[dt_df["codice_reato"].isin(cat_codes)]
            serie = {}
            for col in DIMENSIONI_CATEGORIE:
                n_anni = dt_df.dropna(subset=[col])["anno"].nunique()
                sub = cat_df.dropna(subset=[col])
                presenza = sub.groupby("codice_reato")["anno"].nunique()
                sub = sub[sub["codice_reato"].isin(presenza[presenza == n_anni].index)]
                if sub.empty:
                    continue
                if col == "totale":
                    serie[col] = sub.groupby("anno")["totale"].sum()
                else:
                    pesi = sub.groupby("anno")["totale"].sum()
                    serie[col] = (sub[col] * sub["totale"]).groupby(sub["anno"]).sum() / pesi
            if not serie:
                continue
            table = pd.DataFrame(serie).rename_axis("anno").reset_index()
            table.insert(0, "categoria", cat_name)
            table.insert(0, "data_type", data_type)
            tables.append(table)
    return pd.concat(tables, ignore_index=True)


def analyze_confronto_trend_categorie(serie: pd.DataFrame) -> list[dict]:
    """Confronta trend tra categorie di reati (violenti vs patrimoniali etc.)."""
    candidates = []

    for data_type, dt_df in serie.groupby("data_type"):
        cat_names = list(dt_df["categoria"].unique())
        for i, cat_a in enumerate(cat_names):
            for cat_b in cat_names[i + 1:]:
                for col, dim_label in DIMENSIONI_CATEGORIE.items():
                    s_a = dt_df[dt_df["categoria"] == cat_a].set_index("anno")[col].dropna()
                    s_b = dt_df[dt_df["categoria"] == cat_b].set_index("anno")[col].dropna()

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

                    result.update({
                        "analysis_type": "confronto_trend_categorie",
                        "data_type": data_type,
                        "codice_reato": f"{cat_a}_vs_{cat_b}",
                        "reato": f"{cat_a} vs {cat_b}",
                        "dimensione": dim_label,
                        "territorio": "Italia",
                    })
                    candidates.append(result)

    log.info(f"Confronto trend categorie: {len(candidates)} candidati")
    return candidates


# ---------------------------------------------------------------------------
# Analisi 10: Confronti territoriali (Nord vs Centro vs Sud)
# ---------------------------------------------------------------------------

DIMENSIONI_RIPARTIZIONI = {
    "pct_stranieri": "% stranieri",
    "pct_maschi": "% maschi",
    "pct_femmine": "% femmine",
    "tasso": "tasso per 100k",
}


def build_serie_ripartizioni(
    df_regioni: pd.DataFrame, pop_regioni: pd.DataFrame
) -> pd.DataFrame:
    """Serie annuali per ripartizione: tasso pesato sulla popolazione, % pesate sul totale.

    La media semplice delle regioni farebbe pesare il Molise quanto la Campania. Le stesse
    serie vanno ai grafici degli insight.

    Returns:
        Una riga per data_type, codice_reato, ripartizione e anno, una colonna per dimensione.
    """
    pop = pop_regioni.rename(columns={"REF_AREA": "codice_regione", "Anno": "anno"})
    df = df_regioni.merge(pop[["codice_regione", "anno", "Popolazione"]],
                          on=["codice_regione", "anno"], how="left")
    regione_to_rip = {reg: rip for rip, regs in RIPARTIZIONI.items() for reg in regs}
    df["ripartizione"] = df["codice_regione"].map(regione_to_rip)

    tables = []
    keys = ["data_type", "codice_reato", "ripartizione"]
    for key, grp in df.dropna(subset=["ripartizione"]).groupby(keys):
        serie = {}
        for col in DIMENSIONI_RIPARTIZIONI:
            peso = "Popolazione" if col == "tasso" else "totale"
            sub = grp.dropna(subset=[col, peso])
            pesi = sub.groupby("anno")[peso].sum().replace(0, np.nan)
            serie[col] = ((sub[col] * sub[peso]).groupby(sub["anno"]).sum() / pesi).dropna()
        table = pd.DataFrame(serie).rename_axis("anno").reset_index()
        for name, value in zip(reversed(keys), reversed(key)):
            table.insert(0, name, value)
        tables.append(table)
    return pd.concat(tables, ignore_index=True)


def analyze_confronti_territoriali(
    serie: pd.DataFrame, df_regioni: pd.DataFrame
) -> list[dict]:
    """Confronta trend tra ripartizioni (Nord/Centro/Sud) per dimensione."""
    candidates = []
    nomi = dict(zip(df_regioni["codice_reato"], df_regioni["reato"]))

    for (data_type, codice_reato), reato_df in serie.groupby(["data_type", "codice_reato"]):
        reato_label = nomi[codice_reato]

        for col, dim_label in DIMENSIONI_RIPARTIZIONI.items():
            rip_series = {}
            for rip_name in RIPARTIZIONI:
                agg = reato_df[reato_df["ripartizione"] == rip_name].set_index(
                    "anno")[col].dropna()
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
# Analisi 11: Rapporto autori/vittime nel tempo
# ---------------------------------------------------------------------------

def analyze_rapporto_autori_vittime(df: pd.DataFrame) -> list[dict]:
    """Trend del rapporto autori/vittime per ogni reato."""
    candidates = []

    # Pivot separati per OFFEND e VICTIM
    off_df = df[df["data_type"] == "OFFEND"]
    vic_df = df[df["data_type"] == "VICTIM"]

    off_pivot = off_df.pivot_table(
        index="anno", columns="codice_reato", values="totale", aggfunc="first"
    )
    vic_pivot = vic_df.pivot_table(
        index="anno", columns="codice_reato", values="totale", aggfunc="first"
    )

    # Nomi reati per lookup
    nomi = dict(zip(df["codice_reato"], df["reato"]))

    # Reati presenti in entrambi
    common_reati = set(off_pivot.columns) & set(vic_pivot.columns)

    for reato in sorted(common_reati):
        off_series = off_pivot[reato].dropna()
        vic_series = vic_pivot[reato].dropna()

        # Allinea sugli anni comuni
        common_anni = off_series.index.intersection(vic_series.index)
        if len(common_anni) < MIN_DATA_POINTS:
            continue

        autori = off_series.loc[common_anni].values.astype(float)
        vittime = vic_series.loc[common_anni].values.astype(float)
        anni = common_anni.values

        # Evita divisione per zero
        if np.any(vittime == 0):
            continue

        rapporto = autori / vittime

        result = analyze_series(rapporto, anni)
        result.update({
            "analysis_type": "rapporto_autori_vittime",
            "data_type": "RAPPORTO",
            "codice_reato": reato,
            "reato": nomi.get(reato, reato),
            "dimensione": "autori/vittime",
            "territorio": "Italia",
        })
        candidates.append(result)

    log.info(f"Rapporto autori/vittime: {len(candidates)} candidati")
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
        "confronto_trend_categorie": df["analysis_type"] == "confronto_trend_categorie",
        "territoriale": df["analysis_type"] == "confronto_territoriale",
        "rapporto_av": df["analysis_type"] == "rapporto_autori_vittime",
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


def filtra_rilevanza(df: pd.DataFrame) -> pd.DataFrame:
    """Scarta i risultati troppo piccoli per diventare un insight.

    Va dopo apply_fdr: Benjamini-Hochberg deve ricevere l'intera famiglia di test, se no
    la soglia diventa piu' permissiva del 5% dichiarato.
    """
    tipo = df["analysis_type"]
    variazione = df["total_change_pp"].abs()
    scarta = (
        (tipo.isin(["trend_nazionale_pct", "trend_regionale"])
         & df["dimensione"].str.startswith("%") & (variazione < MIN_EFFECT_PP))
        | ((tipo == "correlazione_reati") & (df["last_value"].abs() < MIN_RHO))
        | ((tipo == "rapporto_autori_vittime") & (variazione < MIN_DELTA_RAPPORTO))
        | (tipo.isin(["confronto_trend_categorie", "confronto_territoriale"])
           & (df["mk_p"] > MAX_P_CONFRONTI))
    )
    log.info(f"Filtro di rilevanza: {scarta.sum()} test scartati su {len(df)}")
    return df[~scarta].reset_index(drop=True)


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

    # Confidenza a tre livelli con soglie riviste
    df["confidence"] = "low"
    df.loc[df["fdr_significant"] & (df["score"] >= 0.5), "confidence"] = "medium"
    df.loc[
        df["fdr_significant"]
        & (df["monotonicity"] >= 0.7)
        & (df["n_points"] >= 12),
        "confidence",
    ] = "high"

    # Warning bassa potenza: serie con < 7 punti puliti dopo esclusione COVID
    n_clean = df["n_points_clean"].fillna(df["n_points"]) if "n_points_clean" in df.columns else df["n_points"]
    df.loc[n_clean < 7, "confidence"] = "low"

    # Annotazioni eventi noti
    def check_known_events(row):
        events = []
        if pd.notna(row.get("anno_min")) and pd.notna(row.get("anno_max")):
            for year, desc in KNOWN_EVENTS.items():
                if row["anno_min"] <= year <= row["anno_max"]:
                    events.append(f"{year}: {desc}")
        return "; ".join(events) if events else ""

    df["known_events"] = df.apply(check_known_events, axis=1)

    # Propensione alla denuncia e interpretazione
    def get_propensione(row):
        code = row.get("codice_reato", "")
        if "_vs_" in str(code):
            return ""
        return PROPENSIONE_DENUNCIA.get(code, "")

    df["propensione_denuncia"] = df.apply(get_propensione, axis=1)
    df["interpretazione_propensione"] = df.apply(
        lambda r: interpret_with_propensione(
            r.get("mk_trend", ""), r.get("propensione_denuncia", "")
        ),
        axis=1,
    )

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
        "Correlazione di Spearman tra le variazioni anno-su-anno (detrended) "
        "di reati diversi. Valori prossimi a +1 indicano che i due reati "
        "co-variano, prossimi a -1 che variano in direzioni opposte."
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

    # --- Sezione 7: confronto trend categorie ---
    lines.append("---")
    lines.append("")
    lines.append("## 7. Confronto trend tra categorie di reati")
    lines.append("")
    lines.append(
        "Trend della differenza tra categorie (es. violenti - patrimoniali). "
        "Un trend crescente indica che la prima categoria cresce piu' della seconda."
    )
    lines.append("")
    diff_cat = sig[sig["analysis_type"] == "confronto_trend_categorie"].head(20)
    if len(diff_cat) == 0:
        diff_cat = df[df["analysis_type"] == "confronto_trend_categorie"].head(10)
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

    # --- Sezione 9: rapporto autori/vittime ---
    lines.append("---")
    lines.append("")
    lines.append("## 9. Rapporto autori/vittime")
    lines.append("")
    lines.append(
        "Trend del rapporto autori/vittime per reato. Un rapporto in calo "
        "indica piu' vittime per ogni autore identificato."
    )
    lines.append("")
    rapporto = sig[sig["analysis_type"] == "rapporto_autori_vittime"].head(20)
    if len(rapporto) == 0:
        rapporto = df[df["analysis_type"] == "rapporto_autori_vittime"].head(10)
    for _, r in rapporto.iterrows():
        direction = "crescente" if r["mk_trend"] == "increasing" else "decrescente"
        p = r["mk_p_adjusted"] if pd.notna(r.get("mk_p_adjusted")) else r["mk_p"]
        fdr = " [FDR sig.]" if r.get("fdr_significant", False) else ""
        lines.append(
            f"- **{r['reato']}**: trend {direction}, "
            f"rapporto {r['first_value']:.2f} -> {r['last_value']:.2f} "
            f"({r['total_change_pp']:+.2f}), "
            f"p={p:.4f}{fdr}"
        )
    lines.append("")

    # --- Sezione 10: top 50 assoluti per score ---
    lines.append("---")
    lines.append("")
    lines.append("## 10. Top 50 candidati per score (tutti i tipi)")
    lines.append("")
    lines.append(
        "| # | Score | Conf. | Reato | Tipo | Dimensione | Territorio | "
        "Trend | Cambio | p (adj) | Mono | COVID | Propensione |"
    )
    lines.append(
        "|---|-------|-------|-------|------|------------|------------|"
        "-------|--------|---------|------|-------|-------------|"
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
        covid = "!" if r.get("sensibile_covid", False) else ""
        prop = r.get("propensione_denuncia", "")
        lines.append(
            f"| {i} | {r['score']:.3f} | {r['confidence']} | "
            f"{r['reato']} | {dt} | {r['dimensione']} | {r['territorio']} | "
            f"{r['mk_trend']} | {change} | {p_adj} | {mono} | "
            f"{covid} | {prop} |"
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

    log.info("Analisi confronto trend tra categorie di reati...")
    serie_categorie = build_serie_categorie(data["avt"])
    save_serie_json(serie_categorie, "insights_categorie.json")
    all_candidates.extend(analyze_confronto_trend_categorie(serie_categorie))

    log.info("Analisi confronti territoriali (Nord/Centro/Sud)...")
    serie_ripartizioni = build_serie_ripartizioni(data["avr"], data["popolazione_regioni"])
    save_serie_json(serie_ripartizioni, "insights_ripartizioni.json")
    all_candidates.extend(analyze_confronti_territoriali(serie_ripartizioni, data["avr"]))

    log.info("Analisi rapporto autori/vittime...")
    all_candidates.extend(analyze_rapporto_autori_vittime(data["avt"]))

    log.info(f"Totale candidati pre-FDR: {len(all_candidates)}")

    # DataFrame
    df = pd.DataFrame(all_candidates)

    # FDR
    log.info("Applicazione FDR Benjamini-Hochberg...")
    df = filtra_rilevanza(apply_fdr(df))

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
        "mk_trend_full", "mk_p_full", "sensibile_covid",
        "mk_tau", "theil_sen_slope",
        "total_change_pp", "first_value", "last_value",
        "zscore_last", "cv", "monotonicity",
        "max_jump_value", "max_jump_year", "max_jump_direction",
        "anno_min", "anno_max", "n_points", "n_points_clean",
        "propensione_denuncia", "interpretazione_propensione",
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
