"""Genera tutti i CSV/JSON dei delitti da SDMX raw + popolazione.

Sostituisce il notebook analisi_delitti.ipynb e assorbe generate_allarme_regioni.py.

Input:
  - data/raw/delittips/delittips_1.csv (DF_1: Italia + tutti territori, numeri assoluti)
  - data/processed/popolazione_regioni_province.csv
  - data/raw/percezione_criminalita_2014_2023_istat.csv

Output CSV (data/processed/):
  - delitti_italia_normalizzato.csv
  - delitti_regioni_normalizzato.csv
  - delitti_province_normalizzato.csv
  - delitti_categorie_normalizzato.csv
  - reati_allarme_sociale.csv
  - percezione_vs_dati.csv

Output JSON (public/data/):
  - reati_allarme_sociale_regioni.json
  - reati_allarme_sociale_province.json
"""

import json
import logging
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

# Filtri SDMX per DF_1
FILTERS = {
    "Y_KNOWN_OFFENDER_IDEN": 9,  # totale (autore noto + ignoto)
    "REFERENCE_PERIOD_CRIME": "YRDUR",
    "DATA_TYPE": "CRIMEN",  # numeri assoluti
}

# Mapping codice SDMX -> etichetta reato
CRIME_LABELS = {
    "ARSON": "Incendi", "ARTTHEF": "Furti opere d'arte", "ATTACK": "Attentati",
    "ATTEMPHOM": "Tentati omicidi", "BAGTHEF": "Furti con strappo",
    "BANKROB": "Rapine in banca", "BLOWS": "Percosse", "BURGTHEF": "Furti in abitazioni",
    "CARTHEF": "Furti di autovetture", "CORRUPUN18": "Corruzione di minorenne",
    "COUNTER": "Contraffazione marchi", "CRIMASS": "Associazione per delinquere",
    "CULPINJU": "Lesioni dolose", "CYBERCRIM": "Delitti informatici",
    "DAMAGE": "Danneggiamenti", "DAMARS": "Danneggiamento seguito da incendio",
    "DRUG": "Stupefacenti", "EXTORT": "Estorsioni", "FOREARS": "Incendi boschivi",
    "HOUSEROB": "Rapine in abitazione", "INFANTHOM": "Infanticidi",
    "INTENHOM": "Omicidi volontari consumati", "INTPROP": "Violazione proprieta' intellettuale",
    "KIDNAPP": "Sequestri di persona", "MAFIAHOM": "Omicidi tipo mafioso",
    "MAFIASS": "Associazione tipo mafioso", "MANSHOM": "Omicidi preterintenzionali",
    "MASSMURD": "Strage", "MENACE": "Minacce", "MONEYLAU": "Riciclaggio",
    "MOPETHEF": "Furti ciclomotori", "MOTORTHEF": "Furti motocicli",
    "OFFENCE": "Ingiurie", "OTHCRIM": "Altri delitti",
    "PICKTHEF": "Furti con destrezza", "PORNO": "Pornografia minorile",
    "POSTROB": "Rapine uffici postali", "PROSTI": "Sfruttamento prostituzione",
    "RAPE": "Violenze sessuali", "RAPEUN18": "Atti sessuali con minorenne",
    "RECEIV": "Ricettazione", "ROADHOM": "Omicidi colposi da incidente stradale",
    "ROBBER": "Rapine", "ROBBHOM": "Omicidi a scopo furto/rapina",
    "SHOPROB": "Rapine esercizi commerciali", "SHOPTHEF": "Furti esercizi commerciali",
    "SMUGGL": "Contrabbando", "STREETROB": "Rapine pubblica via",
    "SWINCYB": "Truffe e frodi informatiche", "TERRORHOM": "Omicidi a scopo terroristico",
    "THEFT": "Furti", "TRUCKTHEF": "Furti automezzi pesanti",
    "UNINTHOM": "Omicidi colposi", "USURY": "Usura", "VEHITHEF": "Furti in auto in sosta",
}

