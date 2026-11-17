"""Verifica aggiornamenti dataset ISTAT via SDMX API.

Gli anni gia' in casa si leggono dai dati locali; a ISTAT si chiedono solo quelli successivi,
fino all'anno in corso.

Output: data/raw/check_updates.json con il riepilogo.

Uso: conda activate osservatorio && python scripts/check_istat_updates.py
"""

import json
import logging
import time
from datetime import datetime
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

BASE = "https://esploradati.istat.it/SDMXWS/rest"
HEADERS = {"Accept": "application/vnd.sdmx.data+csv;version=1.0.0"}

# Pausa tra richieste (secondi)
DELAY = 15.0
REQUEST_TIMEOUT = 60

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"
ANNO_CORRENTE = datetime.now().year


def carica_json(file: str) -> pd.DataFrame:
    return pd.DataFrame(json.loads((DATA_DIR / file).read_text(encoding="utf-8")))


def query_sdmx(dataflow_id: str, da_anno: int) -> pd.DataFrame | None:
    """Dati da `da_anno` all'anno in corso: DataFrame (vuoto se non ce ne sono) o None se fallisce."""
    url = f"{BASE}/data/{dataflow_id}"
    params = {"startPeriod": str(da_anno), "endPeriod": str(ANNO_CORRENTE), "detail": "dataonly"}
    try:
        r = requests.get(url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT)
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
        log.error(f"  Connessione fallita: {type(e).__name__}")
        return None

    if r.status_code == 200 and r.text.strip():
        df = pd.read_csv(StringIO(r.text))
        if "DATAFLOW" in df.columns:
            df = df.drop(columns=["DATAFLOW"])
        return df
    elif r.status_code == 404:
        return pd.DataFrame()
    else:
        log.warning(f"  Status {r.status_code}")
        return None


def anni_di(df: pd.DataFrame) -> list[int]:
    return sorted(int(y) for y in df["TIME_PERIOD"].unique())


def check_delittips() -> dict:
    """DCCV_DELITTIPS: verifica ultimo anno disponibile."""
    anni = carica_json("delitti_italia.json")["Anno"]
    locale = f"{anni.min()}-{anni.max()}"
    log.info("=" * 60)
    log.info("DCCV_DELITTIPS (delitti denunciati)")
    log.info(f"  Dati locali: {locale}")
    log.info(f"  Controllo dal {anni.max() + 1} su DF_1 (Italia, numeri assoluti)...")

    result = {"dataset": "DCCV_DELITTIPS", "locale": locale, "status": "errore"}

    df = query_sdmx("IT1,73_67_DF_DCCV_DELITTIPS_1,1.0", int(anni.max()) + 1)
    if df is None:
        log.error("  Impossibile verificare (errore connessione)")
        return result
    if df.empty:
        log.info("  Nessun dato nuovo")
        result["status"] = "aggiornato"
        return result

    years = anni_di(df)
    log.info(f"  NUOVI DATI disponibili: {years}")

    # Mostra solo il totale delitti Italia (REF_AREA=IT, TYPE_CRIME=TOT, autore noto=9 totale)
    if "TYPE_CRIME" in df.columns and "REF_AREA" in df.columns:
        tot_it = df[(df["TYPE_CRIME"] == "TOT") & (df["REF_AREA"] == "IT")]
        if not tot_it.empty and "Y_KNOWN_OFFENDER_IDEN" in tot_it.columns:
            # Prendi solo il totale (codice 9 = totale autore noto/ignoto)
            tot_all = tot_it[tot_it["Y_KNOWN_OFFENDER_IDEN"] == 9]
            for _, row in tot_all.iterrows():
                log.info(f"    Totale delitti Italia {int(row['TIME_PERIOD'])}: {int(row['OBS_VALUE']):,}")

    result["status"] = "da_aggiornare"
    result["nuovi_anni"] = years
    return result


