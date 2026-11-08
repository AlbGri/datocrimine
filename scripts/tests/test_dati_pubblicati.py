"""Controlli sui JSON pubblicati: valori plausibili e confronto con altre pubblicazioni ISTAT.

I riferimenti esterni stanno in riferimenti_esterni.json, ciascuno con la fonte. Fonti diverse
estraggono gli stessi dati in momenti diversi: la tolleranza lo dichiara caso per caso.
"""

import json
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from reati import GERARCHIA

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data"
RIFERIMENTI = json.loads((Path(__file__).parent / "riferimenti_esterni.json").read_text(
    encoding="utf-8"))


def carica(file: str) -> pd.DataFrame:
    return pd.DataFrame(json.loads((DATA_DIR / file).read_text(encoding="utf-8")))


FILE_CON_PERCENTUALI = sorted(
    p.name for p in DATA_DIR.glob("*.json")
    if p.name.startswith(("autori_vittime_", "insights_", "percezione_"))
)


@pytest.mark.parametrize("file", FILE_CON_PERCENTUALI)
def test_percentuali_fra_0_e_100(file):
    df = carica(file)
    colonne = [c for c in df.columns if c.startswith("pct_") or c.endswith("_pct")]
    assert colonne, f"nessuna percentuale in {file}"
    for col in colonne:
        valori = df[col].dropna()
        assert valori.between(0, 100).all(), f"{col}: {valori[~valori.between(0, 100)].head()}"


def test_sottotipo_mai_piu_grande_del_padre():
    df = carica("autori_vittime_trend.json")
    totali = df.set_index(["data_type", "anno", "codice_reato"])["totale"]
    for (data_type, anno), grp in totali.groupby(level=[0, 1]):
        grp = grp.droplevel([0, 1])
        for padre, figli in GERARCHIA.items():
            if padre not in grp:
                continue
            for figlio in figli & set(grp.index):
                assert grp[figlio] <= grp[padre], f"{data_type} {anno}: {figlio} > {padre}"


@pytest.mark.parametrize("rif", RIFERIMENTI, ids=[r["descrizione"] for r in RIFERIMENTI])
def test_riferimenti_esterni(rif):
    df = carica(rif["file"])
    col_anno = "anno" if "anno" in df.columns else "Anno"
    mask = df[col_anno] == rif["anno"]
    for chiave, valore in rif["filtro"].items():
        mask &= df[chiave] == valore
    assert mask.sum() == 1
    nostro = df.loc[mask, rif["campo"]].iloc[0]
    assert nostro == pytest.approx(rif["valore"], abs=rif["tolleranza"] + 1e-9), rif["fonte"]
