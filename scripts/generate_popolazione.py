"""Genera CSV popolazione unificato: intercensuaria (2014-2018) + DCIS_POPRES1 (2019+).

Input:
  - data/raw/popolazione/PopolazioneEta-SingolaArea-Italia-Ripartizioni.csv (intercensuaria)
  - data/raw/popolazione/PopolazioneEta-SingolaArea-Regioni.csv (intercensuaria)
  - data/raw/popolazione/PopolazioneEta-SingolaArea-Province/*.csv (intercensuaria, 107 file)
  - data/raw/popolazione/popres1.csv (DCIS_POPRES1 via SDMX)

Output:
  - data/processed/popolazione_regioni_province.csv
    Colonne: REF_AREA,Territorio,Anno,Popolazione,livello

Logica:
  - Intercensuaria per 2014-2018 (colonne anno nei CSV pivot)
  - DCIS_POPRES1 per 2019+ (priorita' su intercensuaria dove si sovrappongono)
  - IT111 (Sud Sardegna) incluso per completezza (presente in DCIS_POPRES1, assente in delittips)
  - ITD1/ITD2 duplicati come regioni (stessi valori di ITD10/ITD20)
"""

import logging
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

YEARS_INTERCENSUARIA = list(range(2014, 2019))  # 2014-2018