# Mapping codice -> categoria (include padri + figli, doppi conteggi intenzionali)
CATEGORY_MAP = {
    "THEFT": "Furti", "BAGTHEF": "Furti", "PICKTHEF": "Furti", "BURGTHEF": "Furti",
    "SHOPTHEF": "Furti", "VEHITHEF": "Furti", "ARTTHEF": "Furti", "TRUCKTHEF": "Furti",
    "MOPETHEF": "Furti", "MOTORTHEF": "Furti", "CARTHEF": "Furti",
    "ROBBER": "Rapine", "HOUSEROB": "Rapine", "BANKROB": "Rapine",
    "POSTROB": "Rapine", "SHOPROB": "Rapine", "STREETROB": "Rapine",
    "INTENHOM": "Violenze contro la persona", "ATTEMPHOM": "Violenze contro la persona",
    "MANSHOM": "Violenze contro la persona", "INFANTHOM": "Violenze contro la persona",
    "MAFIAHOM": "Violenze contro la persona", "ROBBHOM": "Violenze contro la persona",
    "TERRORHOM": "Violenze contro la persona", "MASSMURD": "Violenze contro la persona",
    "BLOWS": "Violenze contro la persona", "CULPINJU": "Violenze contro la persona",
    "MENACE": "Violenze contro la persona", "KIDNAPP": "Violenze contro la persona",
    "OFFENCE": "Violenze contro la persona", "RAPE": "Violenze contro la persona",
    "RAPEUN18": "Violenze contro la persona", "PORNO": "Violenze contro la persona",
    "CORRUPUN18": "Violenze contro la persona", "PROSTI": "Violenze contro la persona",
    "SWINCYB": "Truffe e Frodi", "CYBERCRIM": "Truffe e Frodi",
    "COUNTER": "Truffe e Frodi", "INTPROP": "Truffe e Frodi",
    "DRUG": "Droga",
    "ARSON": "Altro", "ATTACK": "Altro", "CRIMASS": "Altro",
    "DAMAGE": "Altro", "DAMARS": "Altro", "EXTORT": "Altro", "FOREARS": "Altro",
    "MAFIASS": "Altro", "MONEYLAU": "Altro", "OTHCRIM": "Altro", "RECEIV": "Altro",
    "ROADHOM": "Altro", "SMUGGL": "Altro", "UNINTHOM": "Altro", "USURY": "Altro",
}

# Reati allarme sociale
ALLARME_CODES = {
    "INTENHOM": "Omicidi volontari consumati",
    "ATTEMPHOM": "Tentati omicidi",
    "RAPE": "Violenze sessuali",
    "RAPEUN18": "Atti sessuali con minorenne",
    "KIDNAPP": "Sequestri di persona",
    "HOUSEROB": "Rapine in abitazione",
}

# Mapping NUTS2 -> nome regione
NUTS2_NAMES = {
    "ITC1": "Piemonte", "ITC2": "Valle d'Aosta / Vallée d'Aoste",
    "ITC3": "Liguria", "ITC4": "Lombardia",
    "ITD1": "Provincia Autonoma Bolzano / Bozen", "ITD2": "Provincia Autonoma Trento",
    "ITD3": "Veneto", "ITD4": "Friuli-Venezia Giulia", "ITD5": "Emilia-Romagna",
    "ITE1": "Toscana", "ITE2": "Umbria", "ITE3": "Marche", "ITE4": "Lazio",
    "ITF1": "Abruzzo", "ITF2": "Molise", "ITF3": "Campania", "ITF4": "Puglia",
    "ITF5": "Basilicata", "ITF6": "Calabria", "ITG1": "Sicilia", "ITG2": "Sardegna",
}

# Province con codici speciali
PROVINCE_SPECIALI = {"IT108", "IT109", "IT110"}

# Mapping provincia -> regione (derivato dal prefisso NUTS)
PROVINCE_TO_REGIONE = {
    "IT108": "Lombardia",  # Monza e della Brianza
    "IT109": "Marche",     # Fermo
    "IT110": "Puglia",     # Barletta-Andria-Trani
}


