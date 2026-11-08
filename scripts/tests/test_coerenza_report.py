"""Coerenza fra report annuale e dati pubblicati.

Ogni numero di public/data/report_{anno}.json viene ricalcolato qui, per conto suo, dai JSON di
partenza non arrotondati: un calcolo sbagliato nello script (per esempio una variazione su tassi
gia' arrotondati) fa fallire il test. Poi si verifica che i contributi dei reati sommino alla
variazione totale, che i testi generati contengano solo numeri della stessa voce, che non ci sia
una tendenza storica su serie troppo brevi e che il JSON pubblicato sia quello che lo script
produce oggi.
"""

import json
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generate_insights import COVID_YEARS
from generate_report import MIN_PUNTI_TREND, RIPARTIZIONI_DELITTI, generate_report_data
from tests.fatti import ANNO, DATA_DIR, NUMERO, carica, tolleranza

REPORT = [
    pytest.param(json.loads(p.read_text(encoding="utf-8")), id=p.stem)
    for p in sorted(DATA_DIR.glob("report_*.json"))
]


def coincide(pubblicato: float, esatto: float) -> None:
    """Il valore pubblicato e' l'esatto arrotondato alle cifre con cui e' scritto."""
    assert pubblicato == pytest.approx(esatto, abs=tolleranza({"valore": pubblicato}))


def tasso(df: pd.DataFrame, anno: int, per: int) -> float:
    riga = df[df["Anno"] == anno]
    assert len(riga) == 1
    return float(riga["Delitti"].iloc[0]) / float(riga["Popolazione"].iloc[0]) * per


def variazione(prima: float, dopo: float) -> float:
    return (dopo / prima - 1) * 100


@pytest.mark.parametrize("report", REPORT)
def test_sintesi(report):
    df = carica("delitti_italia.json")
    anno, es = report["anno"], report["executive_summary"]
    corrente, precedente = tasso(df, anno, 1000), tasso(df, anno - 1, 1000)
    coincide(es["tasso_totale"], corrente)
    coincide(es["tasso_precedente"], precedente)
    coincide(es["variazione_pct"], variazione(precedente, corrente))
    coincide(es["tasso_pre_covid"], tasso(df, 2019, 1000))
    riga = df[df["Anno"] == anno].iloc[0]
    assert es["delitti_totali"] == riga["Delitti"]
    assert es["popolazione"] == riga["Popolazione"]


@pytest.mark.parametrize("report", REPORT)
def test_regioni(report):
    df = carica("delitti_regioni.json")
    anno, regioni = report["anno"], report["variazione_regioni"]
    attese = {c for c, g in df.groupby("REF_AREA") if {anno, anno - 1} <= set(g["Anno"])}
    assert {r["REF_AREA"] for r in regioni} == attese
    for r in regioni:
        righe = df[df["REF_AREA"] == r["REF_AREA"]]
        corrente, precedente = tasso(righe, anno, 1000), tasso(righe, anno - 1, 1000)
        coincide(r["tasso_corrente"], corrente)
        coincide(r["tasso_precedente"], precedente)
        coincide(r["variazione_pct"], variazione(precedente, corrente))
    # La pagina legge il primo e l'ultimo come maggiore aumento e maggiore calo
    valori = [r["variazione_pct"] for r in regioni]
    assert valori == sorted(valori, reverse=True)


@pytest.mark.parametrize("report", REPORT)
def test_ripartizioni(report):
    df = carica("delitti_regioni.json")
    anno = report["anno"]
    assert [r["ripartizione"] for r in report["variazione_ripartizioni"]] == list(
        RIPARTIZIONI_DELITTI)
    for r in report["variazione_ripartizioni"]:
        righe = df[df["REF_AREA"].isin(RIPARTIZIONI_DELITTI[r["ripartizione"]])]
        somme = righe.groupby("Anno")[["Delitti", "Popolazione"]].sum().reset_index()
        corrente, precedente = tasso(somme, anno, 1000), tasso(somme, anno - 1, 1000)
        coincide(r["tasso_corrente"], corrente)
        coincide(r["tasso_precedente"], precedente)
        coincide(r["variazione_pct"], variazione(precedente, corrente))


@pytest.mark.parametrize("report", REPORT)
def test_reati_di_allarme(report):
    df = carica("reati_allarme_sociale.json")
    anno = report["anno"]
    assert {r["reato"] for r in report["reati_allarme_sociale"]} == set(
        df[df["Anno"] == anno]["Reato"])
    for r in report["reati_allarme_sociale"]:
        righe = df[df["Reato"] == r["reato"]]
        corrente, precedente = tasso(righe, anno, 100_000), tasso(righe, anno - 1, 100_000)
        coincide(r["tasso_corrente"], corrente)
        coincide(r["tasso_precedente"], precedente)
        coincide(r["variazione_pct"], variazione(precedente, corrente))
        assert r["delitti_corrente"] == righe[righe["Anno"] == anno]["Delitti"].iloc[0]


@pytest.mark.parametrize("report", REPORT)
def test_percezione(report):
    df = carica("percezione_vs_dati.json")
    p = report["percezione"]
    if p is None:
        assert report["anno"] not in set(df["Anno"])
        return
    riga = df[df["Anno"] == p["anno"]].iloc[0]
    assert p["percezione_pct"] == riga["Percezione_pct"]
    coincide(p["tasso_delitti"], tasso(df, p["anno"], 1000))


