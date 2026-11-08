"""Scarica tutti i dataflow DCCV_AUTVITTPS da ISTAT via SDMX API.

Strategia: tenta il range completo in una richiesta. Se il server rifiuta
(payload troppo grande, 413/400), dimezza il periodo ricorsivamente fino
a trovare blocchi accettabili, poi li concatena.

Output: data/raw/autvittps/ con un CSV per dataflow.

Uso: conda activate osservatorio && python scripts/download_autvittps.py
Riprendi da dove interrotto: lo script salta automaticamente i dataflow gia' scaricati.
Forza riscaricamento: cancellare i file in data/raw/autvittps/ prima di lanciare.
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
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

BASE = "https://esploradati.istat.it/SDMXWS/rest"
HEADERS = {"Accept": "application/vnd.sdmx.data+csv;version=1.0.0"}

DATAFLOWS = {
    1: "Italia - sesso, eta dettagliata, cittadinanza (OFFEND+VICTIM)",
    2: "Italia - totali per paese cittadinanza (OFFEND+VICTIM)",
    3: "Province - sesso, eta dettagliata (OFFEND+VICTIM)",
    4: "Province - cittadinanza IT/straniero (OFFEND+VICTIM)",
    5: "Italia - sesso, eta dettagliata, cittadinanza (subset reati)",
    6: "Province - sesso, eta dettagliata (subset reati)",
    7: "Province - sesso, eta, cittadinanza (solo OFFEND)",
    8: "Province - sesso, eta, cittadinanza (solo VICTIM)",
}

START_YEAR = 2007
END_YEAR = 2024

DOWNLOAD_IDS = [1, 2, 3, 4, 5, 6, 7, 8]

# Pausa tra richieste (secondi). ISTAT limita a ~5 query/minuto.
DELAY = 15.0

MAX_RETRIES = 3
REQUEST_TIMEOUT = 300

# Periodo minimo prima di arrendersi (1 anno non si puo' spezzare ulteriormente)
MIN_SPAN = 1


def fetch_range(dfid: str, start: int, end: int) -> pd.DataFrame | None:
    """Scarica un range di anni. Ritorna DataFrame o None se nessun dato."""
    url = f"{BASE}/data/{dfid}"
    params = {
        "startPeriod": str(start),
        "endPeriod": str(end),
        "detail": "dataonly",
    }

    for attempt in range(MAX_RETRIES):
        try:
            r = requests.get(url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT)
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            wait = DELAY * (2 ** attempt)
            log.warning(f"    {type(e).__name__} {start}-{end} (tentativo {attempt + 1}/{MAX_RETRIES}), attendo {wait:.0f}s...")
            time.sleep(wait)
            continue

        if r.status_code == 200 and r.text.strip():
            df = pd.read_csv(StringIO(r.text))
            if "DATAFLOW" in df.columns:
                df = df.drop(columns=["DATAFLOW"])
            return df
        elif r.status_code == 404:
            return None
        elif r.status_code == 429 or r.status_code >= 500:
            wait = DELAY * (2 ** attempt)
            log.warning(f"    Status {r.status_code} {start}-{end} (tentativo {attempt + 1}/{MAX_RETRIES}), attendo {wait:.0f}s...")
            time.sleep(wait)
            continue
        elif r.status_code in (400, 413):
            # Payload troppo grande: segnala al chiamante di spezzare
            return "TOO_LARGE"
        else:
            log.warning(f"    Status inatteso {r.status_code} {start}-{end}")
            log.warning(f"    {r.text[:300]}")
            return None

    log.error(f"    Fallito {start}-{end} dopo {MAX_RETRIES} tentativi")
    return None


def download_range(dfid: str, start: int, end: int) -> list[pd.DataFrame]:
    """Scarica un range, spezzando ricorsivamente se troppo grande."""
    span = end - start + 1
    label = f"{start}-{end}" if start != end else str(start)

    log.info(f"    Richiesta {label} ({span} anni)...")
    result = fetch_range(dfid, start, end)
    time.sleep(DELAY)

    if isinstance(result, str) and result == "TOO_LARGE":
        if span <= MIN_SPAN:
            log.error(f"    Anche il singolo anno {start} e' troppo grande!")
            return []
        # Dimezza il periodo
        mid = start + span // 2 - 1
        log.info(f"    Troppo grande, spezzo in {start}-{mid} e {mid + 1}-{end}")
        left = download_range(dfid, start, mid)
        right = download_range(dfid, mid + 1, end)
        return left + right
    elif result is None:
        log.info(f"    {label}: nessun dato")
        return []
    else:
        log.info(f"    {label}: {len(result)} righe")
        return [result]


def download_dataflow(df_id: int, out_dir: Path) -> Path | None:
    """Scarica un dataflow completo."""
    dfid = f"IT1,73_230_DF_DCCV_AUTVITTPS_{df_id},1.0"
    desc = DATAFLOWS[df_id]
    out_file = out_dir / f"autvittps_{df_id}.csv"

    # Skip se gia' scaricato
    if out_file.exists() and out_file.stat().st_size > 0:
        log.info(f"DF_{df_id}: gia' presente ({out_file.stat().st_size / 1024 / 1024:.1f} MB), skip")
        return out_file

    log.info(f"Download DF_{df_id}: {desc}")

    dfs = download_range(dfid, START_YEAR, END_YEAR)

    if not dfs:
        log.warning(f"  Nessun dato scaricato per DF_{df_id}")
        return None

    result = pd.concat(dfs, ignore_index=True)
    result.to_csv(out_file, index=False, sep=";")
    size_mb = out_file.stat().st_size / 1024 / 1024
    log.info(f"  Salvato: {out_file.name} ({len(result)} righe, {size_mb:.1f} MB)")
    return out_file


def print_status(out_dir: Path) -> dict:
    """Stampa e ritorna lo stato di salute dei file scaricati."""
    log.info("=" * 60)
    log.info("STATO DOWNLOAD")
    log.info("=" * 60)

    status = {}
    for df_id, desc in DATAFLOWS.items():
        f = out_dir / f"autvittps_{df_id}.csv"
        if f.exists() and f.stat().st_size > 0:
            size_mb = f.stat().st_size / 1024 / 1024
            # Conta righe e anni senza caricare tutto in memoria
            with open(f, "r", encoding="utf-8") as fh:
                header = fh.readline().strip().split(";")
                n_rows = sum(1 for _ in fh)
            # Leggi solo la colonna TIME_PERIOD per contare gli anni
            tp_idx = header.index("TIME_PERIOD") if "TIME_PERIOD" in header else -1
            if tp_idx >= 0:
                years = set()
                with open(f, "r", encoding="utf-8") as fh:
                    fh.readline()  # skip header
                    for line in fh:
                        parts = line.split(";")
                        if tp_idx < len(parts):
                            years.add(parts[tp_idx].strip())
                year_range = f"{min(years)}-{max(years)}" if years else "?"
                n_years = len(years)
            else:
                year_range = "?"
                n_years = 0

            status[df_id] = {
                "file": f.name,
                "size_mb": round(size_mb, 1),
                "rows": n_rows,
                "years": n_years,
                "year_range": year_range,
                "ok": True,
            }
            log.info(f"  DF_{df_id} OK  {size_mb:6.1f} MB  {n_rows:>8} righe  {n_years:>2} anni ({year_range})  {desc}")
        else:
            status[df_id] = {"file": f"autvittps_{df_id}.csv", "ok": False}
            log.info(f"  DF_{df_id} --  MANCANTE  {desc}")

    # Salva report JSON
    report_file = out_dir / "download_status.json"
    report = {
        "timestamp": datetime.now().isoformat(),
        "dataflows": status,
    }
    with open(report_file, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
    log.info(f"\nReport salvato: {report_file}")

    return status


def main():
    project_root = Path(__file__).resolve().parent.parent
    out_dir = project_root / "data" / "raw" / "autvittps"
    out_dir.mkdir(parents=True, exist_ok=True)

    log.info(f"Output: {out_dir}")
    log.info(f"Dataflow da scaricare: {DOWNLOAD_IDS}")
    log.info(f"Periodo: {START_YEAR}-{END_YEAR}")
    log.info(f"Pausa tra richieste: {DELAY}s")
    log.info("")

    for i, df_id in enumerate(DOWNLOAD_IDS):
        download_dataflow(df_id, out_dir)
        if i < len(DOWNLOAD_IDS) - 1:
            log.info(f"  Attendo {DELAY:.0f}s prima del prossimo dataflow...")
            time.sleep(DELAY)
        log.info("")

    # Report finale
    print_status(out_dir)
    log.info("\nDownload completato.")


if __name__ == "__main__":
    main()
