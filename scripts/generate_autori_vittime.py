"""Genera JSON per la sezione Persone Denunciate dal dataset DCCV_AUTVITTPS.

Input: data/raw/autvittps/autvittps_7.csv (OFFEND) e autvittps_8.csv (VICTIM)
Output:
  - public/data/autori_vittime_trend.json    (trend Italia, tutti i reati, OFFEND+VICTIM)
  - public/data/autori_vittime_reati.json    (per reato, Italia, ultimo anno, OFFEND+VICTIM)
  - public/data/autori_vittime_province.json (per provincia, multi-anno, OFFEND+VICTIM)
  - public/data/autori_vittime_regioni.json  (per regione, multi-anno, OFFEND+VICTIM, con tasso)

Uso: conda activate osservatorio && python scripts/generate_autori_vittime.py

Mappatura codici CP verificata su brocardi.it (fonte ufficiale codice penale):
  CP572    -> art. 572 c.p.     -> Maltrattamenti contro familiari o conviventi
  CP612BIS -> art. 612-bis c.p. -> Atti persecutori (stalking)
  CP612TER -> art. 612-ter c.p. -> Diffusione illecita di immagini o video sessualmente espliciti

Unificazione STALK/CP612BIS:
  ISTAT usa due codici per lo stesso reato (art. 612-bis c.p.):
  - STALK: presente dal 2009, senza breakdown minori (pct_minori null)
  - CP612BIS: presente dal 2022, con breakdown completo (inclusi minori)
  I valori negli anni sovrapposti (2022-2023) sono identici.
  In fase di caricamento, STALK viene rinominato in CP612BIS e i duplicati
  vengono risolti mantenendo il record CP612BIS originale (breakdown completo).
  Questo produce una serie unica CP612BIS 2009-2024.
"""

import json
import logging
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)

# Anno di riferimento (ultimo con TOT per OFFEND)
ANNO_REF = 2022

# ---------------------------------------------------------------------------
# Mappatura codici reato -> label italiane
# I codici senza prefisso sono abbreviazioni ISTAT standard.
# I codici CP*** fanno riferimento ad articoli del codice penale (verificati
# su brocardi.it). STALK e CP612BIS sono unificati: vedi docstring modulo.
# ---------------------------------------------------------------------------
CRIME_NAMES = {
    "TOT": "Totale",
    # Omicidi
    "INTENHOM": "Omicidi volontari consumati",
    "ATTEMPHOM": "Tentati omicidi",
    "MANSHOM": "Omicidi preterintenzionali",
    "INFANTHOM": "Infanticidi",
    "MAFIAHOM": "Omicidi di tipo mafioso",
    "TERRORHOM": "Omicidi per terrorismo",
    "MASSMURD": "Stragi",
    "ROBBHOM": "Omicidi a scopo di rapina",
    "ROADHOM": "Omicidi stradali",
    "UNINTHOM": "Omicidi colposi",
    # Violenza contro la persona
    "CULPINJU": "Lesioni dolose",
    "BLOWS": "Percosse",
    "MENACE": "Minacce",
    # Reati sessuali e contro minori
    "RAPE": "Violenze sessuali",
    "RAPEUN18": "Atti sessuali con minorenne",
    "CORRUPUN18": "Corruzione di minorenne",
    "PORNO": "Pornografia minorile",
    "CP572": "Maltrattamenti in famiglia",
    "CP612BIS": "Atti persecutori (stalking)",
    "CP612TER": "Diffusione illecita immagini sessuali",
    "PROSTI": "Sfruttamento della prostituzione",
    # Sequestri e rapine
    "KIDNAPP": "Sequestri di persona",
    "ROBBER": "Rapine",
    "BANKROB": "Rapine in banca",
    "POSTROB": "Rapine in ufficio postale",
    "HOUSEROB": "Rapine in abitazione",
    "SHOPROB": "Rapine in esercizi commerciali",
    "STREETROB": "Rapine in pubblica via",
    # Estorsione e usura
    "EXTORT": "Estorsioni",
    "USURY": "Usura",
    # Furti
    "THEFT": "Furti",
    "PICKTHEF": "Borseggi",
    "SHOPTHEF": "Furti in esercizi commerciali",
    "BAGTHEF": "Furti con destrezza",
    "BURGTHEF": "Furti con scasso",
    "VEHITHEF": "Furti di autoveicoli",
    "CARTHEF": "Furti di autovetture",
    "MOPETHEF": "Furti di ciclomotori",
    "MOTORTHEF": "Furti di motocicli",
    "TRUCKTHEF": "Furti di autocarri",
    "ARTTHEF": "Furti di opere d'arte",
    # Ricettazione e danni
    "RECEIV": "Ricettazione",
    "DAMAGE": "Danneggiamenti",
    "DAMARS": "Incendi dolosi",
    "ARSON": "Incendi",
    # Frodi e informatica
    "SWINCYB": "Truffe e frodi informatiche",
    "CYBERCRIM": "Delitti informatici",
    "INTPROP": "Violazioni proprietà intellettuale",
    "COUNTER": "Contraffazione",
    # Criminalita' organizzata e altro
    "SMUGGL": "Contrabbando",
    "DRUG": "Stupefacenti",
    "MONEYLAU": "Riciclaggio",
    "CRIMASS": "Associazione per delinquere",
    "MAFIASS": "Associazione di tipo mafioso",
    "FOREARS": "Porto abusivo di armi",
    "ATTACK": "Attentati",
    "OFFENCE": "Resistenza a pubblico ufficiale",
}

