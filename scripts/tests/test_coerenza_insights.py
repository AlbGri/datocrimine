"""Coerenza fra testi degli insight e dati pubblicati.

Ogni insight in src/data/insights.json dichiara i suoi numeri in "fatti":

    {"testo": "35,5%", "valore": 35.5, "file": "autori_vittime_trend.json",
     "filtro": {"data_type": "OFFEND", "codice_reato": "ROBBER"},
     "campo": "pct_stranieri", "anno": 2007}

Opzionali: "da" + "calcolo" ("variazione" o "variazione_pct") per un cambiamento fra due anni,
"meno" o "diviso" (un secondo filtro) per un divario o un rapporto fra due serie,
"tolleranza" per i numeri arrotondati a mano ("circa 5.000"), "grafico": false per un numero
che il grafico non mostra.

Il test verifica che ogni fatto coincida con i dati, compaia nel testo e stia nel grafico, che
ogni numero del testo sia dichiarato (fra i fatti o in "numeri_liberi", per quelli che non sono
dati) e che i risultati in "candidati" superino la correzione FDR.
"""

import json
import re
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT / "public" / "data"
CANDIDATI = ROOT / "data" / "processed" / "insights_candidates.csv"
INSIGHTS = json.loads((ROOT / "src" / "data" / "insights.json").read_text(encoding="utf-8"))

NUMERO = re.compile(r"\d+(?:[.,]\d+)*")
ANNO = re.compile(r"(19|20)\d\d")
CAMPI_TESTO = ("title", "body", "caveat", "genderNote", "chartInfo")
# Nome del filtro nel fatto -> nome nella serie del grafico
FILTRO_GRAFICO = {"data_type": "dataType", "codice_reato": "code", "categoria": "category"}

_cache: dict[str, pd.DataFrame] = {}


def carica(file: str) -> pd.DataFrame:
    if file not in _cache:
        _cache[file] = pd.DataFrame(json.loads((DATA_DIR / file).read_text(encoding="utf-8")))
    return _cache[file]


def valore_serie(fatto: dict, filtro: dict, anno: int) -> float:
    df = carica(fatto["file"])
    col_anno = "anno" if "anno" in df.columns else "Anno"
    mask = df[col_anno] == anno
    for chiave, valore in filtro.items():
        mask &= df[chiave] == valore
    righe = df.loc[mask, fatto["campo"]]
    assert len(righe) == 1, f"{len(righe)} righe per {filtro} {anno} in {fatto['file']}"
    return float(righe.iloc[0])


def valore_anno(fatto: dict, anno: int) -> float:
    valore = valore_serie(fatto, fatto.get("filtro", {}), anno)
    if "meno" in fatto:
        valore -= valore_serie(fatto, fatto["meno"], anno)
    if "diviso" in fatto:
        valore /= valore_serie(fatto, fatto["diviso"], anno)
    return valore


def calcola(fatto: dict) -> float:
    fine = valore_anno(fatto, fatto["anno"])
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


def contenuto_insight(insight: dict) -> str:
    return " ".join(insight.get(campo, "") for campo in CAMPI_TESTO)


def serie_grafico(insight: dict, filtro: dict, campo: str, diviso: dict | None) -> bool:
    for serie in insight.get("chart", {}).get("series", []):
        if serie["yField"] != campo:
            continue
        if serie.get("ratioDataType") != (diviso or {}).get("data_type"):
            continue
        if all(serie.get(FILTRO_GRAFICO[k]) == v for k, v in filtro.items() if k in FILTRO_GRAFICO):
            return True
    return False


FATTI = [
    pytest.param(insight, fatto, id=f"{insight['id']}:{fatto['testo']}")
    for insight in INSIGHTS
    for fatto in insight.get("fatti", [])
    if "file" in fatto
]


@pytest.mark.parametrize("insight,fatto", FATTI)
def test_fatto_coincide_con_i_dati(insight, fatto):
    assert calcola(fatto) == pytest.approx(fatto["valore"], abs=tolleranza(fatto))


@pytest.mark.parametrize("insight,fatto", FATTI)
def test_fatto_compare_nel_testo(insight, fatto):
    assert fatto["testo"] in contenuto_insight(insight)


@pytest.mark.parametrize("insight,fatto", FATTI)
def test_fatto_nel_grafico(insight, fatto):
    if fatto.get("grafico") is False:
        return
    assert insight.get("chart", {}).get("file") == fatto["file"]
    # Un rapporto e' una serie sola nel grafico (ratioDataType), un divario sono due serie
    filtri = [fatto.get("filtro", {})] + ([fatto["meno"]] if "meno" in fatto else [])
    for filtro in filtri:
        assert serie_grafico(insight, filtro, fatto["campo"], fatto.get("diviso")), (
            f"serie {filtro} assente")


@pytest.mark.parametrize("insight", INSIGHTS, ids=[i["id"] for i in INSIGHTS])
def test_ogni_numero_e_dichiarato(insight):
    dichiarati = set()
    for fatto in insight.get("fatti", []):
        dichiarati.update(NUMERO.findall(fatto["testo"]))
    for libero in insight.get("numeri_liberi", []):
        dichiarati.update(NUMERO.findall(libero))
    numeri = {n for n in NUMERO.findall(contenuto_insight(insight)) if not ANNO.fullmatch(n)}
    assert not numeri - dichiarati, f"numeri non dichiarati: {sorted(numeri - dichiarati)}"


def riga_candidato(candidato: dict) -> pd.Series:
    if not CANDIDATI.exists():
        pytest.skip(f"assente: {CANDIDATI}")
    if "df" not in _cache:
        _cache["df"] = pd.read_csv(CANDIDATI)
    df = _cache["df"]
    mask = pd.Series(True, index=df.index)
    for chiave, valore in candidato.items():
        mask &= df[chiave] == valore
    assert mask.sum() == 1, f"{mask.sum()} righe per {candidato}"
    return df[mask].iloc[0]


@pytest.mark.parametrize("insight", INSIGHTS, ids=[i["id"] for i in INSIGHTS])
def test_supera_la_fdr(insight):
    if insight.get("contesto"):
        pytest.skip("insight di contesto: descrive un dato stabile, non un trend")
    assert insight.get("candidati"), "nessun risultato statistico dichiarato"
    for candidato in insight["candidati"]:
        assert riga_candidato(candidato)["fdr_significant"], f"non supera la FDR: {candidato}"


# Numeri che vengono dal risultato statistico (es. "in 3 anni su 4" = monotonia 0,75)
FATTI_CANDIDATI = [
    pytest.param(insight, fatto, id=f"{insight['id']}:{fatto['testo']}")
    for insight in INSIGHTS
    for fatto in insight.get("fatti", [])
    if "candidato" in fatto
]


@pytest.mark.parametrize("insight,fatto", FATTI_CANDIDATI)
def test_fatto_dei_candidati(insight, fatto):
    assert fatto["testo"] in contenuto_insight(insight)
    valore = riga_candidato(fatto["candidato"])[fatto["campo"]]
    assert valore == pytest.approx(fatto["valore"], abs=tolleranza(fatto))
