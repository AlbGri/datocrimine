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
    MIN_ABS_REPORT,
    SOGLIA_NUMERI_BASSI,
    _build_caveat,
    _build_contesto,
    _fix_accenti,
    build_executive_summary,
    build_percezione,
    build_reati_allarme,
    build_top_variazioni,
    build_variazione_regioni,
    build_variazione_ripartizioni,
)


# ===================================================================
# _fix_accenti
# ===================================================================

class TestFixAccenti:
    def test_apostrofo_fine_parola(self):
        assert _fix_accenti("criminalita' ") == "criminalità "
        assert _fix_accenti("proprieta' intellettuale") == "proprietà intellettuale"

    def test_vocali_diverse(self):
        # La funzione usa sempre accento grave (sufficiente per i nomi reati ISTAT)
        assert _fix_accenti("perche' ") == "perchè "
        assert _fix_accenti("cosi' ") == "così "
        assert _fix_accenti("pero' ") == "però "
        assert _fix_accenti("gioventu' ") == "gioventù "

    def test_fine_stringa(self):
        assert _fix_accenti("citta'") == "città"

    def test_punteggiatura(self):
        assert _fix_accenti("citta', paese") == "città, paese"
        assert _fix_accenti("citta'.") == "città."
        assert _fix_accenti("citta';") == "città;"
        assert _fix_accenti("citta':") == "città:"

    def test_apostrofo_legittimo(self):
        # d'arte non e' un accento
        assert _fix_accenti("opere d'arte") == "opere d'arte"
        assert _fix_accenti("Valle d'Aosta") == "Valle d'Aosta"

    def test_stringa_senza_apostrofi(self):
        assert _fix_accenti("Omicidi volontari") == "Omicidi volontari"

    def test_stringa_vuota(self):
        assert _fix_accenti("") == ""

    def test_multipli_accenti(self):
        assert _fix_accenti("citta' e civilta' ") == "città e civiltà "


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
        # media_storica = mean(40.0, 41.67) = 40.835
        assert result["media_storica"] == pytest.approx(40.84, abs=0.01)

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
# build_top_variazioni
# ===================================================================

def _make_df_avt(rows: list[dict]) -> pd.DataFrame:
    """Helper: crea DataFrame autori_vittime_trend con campi minimi."""
    return pd.DataFrame(rows)


