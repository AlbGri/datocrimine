"""Nelle pagine del sito nessun numero da dato scritto a mano.

Percentuali, decimali e numeri con le migliaia nei file .tsx vanno calcolati dai dati. Le poche
eccezioni (unita' di misura, esempi, soglie) stanno in numeri_pagine.json con il motivo.
"""

import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.fatti import ROOT, numeri_dato

AMMESSI = json.loads((Path(__file__).parent / "numeri_pagine.json").read_text(encoding="utf-8"))
PAGINE = sorted(p for cartella in ("src/app", "src/components") for p in (ROOT / cartella).rglob("*.tsx"))
# Commenti, classi CSS, formati dei tooltip e colori non sono testo per il lettore
NON_TESTO = re.compile(
    r"/\*.*?\*/|//[^\n]*|className=(\"[^\"]*\"|\{`[^`]*`\})|hovertemplate:\s*\"[^\"]*\"|rgba?\([^)]*\)",
    re.S,
)


def numeri_pagina(path: Path) -> set[str]:
    return numeri_dato(NON_TESTO.sub(" ", path.read_text(encoding="utf-8")))


@pytest.mark.parametrize("path", PAGINE, ids=[p.relative_to(ROOT).as_posix() for p in PAGINE])
def test_nessun_numero_scritto_a_mano(path):
    nome = path.relative_to(ROOT).as_posix()
    ammessi = set(AMMESSI["tutte"]["numeri"]) | set(AMMESSI["file"].get(nome, {}).get("numeri", []))
    scritti = numeri_pagina(path) - ammessi
    assert not scritti, (
        f"numeri scritti a mano: {sorted(scritti)}. Calcolarli dai dati, o se sono esempi o "
        f"soglie aggiungerli a numeri_pagine.json con il motivo")


@pytest.mark.parametrize("nome", sorted(AMMESSI["file"]))
def test_eccezioni_ancora_usate(nome):
    voce = AMMESSI["file"][nome]
    assert voce.get("perche"), f"{nome}: manca il motivo"
    inutili = set(voce["numeri"]) - numeri_pagina(ROOT / nome)
    assert not inutili, f"{nome}: eccezioni non piu' presenti nel file: {sorted(inutili)}"
