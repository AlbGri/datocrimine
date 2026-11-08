"""Test del modulo reati: etichette e gerarchia contro i dati ISTAT.

I test sul raw si saltano se data/raw/ manca (e' fuori da git).
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generate_delittips import CATEGORY_MAP, FILTERS
from reati import ETICHETTE, GERARCHIA, SOTTOTIPI

RAW_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "raw"
DELITTIPS = RAW_DIR / "delittips" / "delittips_1.csv"
AUTVITTPS = [RAW_DIR / "autvittps" / f"autvittps_{n}.csv" for n in (7, 8)]


@pytest.fixture(scope="module")
def delitti() -> pd.DataFrame:
    if not DELITTIPS.exists():
        pytest.skip(f"raw assente: {DELITTIPS}")
    df = pd.read_csv(DELITTIPS, sep=";", usecols=[*FILTERS, "REF_AREA", "TYPE_CRIME",
                                                    "TIME_PERIOD", "OBS_VALUE"])
    for col, val in FILTERS.items():
        df = df[df[col] == val]
    return df


class TestGerarchia:
    def test_totale_uguale_somma_voci_autonome(self, delitti):
        tot = delitti[delitti["TYPE_CRIME"] == "TOT"].set_index(
            ["REF_AREA", "TIME_PERIOD"])["OBS_VALUE"]
        voci = delitti[(delitti["TYPE_CRIME"] != "TOT") & ~delitti["TYPE_CRIME"].isin(SOTTOTIPI)]
        somma = voci.groupby(["REF_AREA", "TIME_PERIOD"])["OBS_VALUE"].sum()
        scarti = (tot - somma).dropna()
        assert len(scarti) == len(tot)
        assert (scarti == 0).all(), scarti[scarti != 0].head()

    def test_padri_non_sono_sottotipi(self):
        assert not set(GERARCHIA) & SOTTOTIPI


class TestEtichette:
    def test_codici_delittips(self, delitti):
        assert set(delitti["TYPE_CRIME"]) <= set(ETICHETTE)

    def test_codici_autvittps(self):
        for path in AUTVITTPS:
            if not path.exists():
                pytest.skip(f"raw assente: {path}")
            codici = set(pd.read_csv(path, sep=";", usecols=["TYPE_CRIME"])["TYPE_CRIME"])
            # STALK viene unificato in CP612BIS al caricamento
            assert codici - {"STALK"} <= set(ETICHETTE)

    def test_gerarchia_etichettata(self):
        assert (set(GERARCHIA) | SOTTOTIPI) <= set(ETICHETTE)


class TestCategorie:
    def test_categorie_coprono_le_voci_autonome(self, delitti):
        # Ogni voce autonoma ha una categoria e nessun sottotipo ne ha una:
        # con l'identita' del totale, le categorie sommano al totale
        voci = set(delitti["TYPE_CRIME"]) - SOTTOTIPI - {"TOT"}
        assert set(CATEGORY_MAP) == voci