# Ripartizioni geografiche
RIPARTIZIONI = {
    "IT": "Italia",
    "ITC": "Nord-ovest",
    "ITD": "Nord-est",
    "ITE": "Centro",
    "ITF": "Sud",
    "ITG": "Isole",
}

# Regioni (NUTS2)
REGIONI = {
    "ITC1": "Piemonte",
    "ITC2": "Valle d'Aosta",
    "ITC3": "Liguria",
    "ITC4": "Lombardia",
    "ITD1": "Provincia Autonoma Bolzano",
    "ITD2": "Provincia Autonoma Trento",
    "ITD3": "Veneto",
    "ITD4": "Friuli-Venezia Giulia",
    "ITD5": "Emilia-Romagna",
    "ITE1": "Toscana",
    "ITE2": "Umbria",
    "ITE3": "Marche",
    "ITE4": "Lazio",
    "ITF1": "Abruzzo",
    "ITF2": "Molise",
    "ITF3": "Campania",
    "ITF4": "Puglia",
    "ITF5": "Basilicata",
    "ITF6": "Calabria",
    "ITG1": "Sicilia",
    "ITG2": "Sardegna",
}

# Province speciali (nuove province non nel sistema NUTS3 standard)
# Codici ISTAT: 108=MB, 109=FM, 110=BT (create 2009, fuori dalla codifica NUTS3)
PROVINCE_SPECIALI = {
    "IT108": ("Monza e della Brianza", "Lombardia"),
    "IT109": ("Fermo", "Marche"),
    "IT110": ("Barletta-Andria-Trani", "Puglia"),
}

# Regioni per l'output (20 regioni: Bolzano+Trento aggregate in Trentino-Alto Adige)
REGIONI_OUTPUT = {
    "ITC1": "Piemonte",
    "ITC2": "Valle d'Aosta",
    "ITC3": "Liguria",
    "ITC4": "Lombardia",
    "ITD1+ITD2": "Trentino-Alto Adige",
    "ITD3": "Veneto",
    "ITD4": "Friuli-Venezia Giulia",
    "ITD5": "Emilia-Romagna",
    "ITE1": "Toscana",
    "ITE2": "Umbria",
    "ITE3": "Marche",
    "ITE4": "Lazio",
    "ITF1": "Abruzzo",
    "ITF2": "Molise",
    "ITF3": "Campania",
    "ITF4": "Puglia",
    "ITF5": "Basilicata",
    "ITF6": "Calabria",
    "ITG1": "Sicilia",
    "ITG2": "Sardegna",
}

# Reati curati per vista regionale (evita file troppo grande con tutti i 59 reati)
# Include reati ad alto volume o alta rilevanza sociale
REATI_REGIONI = {
    "TOT", "INTENHOM", "ATTEMPHOM", "RAPE", "RAPEUN18",
    "CP572", "CP612BIS", "CULPINJU", "MENACE",
    "ROBBER", "HOUSEROB", "THEFT", "BURGTHEF", "EXTORT",
    "DRUG", "SWINCYB", "KIDNAPP", "DAMAGE", "RECEIV",
}


