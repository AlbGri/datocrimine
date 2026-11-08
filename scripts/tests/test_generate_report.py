"""
Test per le funzioni di generate_report.py.

Testa funzioni pure (no I/O) su edge case e casi standard.
Esecuzione: python -m pytest scripts/tests/test_generate_report.py -v
"""

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np

from generate_report import (
    N_CONTRIBUTI,
    _build_caveat,
    _build_contesto,
    _trend_strutturale_with_covid,
    build_contributi,
    build_executive_summary,
    build_percezione,
    build_reati_allarme,
    build_variazione_regioni,
    build_variazione_ripartizioni,
)


# ===================================================================
# build_executive_summary
# ===================================================================

def _make_df_italia(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


class TestBuildExecutiveSummary:
    def test_basic(self):
        df = _make_df_italia([
            {"Anno": 2023, "Delitti": 2500000, "Popolazione": 60000000, "Tasso_per_1000": 41.67},
            {"Anno": 2024, "Delitti": 2600000, "Popolazione": 59800000, "Tasso_per_1000": 43.48},
        ])
        result = build_executive_summary(df, 2024)
        assert result["tasso_totale"] == 43.48
        assert result["tasso_precedente"] == 41.67
        assert result["delitti_totali"] == 2600000
        assert result["popolazione"] == 59800000
        # variazione_pct = (43.48 - 41.67) / 41.67 * 100 = ~4.3
        assert result["variazione_pct"] == pytest.approx(4.3, abs=0.1)
        # media_storica = solo anno precedente al target
        assert result["media_storica"] == 41.67

    def test_media_storica_multi_anni(self):
        df = _make_df_italia([
            {"Anno": 2022, "Delitti": 2400000, "Popolazione": 60000000, "Tasso_per_1000": 40.0},
            {"Anno": 2023, "Delitti": 2500000, "Popolazione": 60000000, "Tasso_per_1000": 41.67},
            {"Anno": 2024, "Delitti": 2600000, "Popolazione": 59800000, "Tasso_per_1000": 43.48},
        ])
        result = build_executive_summary(df, 2024)
        # media_storica = mean(40.0, 41.667) = 40.833
        assert result["media_storica"] == 40.83

    def test_anno_mancante_raises(self):
        df = _make_df_italia([
            {"Anno": 2022, "Delitti": 2400000, "Popolazione": 60000000, "Tasso_per_1000": 40.0},
        ])
        with pytest.raises(ValueError, match="Dati mancanti"):
            build_executive_summary(df, 2024)

    def test_anno_precedente_mancante_raises(self):
        df = _make_df_italia([
            {"Anno": 2024, "Delitti": 2600000, "Popolazione": 59800000, "Tasso_per_1000": 43.48},
        ])
        with pytest.raises(ValueError, match="Dati mancanti"):
            build_executive_summary(df, 2024)

    def test_variazione_negativa(self):
        df = _make_df_italia([
            {"Anno": 2023, "Delitti": 2600000, "Popolazione": 60000000, "Tasso_per_1000": 43.33},
            {"Anno": 2024, "Delitti": 2400000, "Popolazione": 60000000, "Tasso_per_1000": 40.0},
        ])
        result = build_executive_summary(df, 2024)
        assert result["variazione_pct"] < 0


# ===================================================================
# build_contributi
# ===================================================================

def _make_df_reati(valori: dict[str, list[int]], start_year: int = 2014) -> pd.DataFrame:
    """Helper: {codice: delitti per anno da start_year} -> delitti_reati_italia."""
    return pd.DataFrame([
        {"Anno": start_year + i, "Codice": codice, "Reato": f"Reato {codice}",
         "Delitti": delitti, "Popolazione": 60_000_000}
        for codice, serie in valori.items()
        for i, delitti in enumerate(serie)
    ])


def _totali(df_reati: pd.DataFrame) -> pd.DataFrame:
    return df_reati.groupby("Anno", as_index=False)["Delitti"].sum()


class TestBuildContributi:
    def test_ordinati_per_differenza_assoluta(self):
        # B cresce di piu' in assoluto, A di piu' in percentuale
        df = _make_df_reati({"A": [100, 200], "B": [10000, 10500], "C": [5000, 4000]})
        result = build_contributi(df, _totali(df), 2015, 2014)
        assert [v["codice"] for v in result["aumenti"]] == ["B", "A"]
        assert [v["codice"] for v in result["cali"]] == ["C"]
        assert result["aumenti"][1]["variazione_pct"] == 100.0

    def test_somma_alla_differenza_totale(self):
        valori = {f"R{i}": [1000, 1000 + i * 10 - 60] for i in range(15)}
        df = _make_df_reati(valori)
        result = build_contributi(df, _totali(df), 2015, 2014)
        assert len(result["aumenti"]) == N_CONTRIBUTI
        assert len(result["cali"]) == N_CONTRIBUTI
        mostrate = sum(v["differenza"] for v in result["aumenti"] + result["cali"])
        assert mostrate + result["altri"]["differenza"] == result["differenza"]
        assert result["altri"]["n_reati"] == 15 - 2 * N_CONTRIBUTI

    def test_reato_senza_uno_dei_due_anni_escluso(self):
        df = _make_df_reati({"A": [100, 200], "B": [50]})
        result = build_contributi(df, _totali(df), 2015, 2014)
        codici = [v["codice"] for v in result["aumenti"] + result["cali"]]
        assert codici == ["A"]

    def test_anni_dopo_il_target_ignorati(self):
        # Il trend del report 2024 non dipende da dati usciti dopo
        crescente = list(range(100, 111))
        df = _make_df_reati({"A": crescente + [0, 0, 0, 0, 0, 0]})
        result = build_contributi(df, _totali(df), 2024, 2023)
        assert result["aumenti"][0]["trend_strutturale"] == "increasing"

    def test_sintesi(self):
        df = _make_df_reati({"FURTI": [10000, 43483], "TRUFFE": [20000, 4066]})
        df["Reato"] = df["Codice"].map({"FURTI": "Furti", "TRUFFE": "Truffe"})
        result = build_contributi(df, _totali(df), 2015, 2014)
        assert result["sintesi"] == (
            "Rispetto al 2014 i delitti denunciati sono aumentati di 17.549 (+58,5%). "
            "Aumentano soprattutto furti (+33.483); calano soprattutto truffe (-15.934)."
        )

    def test_sintesi_in_calo(self):
        df = _make_df_reati({"A": [2000, 1000]})
        result = build_contributi(df, _totali(df), 2015, 2014)
        assert result["sintesi"].startswith(
            "Rispetto al 2014 i delitti denunciati sono diminuiti di 1.000 (-50,0%).")

    def test_nota_e_insight(self):
        df = _make_df_reati({"OTHCRIM": [100, 200], "SWINCYB": [100, 300]})
        result = build_contributi(df, _totali(df), 2015, 2014)
        voci = {v["codice"]: v for v in result["aumenti"]}
        assert voci["OTHCRIM"]["nota"] is not None
        assert voci["SWINCYB"]["insight_id"] == "truffe"
        assert voci["SWINCYB"]["nota"] is None


# ===================================================================
# build_variazione_regioni
# ===================================================================

def _make_df_regioni(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


class TestBuildVariazioneRegioni:
    def test_basic(self):
        df = _make_df_regioni([
            {"REF_AREA": "ITC4", "Territorio": "Lombardia", "Anno": 2023,
             "Delitti": 300000, "Popolazione": 10000000, "Tasso_per_1000": 30.0},
            {"REF_AREA": "ITC4", "Territorio": "Lombardia", "Anno": 2024,
             "Delitti": 330000, "Popolazione": 10000000, "Tasso_per_1000": 33.0},
        ])
        result = build_variazione_regioni(df, 2024)
        assert len(result) == 1
        assert result[0]["Territorio"] == "Lombardia"
        assert result[0]["variazione_pct"] == pytest.approx(10.0, abs=0.1)

    def test_ordine_decrescente(self):
        df = _make_df_regioni([
            {"REF_AREA": "ITC4", "Territorio": "Lombardia", "Anno": 2023,
             "Delitti": 300000, "Popolazione": 10000000, "Tasso_per_1000": 30.0},
            {"REF_AREA": "ITC4", "Territorio": "Lombardia", "Anno": 2024,
             "Delitti": 330000, "Popolazione": 10000000, "Tasso_per_1000": 33.0},
            {"REF_AREA": "ITE4", "Territorio": "Lazio", "Anno": 2023,
             "Delitti": 200000, "Popolazione": 5800000, "Tasso_per_1000": 34.48},
            {"REF_AREA": "ITE4", "Territorio": "Lazio", "Anno": 2024,
             "Delitti": 180000, "Popolazione": 5800000, "Tasso_per_1000": 31.03},
        ])
        result = build_variazione_regioni(df, 2024)
        assert result[0]["variazione_pct"] > result[-1]["variazione_pct"]

    def test_anno_precedente_mancante(self):
        df = _make_df_regioni([
            {"REF_AREA": "ITC4", "Territorio": "Lombardia", "Anno": 2024,
             "Delitti": 330000, "Popolazione": 10000000, "Tasso_per_1000": 33.0},
        ])
        result = build_variazione_regioni(df, 2024)
        assert len(result) == 0


# ===================================================================
# build_variazione_ripartizioni
# ===================================================================

class TestBuildVariazioneRipartizioni:
    def _make_regioni_rip(self, target_year: int) -> pd.DataFrame:
        """Crea dati minimi per le 3 ripartizioni (1 regione per ripartizione)."""
        rows = []
        # Nord: ITC4 (Lombardia)
        rows.append({"REF_AREA": "ITC4", "Territorio": "Lombardia",
                      "Anno": target_year - 1, "Delitti": 300000, "Popolazione": 10000000})
        rows.append({"REF_AREA": "ITC4", "Territorio": "Lombardia",
                      "Anno": target_year, "Delitti": 330000, "Popolazione": 10000000})
        # Centro: ITE4 (Lazio)
        rows.append({"REF_AREA": "ITE4", "Territorio": "Lazio",
                      "Anno": target_year - 1, "Delitti": 200000, "Popolazione": 5800000})
        rows.append({"REF_AREA": "ITE4", "Territorio": "Lazio",
                      "Anno": target_year, "Delitti": 190000, "Popolazione": 5800000})
        # Sud: ITF3 (Campania)
        rows.append({"REF_AREA": "ITF3", "Territorio": "Campania",
                      "Anno": target_year - 1, "Delitti": 150000, "Popolazione": 5800000})
        rows.append({"REF_AREA": "ITF3", "Territorio": "Campania",
                      "Anno": target_year, "Delitti": 155000, "Popolazione": 5800000})
        return pd.DataFrame(rows)

    def test_tre_ripartizioni(self):
        df = self._make_regioni_rip(2024)
        result = build_variazione_ripartizioni(df, 2024)
        assert len(result) == 3
        nomi = {r["ripartizione"] for r in result}
        assert nomi == {"Nord", "Centro", "Sud e Isole"}

    def test_valori_corretti(self):
        df = self._make_regioni_rip(2024)
        result = build_variazione_ripartizioni(df, 2024)
        nord = next(r for r in result if r["ripartizione"] == "Nord")
        # Lombardia: 330000/10M*1000 = 33.0, 300000/10M*1000 = 30.0
        assert nord["tasso_corrente"] == 33.0
        assert nord["tasso_precedente"] == 30.0
        assert nord["variazione_pct"] == 10.0

    def test_anno_mancante(self):
        # Solo anno corrente, manca precedente
        df = pd.DataFrame([
            {"REF_AREA": "ITC4", "Territorio": "Lombardia",
             "Anno": 2024, "Delitti": 330000, "Popolazione": 10000000},
        ])
        result = build_variazione_ripartizioni(df, 2024)
        assert len(result) == 0


# ===================================================================
# build_percezione
# ===================================================================

class TestBuildPercezione:
    def test_basic(self):
        df = pd.DataFrame([
            {"Anno": 2024, "Percezione_pct": 38.5, "Tasso_per_1000": 43.48},
        ])
        result = build_percezione(df, 2024)
        assert result is not None
        assert result["anno"] == 2024
        assert result["percezione_pct"] == 38.5
        assert result["tasso_delitti"] == 43.48

    def test_anno_mancante(self):
        df = pd.DataFrame([
            {"Anno": 2023, "Percezione_pct": 35.0, "Tasso_per_1000": 41.67},
        ])
        result = build_percezione(df, 2024)
        assert result is None

    def test_dataframe_vuoto(self):
        df = pd.DataFrame(columns=["Anno", "Percezione_pct", "Tasso_per_1000"])
        result = build_percezione(df, 2024)
        assert result is None


# ===================================================================
# build_reati_allarme
# ===================================================================

class TestBuildReatiAllarme:
    def _make_df_allarme(self, reati: list[tuple[str, float, float, int, int]]) -> pd.DataFrame:
        """Helper: (reato, tasso_prev, tasso_curr, delitti_prev, delitti_curr)."""
        rows = []
        for reato, t_prev, t_curr, d_prev, d_curr in reati:
            rows.append({"Reato": reato, "Anno": 2023, "Tasso_per_100k": t_prev, "Delitti": d_prev,
                         "Popolazione": 60_000_000})
            rows.append({"Reato": reato, "Anno": 2024, "Tasso_per_100k": t_curr, "Delitti": d_curr,
                         "Popolazione": 60_000_000})
        return pd.DataFrame(rows)

    def test_basic(self):
        df = self._make_df_allarme([
            ("Furti in abitazione", 200.0, 210.0, 120000, 126000),
            ("Rapine", 50.0, 45.0, 30000, 27000),
        ])
        result = build_reati_allarme(df, 2024)
        assert len(result) == 2

    def test_ordine_per_abs_variazione(self):
        df = self._make_df_allarme([
            ("Furti in abitazione", 200.0, 210.0, 120000, 126000),  # +5%
            ("Rapine", 50.0, 35.0, 30000, 21000),  # -30%
        ])
        result = build_reati_allarme(df, 2024)
        # Rapine ha |variazione| maggiore -> prima
        assert result[0]["reato"] == "Rapine"

    def test_anno_mancante(self):
        df = pd.DataFrame([
            {"Reato": "Furti in abitazione", "Anno": 2022, "Tasso_per_100k": 200.0, "Delitti": 120000,
             "Popolazione": 60_000_000},
        ])
        result = build_reati_allarme(df, 2024)
        assert len(result) == 0

    def test_tasso_zero_prev(self):
        df = self._make_df_allarme([
            ("Reato raro", 0.0, 5.0, 0, 3000),
        ])
        result = build_reati_allarme(df, 2024)
        assert len(result) == 1
        assert result[0]["variazione_pct"] == 0  # division by zero -> 0

    def test_variazione_corretta(self):
        df = self._make_df_allarme([
            ("Rapine", 100.0, 120.0, 60000, 72000),
        ])
        result = build_reati_allarme(df, 2024)
        assert result[0]["variazione_pct"] == 20.0
        assert result[0]["delitti_corrente"] == 72000

    def test_variazione_su_valori_esatti(self):
        # Tassi arrotondati 0,57 -> 0,54 darebbero -5,3%; i delitti 341 -> 326 danno -4,4%
        df = self._make_df_allarme([
            ("Omicidi", 0.57, 0.54, 341, 326),
        ])
        result = build_reati_allarme(df, 2024)
        assert result[0]["variazione_pct"] == -4.4


# ===================================================================
# _build_contesto
# ===================================================================

def _make_series(values: list[int], start_year: int = 2014) -> tuple[np.ndarray, np.ndarray]:
    """Helper: ritorna (series, anni) da una lista di valori."""
    anni = np.arange(start_year, start_year + len(values))
    return np.array(values, dtype=float), anni


class TestBuildContesto:
    def test_trend_uguale_con_e_senza_covid(self):
        series, anni = _make_series(list(range(100, 111)))
        assert _build_contesto("increasing", series, anni) is None

    def test_sensibile_covid(self):
        # La serie completa e' in crescita, quella senza COVID (passata come trend) no
        series, anni = _make_series(list(range(100, 111)))
        result = _build_contesto("no trend", series, anni)
        assert result is not None and "COVID" in result

    def test_serie_corta(self):
        series, anni = _make_series([18921, 19500, 21911], start_year=2022)
        assert _build_contesto(None, series, anni) is None


class TestTrendStrutturale:
    def test_tre_anni_nessuna_tendenza(self):
        series, anni = _make_series([18921, 19500, 21911], start_year=2022)
        assert _trend_strutturale_with_covid(series, anni) is None

    def test_soglia_senza_anni_covid(self):
        # 2014-2024 sono 9 anni fuori dal COVID, 2016-2024 solo 7
        series, anni = _make_series(list(range(100, 111)))
        assert _trend_strutturale_with_covid(series, anni) == "increasing"
        assert _trend_strutturale_with_covid(series[2:], anni[2:]) is None


# ===================================================================
# _build_caveat
# ===================================================================

class TestBuildCaveat:
    def test_bassa_aumento(self):
        result = _build_caveat("SWINCYB", 73980)
        assert result.startswith("La propensione alla denuncia per questo reato è bassa:")
        assert "emersione" in result

    def test_segue_la_differenza_non_la_tendenza(self):
        # Truffe in calo nell'anno: l'avviso parla del calo, anche se la serie e' in crescita
        result = _build_caveat("SWINCYB", -15934)
        assert "non implica necessariamente" in result

    def test_molto_bassa(self):
        result = _build_caveat("RAPE", 100)
        assert "è molto bassa:" in result

    def test_media_misto(self):
        result = _build_caveat("THEFT", 33483)
        assert "propensione alla denuncia" in result

    def test_alta_nessun_avviso(self):
        assert _build_caveat("BANKROB", -5) is None

    def test_non_applicabile(self):
        assert _build_caveat("INTENHOM", -5) is None

    def test_codice_senza_propensione(self):
        assert _build_caveat("SMUGGL", -37) is None
