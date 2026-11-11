"""Ricalcolo dei numeri dichiarati nei testi (insight, report, metodologia).

Un fatto dichiara da dove viene un numero:

    {"testo": "35,5%", "valore": 35.5, "file": "autori_vittime_trend.json",
     "filtro": {"data_type": "OFFEND", "codice_reato": "ROBBER"},
     "campo": "pct_stranieri", "anno": 2007}

"file" e' un JSON di public/data/, o un percorso che parte da src/ (con le righe in "righe").
Opzionali: "anno" (assente per dati senza anni), "da" + "calcolo" ("variazione" o
"variazione_pct") per un cambiamento fra due anni, "meno" o "diviso" (un secondo filtro, con
"campo" e "file" se diversi) per un divario o un rapporto, "tolleranza" per i numeri arrotondati
a mano. Un filtro con "somma": true somma le righe trovate invece di volerne una sola. "diviso"
da' un rapporto, non una percentuale: 0,48% si dichiara con "valore": 0.0048.
"""

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT / "public" / "data"

NUMERO = re.compile(r"\d+(?:[.,]\d+)*")
ANNO = re.compile(r"(19|20)\d\d")

# Numeri che sembrano dati nei testi liberi: percentuali, decimali, migliaia col punto.
# Anni, numeri d'elenco e codici restano fuori.
_PRIMA = r"(?<![\w.,#/-])"
NUMERO_DATO = re.compile(
    _PRIMA + r"[+-]?\d+(?:\.\d{3})*(?:,\d+)?\s?%"
    + "|" + _PRIMA + r"[+-]?\d+,\d+(?!\w)"
    + "|" + _PRIMA + r"\d{1,3}(?:\.\d{3})+(?![\w,])"
)


def numeri_dato(testo: str) -> set[str]:
    """Numeri da dato in un testo, senza indirizzi web e codice; "0,2-1,5%" da' due numeri."""
    testo = re.sub(r"\]\([^)]*\)|https?://\S+|`[^`]*`", " ", testo)
    testo = re.sub(r"(\d)-(\d)", r"\1 \2", testo)
    return {re.sub(r"\s", "", n) for n in NUMERO_DATO.findall(testo)}

_cache: dict[str, pd.DataFrame] = {}


def carica(file: str) -> pd.DataFrame:
    if file not in _cache:
        path = ROOT / file if file.startswith("src/") else DATA_DIR / file
        dati = json.loads(path.read_text(encoding="utf-8"))
        _cache[file] = pd.DataFrame(dati["righe"] if isinstance(dati, dict) else dati)
    return _cache[file]


def valore_serie(fatto: dict, filtro: dict, anno: int | None) -> float:
    filtro = dict(filtro)
    campo = filtro.pop("campo", fatto["campo"])
    file = filtro.pop("file", fatto["file"])
    somma = filtro.pop("somma", False)
    df = carica(file)
    mask = pd.Series(True, index=df.index)
    if anno is not None:
        mask &= df["anno" if "anno" in df.columns else "Anno"] == anno
    for chiave, valore in filtro.items():
        mask &= df[chiave] == valore
    righe = df.loc[mask, campo]
    if somma:
        assert len(righe) > 0, f"nessuna riga per {filtro} {anno} in {file}"
        return float(righe.sum())
    assert len(righe) == 1, f"{len(righe)} righe per {filtro} {anno} in {file}"
    return float(righe.iloc[0])


def valore_anno(fatto: dict, anno: int | None) -> float:
    valore = valore_serie(fatto, fatto.get("filtro", {}), anno)
    if "meno" in fatto:
        valore -= valore_serie(fatto, fatto["meno"], anno)
    if "diviso" in fatto:
        valore /= valore_serie(fatto, fatto["diviso"], anno)
    return valore


def calcola(fatto: dict) -> float:
    fine = valore_anno(fatto, fatto.get("anno"))
    if "da" not in fatto:
        return fine
    inizio = valore_anno(fatto, fatto["da"])
    if fatto["calcolo"] == "variazione_pct":
        return (fine / inizio - 1) * 100
    return fine - inizio


def tolleranza(fatto: dict) -> float:
    if "tolleranza" in fatto:
        return fatto["tolleranza"]
    decimali = str(fatto["valore"])[::-1].find(".")
    return 0.5 * 10 ** -max(decimali, 0) + 1e-9