def check_autvittps() -> dict:
    """DCCV_AUTVITTPS: verifica anni nuovi e se il TOT e' uscito dopo l'ultimo che abbiamo."""
    trend = carica_json("autori_vittime_trend.json")
    ultimo = int(trend["anno"].max())
    ultimo_tot = int(trend.loc[trend["codice_reato"] == "TOT", "anno"].max())
    locale = f"{trend['anno'].min()}-{ultimo} (TOT fino al {ultimo_tot})"
    log.info("=" * 60)
    log.info("DCCV_AUTVITTPS (autori e vittime)")
    log.info(f"  Dati locali: {locale}")

    result = {
        "dataset": "DCCV_AUTVITTPS",
        "locale": locale,
        "status": "errore",
        "tot_offend": False,
        "tot_victim": False,
    }

    nuovi_anni: set[int] = set()
    for chiave, nome, dataflow in [
        ("tot_offend", "OFFEND", "IT1,73_230_DF_DCCV_AUTVITTPS_7,1.0"),
        ("tot_victim", "VICTIM", "IT1,73_230_DF_DCCV_AUTVITTPS_8,1.0"),
    ]:
        if chiave == "tot_victim":
            time.sleep(DELAY)
        log.info(f"  Controllo dal {ultimo_tot + 1} su {nome}...")
        df = query_sdmx(dataflow, ultimo_tot + 1)
        if df is None:
            log.error(f"  Impossibile verificare {nome} (errore connessione)")
            return result
        if df.empty:
            log.info(f"  Nessun dato {nome} dal {ultimo_tot + 1}")
            continue

        nuovi_anni |= {y for y in anni_di(df) if y > ultimo}
        tot_it = df[(df["TYPE_CRIME"] == "TOT") & (df["REF_AREA"] == "IT")]
        if tot_it.empty:
            log.info(f"  TOT {nome} ancora assente per {anni_di(df)}")
        else:
            result[chiave] = True
            log.info(f"  NUOVO: TOT {nome} Italia disponibile per {anni_di(tot_it)}")

    if nuovi_anni:
        log.info(f"  NUOVI DATI disponibili: {sorted(nuovi_anni)}")
        result["nuovi_anni"] = sorted(nuovi_anni)
    if nuovi_anni or (result["tot_offend"] and result["tot_victim"]):
        result["status"] = "da_aggiornare"
    else:
        result["status"] = "tot_assente"

    return result


def check_percezione() -> dict:
    """Percezione criminalita' (Multiscopo): nessun dataflow SDMX, si controlla a mano."""
    perc = carica_json("percezione_vs_dati.json").dropna(subset=["Percezione_pct"])
    locale = f"{perc['Anno'].min()}-{perc['Anno'].max()}"
    log.info("=" * 60)
    log.info("PERCEZIONE CRIMINALITA' (Multiscopo)")
    log.info(f"  Dati locali: {locale}")
    log.info("  Dataflow SDMX non identificato, verifica manuale necessaria")

    return {"dataset": "Percezione (Multiscopo)", "locale": locale, "status": "verifica_manuale"}


def check_popolazione() -> dict:
    """DCIS_POPRES1: verifica ultimo anno disponibile."""
    pop = pd.read_csv(ROOT / "data" / "processed" / "popolazione_regioni_province.csv")
    ultimo = int(pop["Anno"].max())
    log.info("=" * 60)
    log.info("DCIS_POPRES1 (popolazione residente)")
    log.info(f"  Dati locali: fino al {ultimo}")

    result = {"dataset": "DCIS_POPRES1", "locale": f"fino al {ultimo}", "status": "errore"}
    if ultimo >= ANNO_CORRENTE:
        log.info("  Gia' all'anno in corso")
        result["status"] = "aggiornato"
        return result

    log.info(f"  Controllo dal {ultimo + 1}...")
    # Stessa chiave di download_popolazione.py: senza, la risposta con tutte le eta' va in timeout
    df = query_sdmx("IT1,22_289_DF_DCIS_POPRES1_1,1.0/A..JAN.9.TOTAL.99", ultimo + 1)
    if df is None:
        log.error("  Impossibile verificare (errore connessione)")
        return result
    if df.empty:
        log.info("  Nessun dato nuovo")
        result["status"] = "aggiornato"
    else:
        years = anni_di(df)
        log.info(f"  NUOVI DATI: anni {years}")
        result["status"] = "da_aggiornare"
        result["nuovi_anni"] = years

    return result


def main():
    log.info("Verifica aggiornamenti dataset ISTAT")
    log.info(f"Server: {BASE}")
    log.info("")

    results = []

    results.append(check_delittips())
    time.sleep(DELAY)

    results.append(check_autvittps())
    time.sleep(DELAY)

    results.append(check_percezione())
    # Nessuna query API per percezione, niente pausa

    results.append(check_popolazione())

    # Salva report JSON
    report_file = ROOT / "data" / "raw" / "check_updates.json"
    report = {
        "timestamp": datetime.now().isoformat(),
        "datasets": results,
    }
    report_file.parent.mkdir(parents=True, exist_ok=True)
    with open(report_file, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)

    # Riepilogo finale
    log.info("")
    log.info("=" * 60)
    log.info("RIEPILOGO")
    log.info("=" * 60)
    for r in results:
        status = r["status"]
        icon = {"aggiornato": "OK", "da_aggiornare": "NUOVO", "tot_assente": "BLOCCATO", "verifica_manuale": "MANUALE", "errore": "ERRORE"}
        log.info(f"  {icon.get(status, '?'):>8}  {r['dataset']}: {status}")
    log.info("")
    log.info(f"Report salvato: {report_file}")


if __name__ == "__main__":
    main()
