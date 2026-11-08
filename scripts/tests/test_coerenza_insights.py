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
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.fatti import ANNO, NUMERO, ROOT, calcola, tolleranza

CANDIDATI = ROOT / "data" / "processed" / "insights_candidates.csv"
INSIGHTS = json.loads((ROOT / "src" / "data" / "insights.json").read_text(encoding="utf-8"))

CAMPI_TESTO = ("title", "body", "caveat", "genderNote", "chartInfo")
# Nome del filtro nel fatto -> nome nella serie del grafico
FILTRO_GRAFICO = {"data_type": "dataType", "codice_reato": "code", "categoria": "category"}

_candidati: dict[str, pd.DataFrame] = {}


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
    if "df" not in _candidati:
        _candidati["df"] = pd.read_csv(CANDIDATI)
    df = _candidati["df"]
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