def load_territory_names(project_root: Path) -> dict[str, str]:
    """Costruisce mapping REF_AREA -> nome territorio da CSV processati."""
    names = {}
    names.update(RIPARTIZIONI)
    names.update(REGIONI)
    for code, (nome, _) in PROVINCE_SPECIALI.items():
        names[code] = nome

    # Province dai CSV processati (fonte autorevole per i nomi)
    prov_csv = project_root / "data" / "processed" / "delitti_province_normalizzato.csv"
    if prov_csv.exists():
        df = pd.read_csv(prov_csv, dtype={"REF_AREA": str}, usecols=["REF_AREA", "Territorio"])
        for _, row in df.drop_duplicates("REF_AREA").iterrows():
            names[row["REF_AREA"]] = row["Territorio"]

    return names


def load_popolazione(project_root: Path) -> dict[tuple[str, int], int]:
    """Carica popolazione regionale da CSV. Ritorna {(REF_AREA, anno): popolazione}.

    Aggrega Bolzano+Trento in Trentino-Alto Adige (ITD1+ITD2).
    """
    csv_path = project_root / "data" / "processed" / "popolazione_regioni_province.csv"
    df = pd.read_csv(csv_path, dtype={"REF_AREA": str})
    df = df[df["livello"] == "regione"]

    pop: dict[tuple[str, int], int] = {}
    for _, row in df.iterrows():
        pop[(row["REF_AREA"], int(row["Anno"]))] = int(row["Popolazione"])

    # Aggrega Bolzano + Trento
    for anno in df["Anno"].unique():
        anno = int(anno)
        bz = pop.get(("ITD1", anno), 0)
        tn = pop.get(("ITD2", anno), 0)
        if bz > 0 and tn > 0:
            pop[("ITD1+ITD2", anno)] = bz + tn

    return pop


def get_region_name(ref_area: str) -> str:
    """Dato un codice NUTS3 provincia, restituisce il nome della regione."""
    if ref_area in PROVINCE_SPECIALI:
        return PROVINCE_SPECIALI[ref_area][1]
    # NUTS3: primi 4 caratteri = NUTS2 regione
    region_code = ref_area[:4] if len(ref_area) >= 5 else ref_area
    return REGIONI.get(region_code, region_code)


def is_province(ref_area: str) -> bool:
    """True se il codice e' una provincia (NUTS3 o codice speciale)."""
    if ref_area in PROVINCE_SPECIALI:
        return True
    # NUTS3 standard: 5+ caratteri (es. ITC11)
    # ITD1 e ITD2 sono regioni/province autonome: li trattiamo come regioni
    return len(ref_area) >= 5


def _unify_stalk_cp612bis(df: pd.DataFrame) -> pd.DataFrame:
    """Unifica STALK in CP612BIS producendo una serie unica.

    ISTAT usa due codici per l'art. 612-bis c.p. (atti persecutori):
    - STALK: dal 2009, senza breakdown minori
    - CP612BIS: dal 2022, con breakdown completo

    Strategia: rinomina STALK -> CP612BIS, poi rimuove i duplicati
    mantenendo il record CP612BIS originale (ha breakdown completo).
    Il sort mette CP612BIS prima di STALK-rinominato grazie al flag,
    e drop_duplicates tiene il primo (= CP612BIS originale).
    """
    stalk_count = (df["TYPE_CRIME"] == "STALK").sum()
    if stalk_count == 0:
        return df

    df = df.copy()
    # Flag per distinguere i record originali CP612BIS da quelli rinominati
    df["_from_stalk"] = df["TYPE_CRIME"] == "STALK"
    df.loc[df["TYPE_CRIME"] == "STALK", "TYPE_CRIME"] = "CP612BIS"

    # In caso di overlap, tieni CP612BIS originale (ha breakdown completo)
    key_cols = [c for c in df.columns if c not in ("OBS_VALUE", "_from_stalk")]
    df = df.sort_values("_from_stalk")  # False (originale) prima di True (ex-STALK)
    df = df.drop_duplicates(subset=key_cols, keep="first")
    df = df.drop(columns=["_from_stalk"])

    log.info("  Unificazione STALK -> CP612BIS: %d righe STALK rinominate", stalk_count)
    return df