def nuts3_to_regione(code: str) -> str:
    """Deriva il nome regione dal codice NUTS3 della provincia."""
    if code in PROVINCE_TO_REGIONE:
        return PROVINCE_TO_REGIONE[code]
    # Prefisso NUTS2: prime 4 lettere (es. ITC11 -> ITC1)
    prefix = code[:4]
    # Eccezione: ITC4x (ITC41-ITC4B) -> ITC4
    if prefix in NUTS2_NAMES:
        return NUTS2_NAMES[prefix]
    # Casi come ITD10 -> ITD1
    prefix3 = code[:3] + code[3]
    if prefix3 in NUTS2_NAMES:
        return NUTS2_NAMES[prefix3]
    return "Sconosciuta"


def load_delittips(project_root: Path) -> pd.DataFrame:
    """Carica e filtra DF_1 (Italia + tutti i territori)."""
    filepath = project_root / "data" / "raw" / "delittips" / "delittips_1.csv"
    df = pd.read_csv(filepath, sep=";", dtype={"REF_AREA": str}, low_memory=False)

    for col, val in FILTERS.items():
        df = df[df[col] == val]

    df = df[["REF_AREA", "TYPE_CRIME", "TIME_PERIOD", "OBS_VALUE"]].copy()
    df = df.rename(columns={"TIME_PERIOD": "Anno", "OBS_VALUE": "Delitti"})
    df["Delitti"] = pd.to_numeric(df["Delitti"], errors="coerce").fillna(0).astype(int)
    return df


def load_popolazione(project_root: Path) -> pd.DataFrame:
    """Carica CSV popolazione."""
    filepath = project_root / "data" / "processed" / "popolazione_regioni_province.csv"
    return pd.read_csv(filepath, dtype={"REF_AREA": str})


def is_nuts2(code: str) -> bool:
    """Verifica se un codice e' NUTS2 (regione)."""
    return code in NUTS2_NAMES


def is_nuts3(code: str) -> bool:
    """Verifica se un codice e' NUTS3 (provincia)."""
    if code in PROVINCE_SPECIALI:
        return True
    # NUTS3: 5+ caratteri alfanumerici (es. ITC11, ITE1A, ITC4B)
    return len(code) >= 5 and code[:2] == "IT"


