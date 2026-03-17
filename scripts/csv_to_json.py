"""Converte i CSV processati in JSON per il frontend Next.js.

I CSV sorgente sono in data/processed/ di questo stesso repo.
Output: public/data/.
Uso: python scripts/csv_to_json.py
"""

import json
import logging
import shutil
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)


# Mapping CSV -> nome output JSON + colonne float da arrotondare
CSV_CONFIG = {
    "delitti_italia_normalizzato.csv": {
        "output": "delitti_italia.json",
        "round": {"Tasso_per_1000": 2},
    },
    "delitti_categorie_normalizzato.csv": {
        "output": "delitti_categorie.json",
        "round": {"Tasso_per_1000": 2},
    },
    "delitti_regioni_normalizzato.csv": {
        "output": "delitti_regioni.json",
        "round": {"Tasso_per_1000": 2},
    },
    "delitti_province_normalizzato.csv": {
        "output": "delitti_province.json",
        "round": {"Tasso_per_1000": 2},
    },
    "reati_allarme_sociale.csv": {
        "output": "reati_allarme_sociale.json",
        "round": {"Tasso_per_100k": 2},
    },
    "percezione_vs_dati.csv": {
        "output": "percezione_vs_dati.json",
        "round": {"Tasso_per_1000": 2, "Percezione_pct": 1},
    },
}


def convert_csv_to_json(project_root: Path) -> None:
    """Legge i CSV da data/processed/ e scrive JSON in public/data/."""
    csv_dir = project_root / "data" / "processed"
    out_dir = project_root / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    log.info("Sorgente:  %s", csv_dir)
    log.info("Output:    %s", out_dir)

    for csv_name, config in CSV_CONFIG.items():
        csv_path = csv_dir / csv_name
        if not csv_path.exists():
            log.warning("SKIP  %s (non trovato)", csv_name)
            continue

        df = pd.read_csv(csv_path)
        for col, decimals in config["round"].items():
            if col in df.columns:
                df[col] = df[col].round(decimals)

        out_path = out_dir / config["output"]
        records = df.to_dict(orient="records")
        out_path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")

        size_kb = out_path.stat().st_size / 1024
        log.info("OK    %-40s (%5d record, %.1f KB)", config["output"], len(records), size_kb)

    geojson_src = project_root / "data" / "raw" / "geojson_regioni_italia.geojson"
    geojson_dst = out_dir / "geojson_regioni_italia.geojson"
    if geojson_src.exists():
        shutil.copy2(geojson_src, geojson_dst)
        size_kb = geojson_dst.stat().st_size / 1024
        log.info("OK    %-40s (copia, %.1f KB)", "geojson_regioni_italia.geojson", size_kb)
    else:
        log.warning("SKIP  geojson_regioni_italia.geojson (non trovato)")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent

    convert_csv_to_json(project_root)


if __name__ == "__main__":
    main()
