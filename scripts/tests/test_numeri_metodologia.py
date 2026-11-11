"""Numeri di public/data/methodology.md, dichiarati in numeri_metodologia.json.

Ogni percentuale, decimale o numero con le migliaia del testo deve stare nell'elenco: i fatti si
ricalcolano dai dati, gli esterni portano la fonte.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.fatti import ROOT, calcola, numeri_dato, tolleranza

TESTO = (ROOT / "public" / "data" / "methodology.md").read_text(encoding="utf-8")
ELENCO = json.loads((Path(__file__).parent / "numeri_metodologia.json").read_text(encoding="utf-8"))
DICHIARATI = [f["testo"] for f in ELENCO["fatti"] + ELENCO["esterni"]] + ELENCO["liberi"]


@pytest.mark.parametrize("fatto", ELENCO["fatti"], ids=[f["testo"] for f in ELENCO["fatti"]])
def test_fatto_coincide_con_i_dati(fatto):
    assert calcola(fatto) == pytest.approx(fatto["valore"], abs=tolleranza(fatto))


@pytest.mark.parametrize("testo", DICHIARATI)
def test_dichiarato_compare_nel_testo(testo):
    assert testo in TESTO, f"{testo!r} dichiarato ma assente da methodology.md"


def test_esterni_hanno_la_fonte():
    for voce in ELENCO["esterni"]:
        assert voce.get("fonte"), voce


def test_ogni_numero_e_dichiarato():
    dichiarati = set().union(*(numeri_dato(t) for t in DICHIARATI))
    mancanti = numeri_dato(TESTO) - dichiarati
    assert not mancanti, (
        f"numeri non dichiarati in numeri_metodologia.json: {sorted(mancanti)}")