def generate_italia(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera delitti_italia_normalizzato.csv."""
    df_it = df[(df["REF_AREA"] == "IT") & (df["TYPE_CRIME"] == "TOT")].copy()
    pop_it = pop[pop["livello"] == "italia"][["Anno", "Popolazione"]]

    result = df_it.merge(pop_it, on="Anno", how="left")
    result["Tasso_per_1000"] = result["Delitti"] / result["Popolazione"] * 1000
    result = result[["Anno", "Delitti", "Popolazione", "Tasso_per_1000"]].sort_values("Anno")

    out = project_root / "data" / "processed" / "delitti_italia_normalizzato.csv"
    result.to_csv(out, index=False)
    log.info(f"  {out.name}: {len(result)} righe, anni {result['Anno'].min()}-{result['Anno'].max()}")


def generate_regioni(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera delitti_regioni_normalizzato.csv."""
    region_codes = set(NUTS2_NAMES.keys())
    df_reg = df[(df["REF_AREA"].isin(region_codes)) & (df["TYPE_CRIME"] == "TOT")].copy()

    # Aggrega ITD1 + ITD2 -> ITD12 (Trentino-Alto Adige)
    mask_trentino = df_reg["REF_AREA"].isin(["ITD1", "ITD2"])
    df_trentino = (
        df_reg[mask_trentino]
        .groupby("Anno", as_index=False)["Delitti"]
        .sum()
    )
    df_trentino["REF_AREA"] = "ITD12"
    df_trentino["TYPE_CRIME"] = "TOT"
    df_reg = pd.concat([df_reg[~mask_trentino], df_trentino], ignore_index=True)

    # Popolazione: ITD12 = ITD1 + ITD2
    pop_reg = pop[pop["livello"] == "regione"][["REF_AREA", "Anno", "Territorio", "Popolazione"]].copy()
    pop_trentino = pop_reg[pop_reg["REF_AREA"].isin(["ITD1", "ITD2"])]
    pop_trentino_agg = pop_trentino.groupby("Anno", as_index=False)["Popolazione"].sum()
    pop_trentino_agg["REF_AREA"] = "ITD12"
    pop_trentino_agg["Territorio"] = "Trentino-Alto Adige"
    pop_reg = pd.concat([
        pop_reg[~pop_reg["REF_AREA"].isin(["ITD1", "ITD2"])],
        pop_trentino_agg,
    ], ignore_index=True)

    result = df_reg.merge(pop_reg[["REF_AREA", "Anno", "Territorio", "Popolazione"]], on=["REF_AREA", "Anno"], how="left")
    result["Tasso_per_1000"] = (result["Delitti"] / result["Popolazione"] * 1000).round(2)
    result = result[["REF_AREA", "Territorio", "Anno", "Delitti", "Popolazione", "Tasso_per_1000"]]
    result = result.sort_values(["REF_AREA", "Anno"])

    out = project_root / "data" / "processed" / "delitti_regioni_normalizzato.csv"
    result.to_csv(out, index=False)
    log.info(f"  {out.name}: {len(result)} righe, {result['Territorio'].nunique()} regioni")

    missing = result["Popolazione"].isna().sum()
    if missing > 0:
        log.warning(f"  ATTENZIONE: {missing} righe senza popolazione!")
        log.warning(result[result["Popolazione"].isna()][["REF_AREA", "Anno"]].to_string())


def generate_province(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera delitti_province_normalizzato.csv."""
    pop_prov = pop[pop["livello"] == "provincia"][["REF_AREA", "Territorio", "Anno", "Popolazione"]].copy()
    prov_codes = set(pop_prov["REF_AREA"].unique())

    df_prov = df[(df["REF_AREA"].isin(prov_codes)) & (df["TYPE_CRIME"] == "TOT")].copy()

    result = df_prov.merge(pop_prov, on=["REF_AREA", "Anno"], how="left")
    result["Regione"] = result["REF_AREA"].apply(nuts3_to_regione)
    result["Tasso_per_1000"] = (result["Delitti"] / result["Popolazione"] * 1000).round(2)
    result = result[["REF_AREA", "Territorio", "Anno", "Delitti", "Regione", "Popolazione", "Tasso_per_1000"]]
    result = result.sort_values(["REF_AREA", "Anno"])

    out = project_root / "data" / "processed" / "delitti_province_normalizzato.csv"
    result.to_csv(out, index=False)
    log.info(f"  {out.name}: {len(result)} righe, {result['Territorio'].nunique()} province")

    missing = result["Popolazione"].isna().sum()
    if missing > 0:
        log.warning(f"  ATTENZIONE: {missing} righe senza popolazione!")


def generate_categorie(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera delitti_categorie_normalizzato.csv."""
    df_it = df[df["REF_AREA"] == "IT"].copy()
    df_it = df_it[df_it["TYPE_CRIME"] != "TOT"]
    df_it["Categoria"] = df_it["TYPE_CRIME"].map(CATEGORY_MAP)

    # Codici senza categoria
    unmapped = df_it[df_it["Categoria"].isna()]["TYPE_CRIME"].unique()
    if len(unmapped) > 0:
        log.warning(f"  Codici senza categoria: {list(unmapped)}")

    df_cat = df_it.groupby(["Anno", "Categoria"], as_index=False)["Delitti"].sum()
    pop_it = pop[pop["livello"] == "italia"][["Anno", "Popolazione"]]
    result = df_cat.merge(pop_it, on="Anno", how="left")
    result["Tasso_per_1000"] = result["Delitti"] / result["Popolazione"] * 1000
    result = result[["Anno", "Categoria", "Delitti", "Popolazione", "Tasso_per_1000"]]
    result = result.sort_values(["Anno", "Categoria"])

    out = project_root / "data" / "processed" / "delitti_categorie_normalizzato.csv"
    result.to_csv(out, index=False)
    log.info(f"  {out.name}: {len(result)} righe, categorie: {sorted(result['Categoria'].unique())}")


def generate_allarme_sociale(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera reati_allarme_sociale.csv (Italia)."""
    df_it = df[df["REF_AREA"] == "IT"].copy()
    df_it = df_it[df_it["TYPE_CRIME"].isin(ALLARME_CODES)]
    df_it["Reato"] = df_it["TYPE_CRIME"].map(ALLARME_CODES)

    pop_it = pop[pop["livello"] == "italia"][["Anno", "Popolazione"]]
    result = df_it.merge(pop_it, on="Anno", how="left")
    result["Tasso_per_100k"] = result["Delitti"] / result["Popolazione"] * 100_000
    result = result[["Anno", "Reato", "Delitti", "Popolazione", "Tasso_per_100k"]]
    result = result.sort_values(["Anno", "Reato"])

    out = project_root / "data" / "processed" / "reati_allarme_sociale.csv"
    result.to_csv(out, index=False)
    log.info(f"  {out.name}: {len(result)} righe")


def generate_allarme_regioni_json(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera reati_allarme_sociale_regioni.json."""
    region_codes = set(NUTS2_NAMES.keys())
    df_reg = df[df["REF_AREA"].isin(region_codes) & df["TYPE_CRIME"].isin(ALLARME_CODES)].copy()
    df_reg["Reato"] = df_reg["TYPE_CRIME"].map(ALLARME_CODES)

    # Aggrega ITD1 + ITD2 -> ITD12
    mask_trentino = df_reg["REF_AREA"].isin(["ITD1", "ITD2"])
    df_trentino = (
        df_reg[mask_trentino]
        .groupby(["Anno", "Reato"], as_index=False)["Delitti"]
        .sum()
    )
    df_trentino["REF_AREA"] = "ITD12"
    df_reg = pd.concat([df_reg[~mask_trentino], df_trentino], ignore_index=True)
    df_reg = df_reg[["REF_AREA", "Anno", "Reato", "Delitti"]]

    # Popolazione regionale (con ITD12 aggregato)
    pop_reg = pop[pop["livello"] == "regione"][["REF_AREA", "Anno", "Territorio", "Popolazione"]].copy()
    pop_trentino = pop_reg[pop_reg["REF_AREA"].isin(["ITD1", "ITD2"])]
    pop_trentino_agg = pop_trentino.groupby("Anno", as_index=False)["Popolazione"].sum()
    pop_trentino_agg["REF_AREA"] = "ITD12"
    pop_trentino_agg["Territorio"] = "Trentino-Alto Adige"
    pop_reg = pd.concat([
        pop_reg[~pop_reg["REF_AREA"].isin(["ITD1", "ITD2"])],
        pop_trentino_agg,
    ], ignore_index=True)

    result = df_reg.merge(pop_reg[["REF_AREA", "Anno", "Territorio", "Popolazione"]], on=["REF_AREA", "Anno"], how="left")
    result["Tasso_per_100k"] = ((result["Delitti"] / result["Popolazione"]) * 100_000).round(2)
    result = result.sort_values(["Reato", "Territorio", "Anno"])
    result = result[["REF_AREA", "Territorio", "Anno", "Reato", "Delitti", "Popolazione", "Tasso_per_100k"]]

    out = project_root / "public" / "data" / "reati_allarme_sociale_regioni.json"
    records = result.to_dict(orient="records")
    out.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    log.info(f"  {out.name}: {len(records)} record, {result['Territorio'].nunique()} regioni")

    missing = result["Popolazione"].isna().sum()
    if missing > 0:
        log.warning(f"  ATTENZIONE: {missing} record senza popolazione!")


def generate_allarme_province_json(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera reati_allarme_sociale_province.json."""
    pop_prov = pop[pop["livello"] == "provincia"][["REF_AREA", "Territorio", "Anno", "Popolazione"]].copy()
    prov_codes = set(pop_prov["REF_AREA"].unique())

    df_prov = df[df["REF_AREA"].isin(prov_codes) & df["TYPE_CRIME"].isin(ALLARME_CODES)].copy()
    df_prov["Reato"] = df_prov["TYPE_CRIME"].map(ALLARME_CODES)
    df_prov = df_prov[["REF_AREA", "Anno", "Reato", "Delitti"]]

    # Aggiungi Regione
    prov_regione = {code: nuts3_to_regione(code) for code in prov_codes}
    pop_prov["Regione"] = pop_prov["REF_AREA"].map(prov_regione)

    result = df_prov.merge(pop_prov, on=["REF_AREA", "Anno"], how="left")
    result["Tasso_per_100k"] = ((result["Delitti"] / result["Popolazione"]) * 100_000).round(2)
    result = result.sort_values(["Reato", "Regione", "Territorio", "Anno"])
    result = result[["REF_AREA", "Territorio", "Anno", "Reato", "Delitti", "Regione", "Popolazione", "Tasso_per_100k"]]

    out = project_root / "public" / "data" / "reati_allarme_sociale_province.json"
    records = result.to_dict(orient="records")
    out.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    log.info(f"  {out.name}: {len(records)} record, {result['Territorio'].nunique()} province")

    missing = result["Popolazione"].isna().sum()
    if missing > 0:
        log.warning(f"  ATTENZIONE: {missing} record senza popolazione!")


def generate_percezione(df: pd.DataFrame, pop: pd.DataFrame, project_root: Path) -> None:
    """Genera percezione_vs_dati.csv."""
    # Delitti Italia TOT
    df_it = df[(df["REF_AREA"] == "IT") & (df["TYPE_CRIME"] == "TOT")].copy()
    pop_it = pop[pop["livello"] == "italia"][["Anno", "Popolazione"]]
    result = df_it.merge(pop_it, on="Anno", how="left")
    result["Tasso_per_1000"] = result["Delitti"] / result["Popolazione"] * 1000

    # Percezione
    perc_path = project_root / "data" / "raw" / "percezione_criminalita_2014_2023_istat.csv"
    df_perc = pd.read_csv(perc_path, sep=";")
    df_perc = df_perc.rename(columns={"TIME_PERIOD": "Anno", "Osservazione": "Percezione_pct"})
    df_perc = df_perc[["Anno", "Percezione_pct"]]

    result = result.merge(df_perc, on="Anno", how="left")
    result = result[["Anno", "Delitti", "Popolazione", "Tasso_per_1000", "Percezione_pct"]]
    result = result.sort_values("Anno")

    out = project_root / "data" / "processed" / "percezione_vs_dati.csv"
    result.to_csv(out, index=False)
    log.info(f"  {out.name}: {len(result)} righe")


def main():
    project_root = Path(__file__).resolve().parent.parent

    log.info("Caricamento dati...")
    df = load_delittips(project_root)
    log.info(f"  DF_1 filtrato: {len(df)} righe, anni {df['Anno'].min()}-{df['Anno'].max()}")

    pop = load_popolazione(project_root)
    log.info(f"  Popolazione: {len(pop)} righe")

    log.info("\nGenerazione CSV...")
    generate_italia(df, pop, project_root)
    generate_regioni(df, pop, project_root)
    generate_province(df, pop, project_root)
    generate_categorie(df, pop, project_root)
    generate_allarme_sociale(df, pop, project_root)
    generate_percezione(df, pop, project_root)

    log.info("\nGenerazione JSON allarme sociale...")
    generate_allarme_regioni_json(df, pop, project_root)
    generate_allarme_province_json(df, pop, project_root)

    log.info("\nCompletato.")


if __name__ == "__main__":
    main()
