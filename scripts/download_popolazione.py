"""Scarica DCIS_POPRES1 (popolazione residente) da ISTAT via SDMX API.

Dataflow: IT1,22_289_DF_DCIS_POPRES1_1,1.0
Filtro: SEX=9 (totale), AGE=TOTAL, MARITAL_STATUS=99 (totale).
Copre 2019-2025, tutti i territori (IT + regioni + province).

Output: data/raw/popolazione/popres1.csv

Uso: python scripts/download_popolazione.py
"""

import logging
import time
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

BASE = "https://esploradati.istat.it/SDMXWS/rest"
HEADERS = {"Accept": "application/vnd.sdmx.data+csv;version=1.0.0"}

DATAFLOW = "IT1,22_289_DF_DCIS_POPRES1_1,1.0"
# Filtro chiave SDMX: freq.ref_area.data_type.sex.age.marital_status
# Usiamo . (tutto) per ref_area e data_type, filtriamo sex/age/marital_status
KEY_FILTER = "A..JAN.9.TOTAL.99"

REQUEST_TIMEOUT = 120
MAX_RETRIES = 3
DELAY = 15.0


def download() -> pd.DataFrame | None:
    """Scarica il dataflow filtrato."""
    url = f"{BASE}/data/{DATAFLOW}/{KEY_FILTER}"
    params = {"detail": "dataonly"}

    for attempt in range(MAX_RETRIES):
        try:
            log.info(f"Richiesta SDMX (tentativo {attempt + 1}/{MAX_RETRIES})...")
            r = requests.get(url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT)
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            wait = DELAY * (2 ** attempt)
            log.warning(f"{type(e).__name__}, attendo {wait:.0f}s...")
            time.sleep(wait)
            continue

        if r.status_code == 200 and r.text.strip():
            df = pd.read_csv(StringIO(r.text))
            if "DATAFLOW" in df.columns:
                df = df.drop(columns=["DATAFLOW"])
            return df
        elif r.status_code == 404:
            log.error("404: dataflow non trovato")
            return None
        else:
            wait = DELAY * (2 ** attempt)
            log.warning(f"Status {r.status_code}, attendo {wait:.0f}s...")
            time.sleep(wait)
            continue

    log.error(f"Fallito dopo {MAX_RETRIES} tentativi")
    return None


def main():
    project_root = Path(__file__).resolve().parent.parent
    out_dir = project_root / "data" / "raw" / "popolazione"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "popres1.csv"

    if out_file.exists() and out_file.stat().st_size > 0:
        log.info(f"File gia' presente: {out_file} ({out_file.stat().st_size / 1024:.1f} KB), skip")
        log.info("Per riscaricare, cancellare il file prima di lanciare.")
        return

    df = download()
    if df is None:
        log.error("Download fallito")
        return

    df.to_csv(out_file, index=False, sep=";")
    size_kb = out_file.stat().st_size / 1024

    # Report
    territories = df["REF_AREA"].nunique()
    years = sorted(df["TIME_PERIOD"].unique())
    log.info(f"Salvato: {out_file.name} ({len(df)} righe, {size_kb:.1f} KB)")
    log.info(f"Territori: {territories}, Anni: {min(years)}-{max(years)}")


if __name__ == "__main__":
    main()