def test_codici_sommano_al_totale():
    reati = carica("delitti_reati_italia.json").groupby("Anno")["Delitti"].sum()
    totale = carica("delitti_italia.json").set_index("Anno")["Delitti"]
    assert reati.to_dict() == totale.to_dict()


BLOCCHI = [
    pytest.param(report, blocco, id=f"report_{report['anno']}:{blocco['anno_base']}")
    for report in (p.values[0] for p in REPORT)
    for blocco in report["contributi"]
]


def serie_reato(codice: str, fino_a: int) -> pd.Series:
    df = carica("delitti_reati_italia.json")
    righe = df[(df["Codice"] == codice) & (df["Anno"] <= fino_a)]
    return righe.set_index("Anno")["Delitti"].sort_index()


@pytest.mark.parametrize("report,blocco", BLOCCHI)
def test_contributi(report, blocco):
    anno, base = report["anno"], blocco["anno_base"]
    totale = carica("delitti_italia.json").set_index("Anno")["Delitti"]
    assert blocco["delitti_base"] == totale[base]
    assert blocco["delitti_corrente"] == totale[anno]
    assert blocco["differenza"] == totale[anno] - totale[base]
    coincide(blocco["variazione_pct"], variazione(totale[base], totale[anno]))

    reati = carica("delitti_reati_italia.json")
    for voce in blocco["aumenti"] + blocco["cali"]:
        serie = serie_reato(voce["codice"], anno)
        assert voce["reato"] == reati[reati["Codice"] == voce["codice"]]["Reato"].iloc[0]
        assert voce["delitti_base"] == serie[base]
        assert voce["delitti_corrente"] == serie[anno]
        assert voce["differenza"] == serie[anno] - serie[base]
        coincide(voce["variazione_pct"], variazione(serie[base], serie[anno]))


@pytest.mark.parametrize("report,blocco", BLOCCHI)
def test_contributi_sommano_e_selezionano_i_maggiori(report, blocco):
    anno, base = report["anno"], blocco["anno_base"]
    differenze = {}
    for codice in carica("delitti_reati_italia.json")["Codice"].unique():
        serie = serie_reato(codice, anno)
        if {base, anno} <= set(serie.index):
            differenze[codice] = int(serie[anno] - serie[base])

    aumenti = [v["differenza"] for v in blocco["aumenti"]]
    cali = [v["differenza"] for v in blocco["cali"]]
    assert sum(aumenti) + sum(cali) + blocco["altri"]["differenza"] == blocco["differenza"]
    assert blocco["altri"]["n_reati"] == len(differenze) - len(aumenti) - len(cali)
    assert aumenti == sorted(aumenti, reverse=True) and all(d > 0 for d in aumenti)
    assert cali == sorted(cali) and all(d < 0 for d in cali)

    mostrati = {v["codice"] for v in blocco["aumenti"] + blocco["cali"]}
    esclusi = [d for c, d in differenze.items() if c not in mostrati]
    if aumenti:
        assert all(d <= aumenti[-1] for d in esclusi)
    if cali:
        assert all(d >= cali[-1] for d in esclusi)


@pytest.mark.parametrize("report,blocco", BLOCCHI)
def test_tendenza_solo_su_serie_lunghe(report, blocco):
    for voce in blocco["aumenti"] + blocco["cali"]:
        serie = serie_reato(voce["codice"], report["anno"])
        assert voce["inizio_serie"] == serie.index.min()
        punti = sum(a not in COVID_YEARS for a in serie.index)
        if punti < MIN_PUNTI_TREND:
            assert voce["trend_strutturale"] is None, f"{voce['reato']}: {punti} anni"
        else:
            assert voce["trend_strutturale"] is not None


def numeri(oggetto) -> set[float]:
    """Tutti i valori numerici di un dizionario, a ogni livello, in valore assoluto."""
    if isinstance(oggetto, dict):
        return set().union(*(numeri(v) for v in oggetto.values())) if oggetto else set()
    if isinstance(oggetto, list):
        return set().union(*(numeri(v) for v in oggetto)) if oggetto else set()
    if isinstance(oggetto, (int, float)) and not isinstance(oggetto, bool):
        return {abs(float(oggetto))}
    return set()


def numeri_del_testo(testo: str) -> set[float]:
    """Numeri scritti all'italiana (1.234,5), anni esclusi."""
    trovati = set()
    for token in NUMERO.findall(testo):
        if ANNO.fullmatch(token):
            continue
        trovati.add(float(token.replace(".", "").replace(",", ".")))
    return trovati


@pytest.mark.parametrize("report,blocco", BLOCCHI)
def test_ogni_numero_dei_testi_e_un_dato(report, blocco):
    dichiarati = numeri({k: v for k, v in blocco.items() if k not in ("aumenti", "cali")})
    dichiarati |= {abs(float(v["differenza"])) for v in blocco["aumenti"] + blocco["cali"]}
    estranei = numeri_del_testo(blocco["sintesi"]) - dichiarati
    assert not estranei, f"sintesi, numeri non nei dati: {sorted(estranei)}"
    for voce in blocco["aumenti"] + blocco["cali"]:
        for campo in ("contesto", "caveat", "nota"):
            estranei = numeri_del_testo(voce[campo] or "") - numeri(voce)
            assert not estranei, f"{voce['reato']} {campo}: {sorted(estranei)}"


@pytest.mark.parametrize("report", REPORT)
def test_report_pubblicato_e_aggiornato(report):
    generato = json.loads(json.dumps(generate_report_data(report["anno"]), ensure_ascii=False))
    assert generato == report, "rilanciare scripts/generate_report.py"
