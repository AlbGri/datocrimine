"""Numeri delle pagine di testo in markdown, ciascuna con il suo elenco dichiarato.

public/data/methodology.md -> numeri_metodologia.json,
public/data/dati-che-mancano.md -> numeri_dati_che_mancano.json.
Ogni percentuale, decimale o numero con le migliaia del testo deve stare nell'elenco: i fatti si
ricalcolano dai dati, gli esterni portano la fonte.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.fatti import ROOT, calcola, numeri_dato, tolleranza

PAGINE = {
    "methodology.md": "numeri_metodologia.json",
    "dati-che-mancano.md": "numeri_dati_che_mancano.json",
}


def _carica(pagina: str) -> tuple[str, dict, list[str]]:
    testo = (ROOT / "public" / "data" / pagina).read_text(encoding="utf-8")
    elenco = json.loads((Path(__file__).parent / PAGINE[pagina]).read_text(encoding="utf-8"))
    dichiarati = [f["testo"] for f in elenco["fatti"] + elenco["esterni"]] + elenco["liberi"]
    return testo, elenco, dichiarati


CASI = {pagina: _carica(pagina) for pagina in PAGINE}
FATTI = [(p, f) for p, (_, elenco, _) in CASI.items() for f in elenco["fatti"]]
DICHIARATI = [(p, d) for p, (_, _, dichiarati) in CASI.items() for d in dichiarati]


@pytest.mark.parametrize("pagina,fatto", FATTI, ids=[f"{p}:{f['testo']}" for p, f in FATTI])
def test_fatto_coincide_con_i_dati(pagina, fatto):
    assert calcola(fatto) == pytest.approx(fatto["valore"], abs=tolleranza(fatto))


@pytest.mark.parametrize("pagina,testo", DICHIARATI, ids=[f"{p}:{d}" for p, d in DICHIARATI])
def test_dichiarato_compare_nel_testo(pagina, testo):
    assert testo in CASI[pagina][0], f"{testo!r} dichiarato ma assente da {pagina}"


@pytest.mark.parametrize("pagina", PAGINE)
def test_esterni_hanno_la_fonte(pagina):
    for voce in CASI[pagina][1]["esterni"]:
        assert voce.get("fonte"), voce


@pytest.mark.parametrize("pagina", PAGINE)
def test_ogni_numero_e_dichiarato(pagina):
    testo, _, dichiarati = CASI[pagina]
    mancanti = numeri_dato(testo) - set().union(*(numeri_dato(t) for t in dichiarati))
    assert not mancanti, f"numeri di {pagina} non dichiarati in {PAGINE[pagina]}: {sorted(mancanti)}"