class TestBuildTopVariazioni:
    def _base_rows(self, codice: str, reato: str, totali: list[tuple[int, int]]):
        """Genera righe OFFEND per un reato con lista (anno, totale)."""
        return [
            {"data_type": "OFFEND", "codice_reato": codice, "reato": reato,
             "anno": anno, "totale": tot}
            for anno, tot in totali
        ]

    def test_basic_crescita_calo(self):
        rows = (
            self._base_rows("THEFT", "Furti", [(2022, 500), (2023, 600), (2024, 900)])
            + self._base_rows("DRUG", "Stupefacenti", [(2022, 400), (2023, 300), (2024, 200)])
        )
        df = _make_df_avt(rows)
        crescita, calo = build_top_variazioni(df, 2024, n=5)
        assert len(crescita) >= 1
        assert len(calo) >= 1
        assert crescita[0]["codice"] == "THEFT"
        assert crescita[0]["yoy_pct"] > 0
        assert calo[0]["codice"] == "DRUG"
        assert calo[0]["yoy_pct"] < 0

    def test_exclude_tot(self):
        rows = self._base_rows("TOT", "Totale", [(2023, 1000), (2024, 2000)])
        df = _make_df_avt(rows)
        crescita, calo = build_top_variazioni(df, 2024)
        assert len(crescita) == 0
        assert len(calo) == 0

    def test_soglia_minima(self):
        # Entrambi i valori sotto MIN_ABS_REPORT
        rows = self._base_rows("MASSMURD", "Stragi", [(2023, 9), (2024, 18)])
        df = _make_df_avt(rows)
        crescita, calo = build_top_variazioni(df, 2024)
        assert len(crescita) == 0

    def test_soglia_superata_se_uno_sopra(self):
        # prev sotto, curr sopra -> max >= MIN_ABS_REPORT -> incluso
        rows = self._base_rows("ROBBER", "Rapine", [(2023, 50), (2024, MIN_ABS_REPORT + 50)])
        df = _make_df_avt(rows)
        crescita, calo = build_top_variazioni(df, 2024)
        assert len(crescita) == 1

    def test_anno_mancante_skip(self):
        rows = self._base_rows("THEFT", "Furti", [(2022, 500)])
        df = _make_df_avt(rows)
        crescita, calo = build_top_variazioni(df, 2024)
        assert len(crescita) == 0

    def test_ignora_victim(self):
        rows = [
            {"data_type": "VICTIM", "codice_reato": "THEFT", "reato": "Furti",
             "anno": 2023, "totale": 500},
            {"data_type": "VICTIM", "codice_reato": "THEFT", "reato": "Furti",
             "anno": 2024, "totale": 900},
        ]
        df = _make_df_avt(rows)
        crescita, calo = build_top_variazioni(df, 2024)
        assert len(crescita) == 0

    def test_top_n_limit(self):
        rows = []
        for i in range(10):
            rows += self._base_rows(
                f"R{i}", f"Reato {i}",
                [(2023, 200), (2024, 200 + (i + 1) * 50)],
            )
        df = _make_df_avt(rows)
        crescita, calo = build_top_variazioni(df, 2024, n=3)
        assert len(crescita) == 3

    def test_fix_accenti_applicata(self):
        rows = self._base_rows(
            "INTPROP", "Violazioni proprieta' intellettuale",
            [(2023, 200), (2024, 400)],
        )
        df = _make_df_avt(rows)
        crescita, _ = build_top_variazioni(df, 2024)
        assert crescita[0]["reato"] == "Violazioni proprietà intellettuale"


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
            rows.append({"Reato": reato, "Anno": 2023, "Tasso_per_100k": t_prev, "Delitti": d_prev})
            rows.append({"Reato": reato, "Anno": 2024, "Tasso_per_100k": t_curr, "Delitti": d_curr})
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
            {"Reato": "Furti in abitazione", "Anno": 2022, "Tasso_per_100k": 200.0, "Delitti": 120000},
        ])
        result = build_reati_allarme(df, 2024)
        assert len(result) == 0

    def test_tasso_zero_prev(self):
        df = self._make_df_allarme([
            ("Reato raro", 0.0, 5.0, 0, 300),
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


# ===================================================================
# _build_contesto
# ===================================================================

def _make_series(values: list[int], start_year: int = 2014) -> tuple[np.ndarray, np.ndarray]:
    """Helper: ritorna (series, anni) da una lista di valori."""
    anni = np.arange(start_year, start_year + len(values))
    return np.array(values, dtype=float), anni


class TestBuildContesto:
    def test_rimbalzo(self):
        # YoY positivo + trend decreasing -> rimbalzo
        series, anni = _make_series([100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 50])
        result = _build_contesto(100.0, "decreasing", 50, 10, series, anni, 2024)
        assert "Rimbalzo" in result

    def test_prosegue_crescita(self):
        series, anni = _make_series([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120])
        result = _build_contesto(20.0, "increasing", 120, 100, series, anni, 2024)
        assert "Prosegue il trend storico di crescita" in result

    def test_prosegue_calo(self):
        series, anni = _make_series([100, 90, 80, 70, 60, 50, 40, 30, 20, 15, 10])
        result = _build_contesto(-33.3, "decreasing", 10, 15, series, anni, 2024)
        assert "Prosegue il trend storico di calo" in result

    def test_frenata(self):
        series, anni = _make_series([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 95])
        result = _build_contesto(-5.0, "increasing", 95, 100, series, anni, 2024)
        assert "Frenata" in result

    def test_picco_stabile(self):
        series, anni = _make_series([50, 52, 48, 51, 49, 50, 52, 48, 51, 49, 60])
        result = _build_contesto(22.4, "no trend", 60, 49, series, anni, 2024)
        assert "Picco" in result

    def test_calo_stabile(self):
        series, anni = _make_series([50, 52, 48, 51, 49, 50, 52, 48, 51, 49, 40])
        result = _build_contesto(-18.4, "no trend", 40, 49, series, anni, 2024)
        assert "Calo su un trend storico stabile" in result

    def test_numeri_bassi(self):
        series, anni = _make_series([200, 180, 160, 140, 120])
        result = _build_contesto(-14.3, "decreasing", 120, 140, series, anni, 2018)
        assert "numeri assoluti contenuti" in result
        assert "120" in result

    def test_numeri_alti_no_caveat(self):
        series, anni = _make_series([600, 650, 700, 750, 800])
        result = _build_contesto(6.7, "increasing", 800, 750, series, anni, 2018)
        assert "numeri assoluti" not in result

    def test_soglia_numeri_bassi_esatta(self):
        # Valore esattamente a soglia -> non segnalato
        series, anni = _make_series([400, 450, SOGLIA_NUMERI_BASSI])
        result = _build_contesto(11.1, "increasing", SOGLIA_NUMERI_BASSI, 450, series, anni, 2016)
        assert "numeri assoluti" not in result

    def test_post_covid_2022(self):
        series, anni = _make_series([100, 110, 120, 130, 140, 150, 160, 170, 180])
        result = _build_contesto(5.9, "increasing", 180, 170, series, anni, 2022)
        assert "post-COVID" in result

    def test_no_post_covid_2024(self):
        series, anni = _make_series([100, 110, 120, 130, 140, 150, 160, 170, 180])
        result = _build_contesto(5.9, "increasing", 180, 170, series, anni, 2024)
        assert "post-COVID" not in result

    def test_sensibile_covid(self):
        # Serie dove COVID cambia il trend: crescente senza COVID, stabile/decrescente con
        # Pre-COVID crescente, COVID crollo, post-COVID ripresa parziale
        series = np.array([100, 120, 140, 160, 50, 60, 170, 180, 190, 200, 210], dtype=float)
        anni = np.arange(2014, 2025)
        # Trend senza COVID (esclude 2020-2021): 100,120,140,160,170,180,190,200,210 -> increasing
        # Trend con COVID: 100,120,140,160,50,60,170,180,190,200,210 -> potrebbe divergere
        result = _build_contesto(5.0, "increasing", 210, 200, series, anni, 2024)
        # Il test verifica che la funzione non crashi; se i trend coincidono, niente nota
        assert result.endswith(".")

    def test_termina_con_punto(self):
        series, anni = _make_series([100, 200])
        result = _build_contesto(100.0, "increasing", 200, 100, series, anni, 2015)
        assert result.endswith(".")


# ===================================================================
# _build_caveat
# ===================================================================

class TestBuildCaveat:
    def test_propensione_bassa_crescita(self):
        # CP612BIS: molto_bassa, trend increasing -> emersione_probabile
        result = _build_caveat("CP612BIS", "increasing", 10.0)
        assert result is not None
        assert "emersione" in result

    def test_propensione_bassa_calo(self):
        # RAPE: molto_bassa, trend decreasing -> calo_ambiguo
        result = _build_caveat("RAPE", "decreasing", -10.0)
        assert result is not None
        assert "non implica necessariamente" in result

    def test_propensione_media_misto(self):
        # BAGTHEF: media, trend increasing -> aumento_misto
        result = _build_caveat("BAGTHEF", "increasing", 13.4)
        assert result is not None
        assert "propensione alla denuncia" in result

    def test_propensione_alta_no_caveat(self):
        # BANKROB: alta, trend decreasing -> calo_reale_probabile -> nessun caveat
        result = _build_caveat("BANKROB", "decreasing", -5.0)
        assert result is None

    def test_propensione_non_applicabile(self):
        # INTENHOM: non_applicabile_automatica -> nessun caveat
        result = _build_caveat("INTENHOM", "decreasing", -5.0)
        assert result is None

    def test_codice_sconosciuto(self):
        result = _build_caveat("CODICE_INESISTENTE", "increasing", 10.0)
        assert result is None

    def test_insight_non_nel_caveat(self):
        # Il link insight e' gestito dal campo insight_id, non dal caveat
        # KIDNAPP: no propensione, ha insight -> caveat deve essere None
        result = _build_caveat("KIDNAPP", "decreasing", -7.9)
        assert result is None

    def test_propensione_molto_bassa_no_trend_yoy_positivo(self):
        # CP572: molto_bassa, trend "no trend" ma YoY +15.8% -> usa direzione YoY
        result = _build_caveat("CP572", "no trend", 15.8)
        assert result is not None
        assert "emersione" in result

    def test_propensione_molto_bassa_no_trend_yoy_negativo(self):
        # PORNO: molto_bassa, trend "no trend" ma YoY -10% -> calo_ambiguo
        result = _build_caveat("PORNO", "no trend", -10.0)
        assert result is not None
        assert "non implica necessariamente" in result

    def test_no_insight_no_propensione(self):
        # SMUGGL: non in PROPENSIONE_DENUNCIA, non in CODICE_TO_INSIGHT_ID
        result = _build_caveat("SMUGGL", "decreasing", -37.0)
        assert result is None

    def test_caveat_termina_con_punto(self):
        result = _build_caveat("CP612BIS", "increasing", 10.0)
        assert result is not None
        assert result.endswith(".")


# ===================================================================
# build_top_variazioni: campi contesto/caveat/insight_id
# ===================================================================

class TestBuildTopVariazioniNarrativi:
    def _base_rows(self, codice: str, reato: str, totali: list[tuple[int, int]]):
        return [
            {"data_type": "OFFEND", "codice_reato": codice, "reato": reato,
             "anno": anno, "totale": tot}
            for anno, tot in totali
        ]

    def test_campi_presenti(self):
        rows = self._base_rows("THEFT", "Furti", [(2022, 500), (2023, 600), (2024, 900)])
        df = pd.DataFrame(rows)
        crescita, _ = build_top_variazioni(df, 2024)
        assert len(crescita) >= 1
        r = crescita[0]
        assert "contesto" in r
        assert "caveat" in r
        assert "insight_id" in r
        assert isinstance(r["contesto"], str)
        assert len(r["contesto"]) > 0

    def test_insight_id_corretto(self):
        rows = self._base_rows("BANKROB", "Rapine in banca", [(2022, 200), (2023, 300), (2024, 400)])
        df = pd.DataFrame(rows)
        crescita, _ = build_top_variazioni(df, 2024)
        assert crescita[0]["insight_id"] == "rapine-banca"

    def test_insight_id_null_se_non_mappato(self):
        rows = self._base_rows("SMUGGL", "Contrabbando", [(2022, 500), (2023, 400), (2024, 200)])
        df = pd.DataFrame(rows)
        _, calo = build_top_variazioni(df, 2024)
        assert calo[0]["insight_id"] is None