# Mapping NUTS2 -> nome regione (come nel CSV attuale)
NUTS2_NAMES = {
    "ITC1": "Piemonte",
    "ITC2": "Valle d'Aosta / Vallée d'Aoste",
    "ITC3": "Liguria",
    "ITC4": "Lombardia",
    "ITD1": "Provincia Autonoma Bolzano / Bozen",
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

# Ordine regioni nel file intercensuaria (stesso ordine dei blocchi "Tutte le cittadinanze")
REGIONI_ORDER = [
    "ITC1", "ITC2", "ITC4", "ITC3",  # NB: nel file Lombardia viene prima di Liguria
    "ITD1", "ITD2",  # Bolzano, Trento (nel file: "Trentino-Alto Adige" poi split)
    "ITD3", "ITD4", "ITD5",
    "ITE1", "ITE2", "ITE3", "ITE4",
    "ITF1", "ITF2", "ITF3", "ITF4", "ITF5", "ITF6",
    "ITG1", "ITG2",
]

# Mapping nome file provincia -> codice NUTS3
# Derivato dal file DCIS_POPRES1 manuale (codice;nome)
PROVINCE_FILE_TO_NUTS3 = {
    "Torino": "ITC11", "Vercelli": "ITC12", "Biella": "ITC13",
    "Verbano-Cusio-Ossola": "ITC14", "Novara": "ITC15", "Cuneo": "ITC16",
    "Asti": "ITC17", "Alessandria": "ITC18",
    "Valle_d'Aosta-Vallée_d'Aoste": "ITC20",
    "Varese": "ITC41", "Como": "ITC42", "Lecco": "ITC43", "Sondrio": "ITC44",
    "Milano": "ITC45", "Bergamo": "ITC46", "Brescia": "ITC47",
    "Pavia": "ITC48", "Lodi": "ITC49", "Cremona": "ITC4A", "Mantova": "ITC4B",
    "Imperia": "ITC31", "Savona": "ITC32", "Genova": "ITC33", "La_Spezia": "ITC34",
    "Bolzano-Bozen": "ITD10", "Trento": "ITD20",
    "Verona": "ITD31", "Vicenza": "ITD32", "Belluno": "ITD33",
    "Treviso": "ITD34", "Venezia": "ITD35", "Padova": "ITD36", "Rovigo": "ITD37",
    "Pordenone": "ITD41", "Udine": "ITD42", "Gorizia": "ITD43", "Trieste": "ITD44",
    "Piacenza": "ITD51", "Parma": "ITD52", "Reggio_nell'Emilia": "ITD53",
    "Modena": "ITD54", "Bologna": "ITD55", "Ferrara": "ITD56",
    "Ravenna": "ITD57", "Forlì-Cesena": "ITD58", "Rimini": "ITD59",
    "Massa-Carrara": "ITE11", "Lucca": "ITE12", "Pistoia": "ITE13",
    "Firenze": "ITE14", "Prato": "ITE15", "Livorno": "ITE16",
    "Pisa": "ITE17", "Arezzo": "ITE18", "Siena": "ITE19", "Grosseto": "ITE1A",
    "Perugia": "ITE21", "Terni": "ITE22",
    "Pesaro_e_Urbino": "ITE31", "Ancona": "ITE32", "Macerata": "ITE33",
    "Ascoli_Piceno": "ITE34",
    "Viterbo": "ITE41", "Rieti": "ITE42", "Roma": "ITE43",
    "Latina": "ITE44", "Frosinone": "ITE45",
    "L'Aquila": "ITF11", "Teramo": "ITF12", "Pescara": "ITF13", "Chieti": "ITF14",
    "Isernia": "ITF21", "Campobasso": "ITF22",
    "Caserta": "ITF31", "Benevento": "ITF32", "Napoli": "ITF33",
    "Avellino": "ITF34", "Salerno": "ITF35",
    "Foggia": "ITF41", "Bari": "ITF42", "Taranto": "ITF43",
    "Brindisi": "ITF44", "Lecce": "ITF45",
    "Potenza": "ITF51", "Matera": "ITF52",
    "Cosenza": "ITF61", "Crotone": "ITF62", "Catanzaro": "ITF63",
    "Vibo_Valentia": "ITF64", "Reggio_di_Calabria": "ITF65",
    "Trapani": "ITG11", "Palermo": "ITG12", "Messina": "ITG13",
    "Agrigento": "ITG14", "Caltanissetta": "ITG15", "Enna": "ITG16",
    "Catania": "ITG17", "Ragusa": "ITG18", "Siracusa": "ITG19",
    "Sassari": "ITG25", "Nuoro": "ITG26", "Cagliari": "ITG27",
    "Oristano": "ITG28",
    # Province nuove (non hanno file intercensuaria singolo)
    "Monza_e_della_Brianza": "IT108", "Fermo": "IT109",
    "Barletta-Andria-Trani": "IT110", "Sud_Sardegna": "IT111",
}

# Nomi territori per il CSV output (coerenti col CSV attuale)
NUTS3_DISPLAY_NAMES = {
    "ITC11": "Torino", "ITC12": "Vercelli", "ITC13": "Biella",
    "ITC14": "Verbano-Cusio-Ossola", "ITC15": "Novara", "ITC16": "Cuneo",
    "ITC17": "Asti", "ITC18": "Alessandria",
    "ITC20": "Valle d'Aosta / Vallée d'Aoste",
    "ITC41": "Varese", "ITC42": "Como", "ITC43": "Lecco", "ITC44": "Sondrio",
    "ITC45": "Milano", "ITC46": "Bergamo", "ITC47": "Brescia",
    "ITC48": "Pavia", "ITC49": "Lodi", "ITC4A": "Cremona", "ITC4B": "Mantova",
    "ITC31": "Imperia", "ITC32": "Savona", "ITC33": "Genova", "ITC34": "La Spezia",
    "ITD10": "Bolzano / Bozen", "ITD20": "Trento",
    "ITD31": "Verona", "ITD32": "Vicenza", "ITD33": "Belluno",
    "ITD34": "Treviso", "ITD35": "Venezia", "ITD36": "Padova", "ITD37": "Rovigo",
    "ITD41": "Pordenone", "ITD42": "Udine", "ITD43": "Gorizia", "ITD44": "Trieste",
    "ITD51": "Piacenza", "ITD52": "Parma", "ITD53": "Reggio nell'Emilia",
    "ITD54": "Modena", "ITD55": "Bologna", "ITD56": "Ferrara",
    "ITD57": "Ravenna", "ITD58": "Forlì-Cesena", "ITD59": "Rimini",
    "ITE11": "Massa-Carrara", "ITE12": "Lucca", "ITE13": "Pistoia",
    "ITE14": "Firenze", "ITE15": "Prato", "ITE16": "Livorno",
    "ITE17": "Pisa", "ITE18": "Arezzo", "ITE19": "Siena", "ITE1A": "Grosseto",
    "ITE21": "Perugia", "ITE22": "Terni",
    "ITE31": "Pesaro e Urbino", "ITE32": "Ancona", "ITE33": "Macerata",
    "ITE34": "Ascoli Piceno",
    "ITE41": "Viterbo", "ITE42": "Rieti", "ITE43": "Roma",
    "ITE44": "Latina", "ITE45": "Frosinone",
    "ITF11": "L'Aquila", "ITF12": "Teramo", "ITF13": "Pescara", "ITF14": "Chieti",
    "ITF21": "Isernia", "ITF22": "Campobasso",
    "ITF31": "Caserta", "ITF32": "Benevento", "ITF33": "Napoli",
    "ITF34": "Avellino", "ITF35": "Salerno",
    "ITF41": "Foggia", "ITF42": "Bari", "ITF43": "Taranto",
    "ITF44": "Brindisi", "ITF45": "Lecce",
    "ITF51": "Potenza", "ITF52": "Matera",
    "ITF61": "Cosenza", "ITF62": "Crotone", "ITF63": "Catanzaro",
    "ITF64": "Vibo Valentia", "ITF65": "Reggio di Calabria",
    "ITG11": "Trapani", "ITG12": "Palermo", "ITG13": "Messina",
    "ITG14": "Agrigento", "ITG15": "Caltanissetta", "ITG16": "Enna",
    "ITG17": "Catania", "ITG18": "Ragusa", "ITG19": "Siracusa",
    "ITG25": "Sassari", "ITG26": "Nuoro", "ITG27": "Cagliari",
    "ITG28": "Oristano",
    "IT108": "Monza e della Brianza", "IT109": "Fermo",
    "IT110": "Barletta-Andria-Trani", "IT111": "Sud Sardegna",
}


def parse_intercensuaria_blocks(filepath: Path, years: list[int]) -> list[dict]:
    """Estrae la popolazione totale per anno dai blocchi intercensuaria.

    Ogni blocco inizia con "Tutte le cittadinanze - ..." e ha una riga "Totale"
    con i valori per anno. Prende solo il primo "Totale" per blocco.

    Returns:
        Lista di dict con chiavi: nome_blocco, {anno: popolazione}
    """
    results = []
    year_cols = [str(y) for y in years]

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    header_indices = []  # indici colonna per gli anni richiesti
    current_block_name = None
    found_totale = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Blocco "Tutte le cittadinanze"
        if line.startswith('"Tutte le cittadinanze'):
            current_block_name = line.strip('"')
            found_totale = False
            continue

        # Header con anni
        if line.startswith("Età/Anno;"):
            cols = line.split(";")
            header_indices = []
            for yc in year_cols:
                if yc in cols:
                    header_indices.append(cols.index(yc))
                else:
                    header_indices.append(-1)
            continue

        # Prima riga "Totale" del blocco
        if line.startswith("Totale;") and current_block_name and not found_totale:
            found_totale = True
            parts = line.split(";")
            row = {"nome_blocco": current_block_name}
            for yc, idx in zip(year_cols, header_indices):
                if idx >= 0 and idx < len(parts):
                    row[int(yc)] = int(parts[idx])
            results.append(row)

    return results


def load_intercensuaria_italia(raw_dir: Path, years: list[int]) -> list[dict]:
    """Carica popolazione Italia dall'intercensuaria."""
    filepath = raw_dir / "PopolazioneEta-SingolaArea-Italia-Ripartizioni.csv"
    blocks = parse_intercensuaria_blocks(filepath, years)

    # Il primo blocco e' "Tutte le cittadinanze - Italia"
    rows = []
    for block in blocks:
        if "Italia" in block["nome_blocco"]:
            for year in years:
                if year in block:
                    rows.append({
                        "REF_AREA": "IT",
                        "Territorio": "Italia",
                        "Anno": year,
                        "Popolazione": block[year],
                        "livello": "italia",
                    })
            break
    return rows


def load_intercensuaria_regioni(raw_dir: Path, years: list[int]) -> list[dict]:
    """Carica popolazione regioni dall'intercensuaria."""
    filepath = raw_dir / "PopolazioneEta-SingolaArea-Regioni.csv"
    blocks = parse_intercensuaria_blocks(filepath, years)

    # Mapping nome blocco -> codice NUTS2
    # I blocchi sono nell'ordine del file, devo matchare per nome
    nome_to_nuts2 = {
        "Piemonte": "ITC1",
        "Valle D'Aosta": "ITC2", "Valle d'Aosta": "ITC2",
        "Lombardia": "ITC4",
        "Liguria": "ITC3",
        "Trentino-Alto Adige": None,  # skip, usiamo Bolzano + Trento
        "Bolzano": "ITD1", "Provincia Autonoma Bolzano": "ITD1",
        "Trento": "ITD2", "Provincia Autonoma Trento": "ITD2",
        "Veneto": "ITD3",
        "Friuli-Venezia Giulia": "ITD4",
        "Emilia-Romagna": "ITD5",
        "Toscana": "ITE1",
        "Umbria": "ITE2",
        "Marche": "ITE3",
        "Lazio": "ITE4",
        "Abruzzo": "ITF1",
        "Molise": "ITF2",
        "Campania": "ITF3",
        "Puglia": "ITF4",
        "Basilicata": "ITF5",
        "Calabria": "ITF6",
        "Sicilia": "ITG1",
        "Sardegna": "ITG2",
    }

    rows = []
    for block in blocks:
        nome = block["nome_blocco"]
        # Estrai nome regione dal blocco "Tutte le cittadinanze - Regione: NOME"
        if "Regione:" in nome:
            regione_name = nome.split("Regione:")[-1].strip()
        else:
            continue

        # Cerca il codice NUTS2
        nuts2 = None
        for key, code in nome_to_nuts2.items():
            if key.lower() in regione_name.lower():
                nuts2 = code
                break

        if nuts2 is None:
            log.warning(f"Regione non mappata: {regione_name}")
            continue

        display_name = NUTS2_NAMES.get(nuts2, regione_name)
        for year in years:
            if year in block:
                rows.append({
                    "REF_AREA": nuts2,
                    "Territorio": display_name,
                    "Anno": year,
                    "Popolazione": block[year],
                    "livello": "regione",
                })

    return rows


def load_intercensuaria_province(raw_dir: Path, years: list[int]) -> list[dict]:
    """Carica popolazione province dall'intercensuaria (107 file singoli)."""
    prov_dir = raw_dir / "PopolazioneEta-SingolaArea-Province"
    rows = []

    for filepath in sorted(prov_dir.glob("*.csv")):
        # Estrai nome provincia dal filename
        fname = filepath.stem.replace("PopolazioneEta-SingolaArea-Provincia_", "")
        nuts3 = PROVINCE_FILE_TO_NUTS3.get(fname)
        if nuts3 is None:
            log.warning(f"Provincia non mappata: {fname}")
            continue

        blocks = parse_intercensuaria_blocks(filepath, years)
        if not blocks:
            log.warning(f"Nessun blocco trovato in {filepath.name}")
            continue

        display_name = NUTS3_DISPLAY_NAMES.get(nuts3, fname.replace("_", " "))
        block = blocks[0]  # primo blocco = tutte le cittadinanze
        for year in years:
            if year in block:
                rows.append({
                    "REF_AREA": nuts3,
                    "Territorio": display_name,
                    "Anno": year,
                    "Popolazione": block[year],
                    "livello": "provincia",
                })

    return rows


def load_popres1(raw_dir: Path) -> pd.DataFrame:
    """Carica DCIS_POPRES1 (SDMX). Ritorna DataFrame con REF_AREA, TIME_PERIOD, OBS_VALUE."""
    filepath = raw_dir / "popres1.csv"
    df = pd.read_csv(filepath, sep=";", dtype={"TIME_PERIOD": int, "OBS_VALUE": int})
    return df[["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]].rename(
        columns={"TIME_PERIOD": "Anno", "OBS_VALUE": "Popolazione"}
    )


def classify_territory(code: str) -> tuple[str, str]:
    """Classifica un codice NUTS e ritorna (livello, nome_display).

    Returns:
        (livello, display_name) oppure (None, None) se da escludere.
    """
    if code == "IT":
        return "italia", "Italia"
    if code == "IT111":
        return "provincia", NUTS3_DISPLAY_NAMES.get(code, "Sud Sardegna")
    if code in NUTS2_NAMES:
        return "regione", NUTS2_NAMES[code]
    if code in NUTS3_DISPLAY_NAMES:
        return "provincia", NUTS3_DISPLAY_NAMES[code]
    # Ripartizioni (ITC, ITD, ...) e altri: escludi
    return None, None


def main():
    project_root = Path(__file__).resolve().parent.parent
    raw_dir = project_root / "data" / "raw" / "popolazione"
    out_dir = project_root / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "popolazione_regioni_province.csv"

    # 1. Intercensuaria (2014-2018)
    log.info("Caricamento intercensuaria Italia...")
    rows_italia = load_intercensuaria_italia(raw_dir, YEARS_INTERCENSUARIA)
    log.info(f"  Italia: {len(rows_italia)} righe")

    log.info("Caricamento intercensuaria regioni...")
    rows_regioni = load_intercensuaria_regioni(raw_dir, YEARS_INTERCENSUARIA)
    log.info(f"  Regioni: {len(rows_regioni)} righe")

    log.info("Caricamento intercensuaria province...")
    rows_province = load_intercensuaria_province(raw_dir, YEARS_INTERCENSUARIA)
    log.info(f"  Province: {len(rows_province)} righe")

    # ITD1/ITD2 come regioni: stessi valori delle province ITD10/ITD20
    rows_regioni_extra = []
    for prov_row in rows_province:
        if prov_row["REF_AREA"] == "ITD10":
            rows_regioni_extra.append({
                **prov_row,
                "REF_AREA": "ITD1",
                "Territorio": NUTS2_NAMES["ITD1"],
                "livello": "regione",
            })
        elif prov_row["REF_AREA"] == "ITD20":
            rows_regioni_extra.append({
                **prov_row,
                "REF_AREA": "ITD2",
                "Territorio": NUTS2_NAMES["ITD2"],
                "livello": "regione",
            })
    log.info(f"  Regioni extra (ITD1/ITD2): {len(rows_regioni_extra)} righe")

    df_intercensuaria = pd.DataFrame(rows_italia + rows_regioni + rows_regioni_extra + rows_province)
    log.info(f"Intercensuaria totale: {len(df_intercensuaria)} righe, anni {sorted(df_intercensuaria['Anno'].unique())}")

    # 2. DCIS_POPRES1 (2019+)
    log.info("Caricamento DCIS_POPRES1...")
    df_popres = load_popres1(raw_dir)
    log.info(f"  POPRES1 raw: {len(df_popres)} righe")

    # Classifica e filtra territori
    popres_rows = []
    for _, row in df_popres.iterrows():
        livello, nome = classify_territory(row["REF_AREA"])
        if livello is not None:
            popres_rows.append({
                "REF_AREA": row["REF_AREA"],
                "Territorio": nome,
                "Anno": row["Anno"],
                "Popolazione": row["Popolazione"],
                "livello": livello,
            })
    df_popres_filtered = pd.DataFrame(popres_rows)
    # Solo 2019+ (priorita' su intercensuaria)
    df_popres_filtered = df_popres_filtered[df_popres_filtered["Anno"] >= 2019]
    log.info(f"  POPRES1 filtrato: {len(df_popres_filtered)} righe, anni {sorted(df_popres_filtered['Anno'].unique())}")

    # 3. Unione
    df_result = pd.concat([df_intercensuaria, df_popres_filtered], ignore_index=True)
    df_result = df_result.sort_values(["livello", "REF_AREA", "Anno"]).reset_index(drop=True)

    # Verifica duplicati
    dupes = df_result.duplicated(subset=["REF_AREA", "Anno"], keep=False)
    if dupes.any():
        log.warning(f"ATTENZIONE: {dupes.sum()} righe duplicate (REF_AREA + Anno)")
        log.warning(df_result[dupes].to_string())

    # 4. Output
    df_result.to_csv(out_file, index=False)
    log.info(f"\nSalvato: {out_file}")
    log.info(f"Righe: {len(df_result)}")
    log.info(f"Territori: {df_result['REF_AREA'].nunique()}")
    log.info(f"Anni: {sorted(df_result['Anno'].unique())}")
    log.info(f"Livelli: {dict(df_result['livello'].value_counts())}")

    return df_result


if __name__ == "__main__":
    main()