def load_data(project_root: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Carica DF_7 (OFFEND) e DF_8 (VICTIM), unificando STALK in CP612BIS."""
    raw_dir = project_root / "data" / "raw" / "autvittps"
    cols = ["REF_AREA", "DATA_TYPE", "TYPE_CRIME", "SEX", "AGE",
            "CITIZENSHIP", "TIME_PERIOD", "OBS_VALUE"]

    log.info("Lettura autvittps_7.csv (OFFEND)...")
    df7 = pd.read_csv(
        raw_dir / "autvittps_7.csv", sep=";", usecols=cols,
        dtype={"REF_AREA": str, "SEX": str, "OBS_VALUE": float},
    )
    df7 = _unify_stalk_cp612bis(df7)

    log.info("Lettura autvittps_8.csv (VICTIM)...")
    df8 = pd.read_csv(
        raw_dir / "autvittps_8.csv", sep=";", usecols=cols,
        dtype={"REF_AREA": str, "SEX": str, "OBS_VALUE": float},
    )
    df8 = _unify_stalk_cp612bis(df8)

    log.info("  OFFEND: %d righe, VICTIM: %d righe", len(df7), len(df8))
    return df7, df8


def extract_metrics(df: pd.DataFrame) -> dict:
    """Da un subset filtrato per anno+reato+territorio, estrae totale/stranieri/minori.

    Gestisce due strutture dati ISTAT:
    - 2022+: matrice completa (SEX=9, AGE=TOTAL/Y_UN17, CITIZENSHIP=TOTAL/FRG/ITL)
    - 2007-2021: matrice parziale (SEX=9 ha solo CITIZENSHIP=FRG/ITL, non TOTAL;
      AGE=Y_UN17 non disponibile per tutti i reati)

    Verifica 2022: FRG(270567) + ITL(548265) = TOTAL(818832) -> FRG+ITL e' affidabile.
    """
    sex9 = df[df["SEX"] == "9"]

    # Totale: preferisci CITIZENSHIP=TOTAL, fallback su FRG+ITL
    totale_direct = sex9[
        (sex9["AGE"] == "TOTAL") & (sex9["CITIZENSHIP"] == "TOTAL")
    ]["OBS_VALUE"].sum()

    if totale_direct > 0:
        totale = totale_direct
    else:
        # Fallback: somma italiani + stranieri
        italiani = sex9[
            (sex9["AGE"] == "TOTAL") & (sex9["CITIZENSHIP"] == "ITL")
        ]["OBS_VALUE"].sum()
        stranieri_val = sex9[
            (sex9["AGE"] == "TOTAL") & (sex9["CITIZENSHIP"] == "FRG")
        ]["OBS_VALUE"].sum()
        totale = italiani + stranieri_val

    stranieri = sex9[
        (sex9["AGE"] == "TOTAL") & (sex9["CITIZENSHIP"] == "FRG")
    ]["OBS_VALUE"].sum()

    # Minori: potrebbe non esistere per tutti gli anni/reati
    minori_direct = sex9[
        (sex9["AGE"] == "Y_UN17") & (sex9["CITIZENSHIP"] == "TOTAL")
    ]["OBS_VALUE"].sum()

    if minori_direct > 0:
        minori = minori_direct
    else:
        # Fallback: somma minori FRG + ITL
        minori_frg = sex9[
            (sex9["AGE"] == "Y_UN17") & (sex9["CITIZENSHIP"] == "FRG")
        ]["OBS_VALUE"].sum()
        minori_itl = sex9[
            (sex9["AGE"] == "Y_UN17") & (sex9["CITIZENSHIP"] == "ITL")
        ]["OBS_VALUE"].sum()
        minori = minori_frg + minori_itl  # 0 se nessuna delle due esiste

    # Maschi (SEX=1) e femmine (SEX=2): hanno CITIZENSHIP=TOTAL anche pre-2022
    maschi = df[
        (df["SEX"] == "1") & (df["AGE"] == "TOTAL") & (df["CITIZENSHIP"] == "TOTAL")
    ]["OBS_VALUE"].sum()
    femmine = df[
        (df["SEX"] == "2") & (df["AGE"] == "TOTAL") & (df["CITIZENSHIP"] == "TOTAL")
    ]["OBS_VALUE"].sum()

    result = {
        "totale": int(totale),
        "stranieri": int(stranieri),
        "minori": int(minori),
        "maschi": int(maschi),
        "femmine": int(femmine),
        "pct_stranieri": round(stranieri / totale * 100, 1) if totale > 0 else 0,
        "pct_maschi": round(maschi / totale * 100, 1) if totale > 0 and maschi > 0 else None,
        "pct_femmine": round(femmine / totale * 100, 1) if totale > 0 and femmine > 0 else None,
    }
    # pct_minori solo se il dato minori e' disponibile
    if minori > 0:
        result["pct_minori"] = round(minori / totale * 100, 1) if totale > 0 else 0
    else:
        result["pct_minori"] = None

    return result


def generate_trend(
    df_offend: pd.DataFrame,
    df_victim: pd.DataFrame,
    out_dir: Path,
) -> None:
    """Genera autori_vittime_trend.json: serie storica Italia, tutti i reati, OFFEND+VICTIM."""
    records = []

    for data_type, df in [("OFFEND", df_offend), ("VICTIM", df_victim)]:
        df_it = df[df["REF_AREA"] == "IT"]

        for crime_code in sorted(df_it["TYPE_CRIME"].unique()):
            if crime_code not in CRIME_NAMES:
                continue
            df_crime = df_it[df_it["TYPE_CRIME"] == crime_code]

            for anno in sorted(df_crime["TIME_PERIOD"].unique()):
                year_data = df_crime[df_crime["TIME_PERIOD"] == anno]
                metrics = extract_metrics(year_data)
                if metrics["totale"] == 0:
                    continue
                records.append({
                    "data_type": data_type,
                    "codice_reato": crime_code,
                    "reato": CRIME_NAMES[crime_code],
                    "anno": int(anno),
                    **metrics,
                })

    out_path = out_dir / "autori_vittime_trend.json"
    out_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    n_crimes = len({r["codice_reato"] for r in records})
    log.info("OK  %-45s (%d record, %d reati, %.1f KB)",
             out_path.name, len(records), n_crimes, size_kb)


def generate_reati(
    df_offend: pd.DataFrame,
    df_victim: pd.DataFrame,
    out_dir: Path,
) -> None:
    """Genera autori_vittime_reati.json: breakdown per reato, Italia, anno ANNO_REF."""
    records = []

    for data_type, df in [("OFFEND", df_offend), ("VICTIM", df_victim)]:
        mask = (
            (df["REF_AREA"] == "IT")
            & (df["TIME_PERIOD"] == ANNO_REF)
            & (df["TYPE_CRIME"] != "TOT")
        )
        df_year = df[mask]

        for crime_code in sorted(df_year["TYPE_CRIME"].unique()):
            crime_data = df_year[df_year["TYPE_CRIME"] == crime_code]
            metrics = extract_metrics(crime_data)

            if metrics["totale"] == 0:
                continue

            records.append({
                "data_type": data_type,
                "codice_reato": crime_code,
                "reato": CRIME_NAMES.get(crime_code, crime_code),
                **metrics,
            })

    out_path = out_dir / "autori_vittime_reati.json"
    out_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    n_offend = sum(1 for r in records if r["data_type"] == "OFFEND")
    n_victim = sum(1 for r in records if r["data_type"] == "VICTIM")
    log.info("OK  %-45s (%d OFFEND + %d VICTIM, %.1f KB)",
             out_path.name, n_offend, n_victim, size_kb)


def generate_province(
    df_offend: pd.DataFrame,
    df_victim: pd.DataFrame,
    territory_names: dict[str, str],
    out_dir: Path,
) -> None:
    """Genera autori_vittime_province.json: dati provinciali multi-anno.

    TOT disponibile solo per ANNO_REF (2022).
    Singoli reati disponibili 2022-2024.
    """
    records = []

    for data_type, df in [("OFFEND", df_offend), ("VICTIM", df_victim)]:
        df_prov = df[df["REF_AREA"].apply(is_province)]

        for (ref_area, crime_code, anno), group in df_prov.groupby(
            ["REF_AREA", "TYPE_CRIME", "TIME_PERIOD"]
        ):
            if crime_code not in CRIME_NAMES:
                continue
            metrics = extract_metrics(group)
            if metrics["totale"] == 0:
                continue

            records.append({
                "data_type": data_type,
                "ref_area": ref_area,
                "provincia": territory_names.get(ref_area, ref_area),
                "regione": get_region_name(ref_area),
                "codice_reato": crime_code,
                "reato": CRIME_NAMES.get(crime_code, crime_code),
                "anno": int(anno),
                **metrics,
            })

    out_path = out_dir / "autori_vittime_province.json"
    out_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    n_province = len({r["ref_area"] for r in records})
    anni = sorted({r["anno"] for r in records})
    log.info("OK  %-45s (%d province, anni %s, %.1f KB)",
             out_path.name, n_province, f"{anni[0]}-{anni[-1]}", size_kb)


def generate_regioni(
    df_offend: pd.DataFrame,
    df_victim: pd.DataFrame,
    popolazione: dict[tuple[str, int], int],
    out_dir: Path,
) -> None:
    """Genera autori_vittime_regioni.json: dati regionali multi-anno con tasso per 100k.

    Aggrega Bolzano+Trento in Trentino-Alto Adige.
    Solo reati in REATI_REGIONI per contenere la dimensione del file.
    """
    records = []

    for data_type, df in [("OFFEND", df_offend), ("VICTIM", df_victim)]:
        # Filtra solo regioni NUTS2
        df_reg = df[df["REF_AREA"].isin(REGIONI)]

        for crime_code in sorted(REATI_REGIONI):
            if crime_code not in CRIME_NAMES:
                continue
            df_crime = df_reg[df_reg["TYPE_CRIME"] == crime_code]

            # Raggruppa per regione e anno, poi aggrega BZ+TN
            for anno in sorted(df_crime["TIME_PERIOD"].unique()):
                df_year = df_crime[df_crime["TIME_PERIOD"] == anno]

                # Regioni singole (escluse BZ e TN, aggregate dopo)
                for reg_code, reg_name in REGIONI_OUTPUT.items():
                    if reg_code == "ITD1+ITD2":
                        # Aggrega Bolzano + Trento
                        df_bz = df_year[df_year["REF_AREA"] == "ITD1"]
                        df_tn = df_year[df_year["REF_AREA"] == "ITD2"]
                        df_merged = pd.concat([df_bz, df_tn])
                        if df_merged.empty:
                            continue
                        metrics = extract_metrics(df_merged)
                    else:
                        df_single = df_year[df_year["REF_AREA"] == reg_code]
                        if df_single.empty:
                            continue
                        metrics = extract_metrics(df_single)

                    if metrics["totale"] == 0:
                        continue

                    pop = popolazione.get((reg_code, int(anno)))
                    tasso = round(metrics["totale"] / pop * 100_000, 1) if pop else None

                    records.append({
                        "data_type": data_type,
                        "codice_regione": reg_code,
                        "regione": reg_name,
                        "codice_reato": crime_code,
                        "reato": CRIME_NAMES[crime_code],
                        "anno": int(anno),
                        "tasso": tasso,
                        **metrics,
                    })

    out_path = out_dir / "autori_vittime_regioni.json"
    out_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    n_regioni = len({r["codice_regione"] for r in records})
    n_crimes = len({r["codice_reato"] for r in records})
    log.info("OK  %-45s (%d regioni, %d reati, %d record, %.1f KB)",
             out_path.name, n_regioni, n_crimes, len(records), size_kb)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    project_root = Path(__file__).resolve().parent.parent
    out_dir = project_root / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    territory_names = load_territory_names(project_root)
    log.info("Territori mappati: %d", len(territory_names))

    popolazione = load_popolazione(project_root)
    log.info("Popolazione: %d record", len(popolazione))

    df_offend, df_victim = load_data(project_root)

    generate_trend(df_offend, df_victim, out_dir)
    generate_reati(df_offend, df_victim, out_dir)
    generate_province(df_offend, df_victim, territory_names, out_dir)
    generate_regioni(df_offend, df_victim, popolazione, out_dir)

    log.info("\nCompletato.")


if __name__ == "__main__":
    main()
