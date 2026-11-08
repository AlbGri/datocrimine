"""
Test per le funzioni di analisi statistica in generate_insights.py.

Testa funzioni pure (no I/O) su edge case e casi standard.
Esecuzione: python -m pytest scripts/tests/ -v
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Aggiunge scripts/ al path per import diretto
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generate_insights import (
    apply_fdr,
    calc_cv,
    calc_max_jump,
    calc_monotonicity,
    calc_zscore_last,
    analyze_series,
    is_tautological_pair,
    interpret_with_propensione,
    score_candidates,
)


# ===================================================================
# is_tautological_pair
# ===================================================================

class TestIsTautologicalPair:
    def test_tot_vs_any(self):
        assert is_tautological_pair("TOT", "THEFT") is True
        assert is_tautological_pair("ROBBERY", "TOT") is True

    def test_parent_child(self):
        assert is_tautological_pair("THEFT", "BAGTHEF") is True
        assert is_tautological_pair("BAGTHEF", "THEFT") is True

    def test_siblings(self):
        assert is_tautological_pair("BAGTHEF", "PICKTHEF") is True
        assert is_tautological_pair("MAFIAHOM", "ROBBHOM") is True

    def test_unrelated(self):
        assert is_tautological_pair("THEFT", "ROBBER") is False
        assert is_tautological_pair("DRUG", "RAPE") is False

    def test_voci_autonome(self):
        # Nomi simili ma voci distinte nel totale ISTAT
        assert is_tautological_pair("ARSON", "DAMARS") is False
        assert is_tautological_pair("RAPE", "RAPEUN18") is False
        assert is_tautological_pair("INTENHOM", "INFANTHOM") is False

    def test_sottotipi_singoli(self):
        assert is_tautological_pair("ARSON", "FOREARS") is True
        assert is_tautological_pair("UNINTHOM", "ROADHOM") is True
        assert is_tautological_pair("TERRORHOM", "MAFIAHOM") is True

    def test_cross_hierarchy(self):
        # Figli di genitori diversi non sono tautologici
        assert is_tautological_pair("BAGTHEF", "STREETROB") is False
        assert is_tautological_pair("MAFIAHOM", "RAPEUN18") is False

    def test_same_code(self):
        # Stesso codice: non coperto esplicitamente come tautologico,
        # ma correlazione = 1.0 sarebbe filtrata altrove
        assert is_tautological_pair("DRUG", "DRUG") is False

    def test_tot_vs_tot(self):
        assert is_tautological_pair("TOT", "TOT") is True


# ===================================================================
# interpret_with_propensione
# ===================================================================

class TestInterpretWithPropensione:
    def test_increasing_bassa(self):
        assert interpret_with_propensione("increasing", "bassa") == "emersione_probabile"
        assert interpret_with_propensione("increasing", "molto_bassa") == "emersione_probabile"

    def test_increasing_alta(self):
        assert interpret_with_propensione("increasing", "alta") == "aumento_reale_probabile"

    def test_increasing_media(self):
        assert interpret_with_propensione("increasing", "media") == "aumento_misto"

    def test_decreasing_alta(self):
        assert interpret_with_propensione("decreasing", "alta") == "calo_reale_probabile"

    def test_decreasing_bassa(self):
        assert interpret_with_propensione("decreasing", "bassa") == "calo_ambiguo"

    def test_decreasing_media(self):
        assert interpret_with_propensione("decreasing", "media") == "calo_misto"

    def test_non_applicabile(self):
        result = interpret_with_propensione("increasing", "non_applicabile_automatica")
        assert result == "interpretazione_non_applicabile"

    def test_none_propensione(self):
        assert interpret_with_propensione("increasing", None) == ""

    def test_no_trend(self):
        assert interpret_with_propensione("no trend", "alta") == ""

    def test_empty_propensione(self):
        # Stringa vuota non e' None ne' "non_applicabile": cade nel ramo media
        assert interpret_with_propensione("increasing", "") == "aumento_misto"


# ===================================================================
# calc_zscore_last
# ===================================================================

class TestCalcZscoreLast:
    def test_normal_series(self):
        # Ultimo valore = media, z-score atteso ~ 0
        s = np.array([10.0, 12.0, 11.0, 10.0, 11.0])
        result = calc_zscore_last(s)
        assert abs(result["zscore_last"]) < 1.0
        assert result["last_value"] == 11.0

    def test_outlier_high(self):
        # Serie con varianza non nulla nei primi n-1 valori
        s = np.array([10.0, 11.0, 10.0, 11.0, 50.0])
        result = calc_zscore_last(s)
        assert result["zscore_last"] > 3.0

    def test_outlier_low(self):
        s = np.array([50.0, 49.0, 50.0, 49.0, 10.0])
        result = calc_zscore_last(s)
        assert result["zscore_last"] < -3.0

    def test_too_short(self):
        s = np.array([10.0, 20.0])
        result = calc_zscore_last(s)
        assert np.isnan(result["zscore_last"])

    def test_constant_series(self):
        s = np.array([5.0, 5.0, 5.0, 5.0, 5.0])
        result = calc_zscore_last(s)
        assert result["zscore_last"] == 0.0

    def test_single_element(self):
        s = np.array([42.0])
        result = calc_zscore_last(s)
        assert np.isnan(result["zscore_last"])


# ===================================================================
# calc_cv
# ===================================================================

class TestCalcCv:
    def test_zero_mean(self):
        s = np.array([-1.0, 1.0, -1.0, 1.0])
        assert calc_cv(s) == 0.0

    def test_constant(self):
        s = np.array([5.0, 5.0, 5.0])
        assert calc_cv(s) == 0.0

    def test_positive_cv(self):
        s = np.array([10.0, 20.0, 30.0])
        cv = calc_cv(s)
        assert cv > 0
        assert cv < 1  # CV ragionevole

    def test_high_variation(self):
        s = np.array([1.0, 100.0, 1.0, 100.0])
        assert calc_cv(s) > 0.5


# ===================================================================
# calc_monotonicity
# ===================================================================

class TestCalcMonotonicity:
    def test_perfectly_increasing(self):
        s = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        assert calc_monotonicity(s) == 1.0

    def test_perfectly_decreasing(self):
        s = np.array([5.0, 4.0, 3.0, 2.0, 1.0])
        assert calc_monotonicity(s) == 1.0

    def test_alternating(self):
        s = np.array([1.0, 5.0, 1.0, 5.0, 1.0])
        assert calc_monotonicity(s) == 0.5

    def test_single_element(self):
        s = np.array([42.0])
        assert calc_monotonicity(s) == 0.0

    def test_two_elements_up(self):
        s = np.array([1.0, 2.0])
        assert calc_monotonicity(s) == 1.0

    def test_mostly_increasing(self):
        # 4 up, 1 down = 4/5 = 0.8
        s = np.array([1.0, 2.0, 3.0, 2.5, 4.0, 5.0])
        assert calc_monotonicity(s) == pytest.approx(0.8)

    def test_flat(self):
        s = np.array([5.0, 5.0, 5.0, 5.0])
        assert calc_monotonicity(s) == 0.0


# ===================================================================
# calc_max_jump
# ===================================================================

class TestCalcMaxJump:
    def test_basic(self):
        s = np.array([10.0, 12.0, 11.0, 20.0])
        anni = np.array([2020, 2021, 2022, 2023])
        result = calc_max_jump(s, anni)
        assert result["max_jump_value"] == 9.0
        assert result["max_jump_year"] == 2023
        assert result["max_jump_direction"] == "up"

    def test_negative_jump(self):
        s = np.array([20.0, 5.0, 4.0, 3.0])
        anni = np.array([2020, 2021, 2022, 2023])
        result = calc_max_jump(s, anni)
        assert result["max_jump_value"] == 15.0
        assert result["max_jump_year"] == 2021
        assert result["max_jump_direction"] == "down"

    def test_single_element(self):
        s = np.array([42.0])
        anni = np.array([2020])
        result = calc_max_jump(s, anni)
        assert np.isnan(result["max_jump_value"])

    def test_two_elements(self):
        s = np.array([10.0, 15.0])
        anni = np.array([2020, 2021])
        result = calc_max_jump(s, anni)
        assert result["max_jump_value"] == 5.0
        assert result["max_jump_year"] == 2021

    def test_equal_jumps_takes_first(self):
        s = np.array([10.0, 20.0, 10.0])
        anni = np.array([2020, 2021, 2022])
        result = calc_max_jump(s, anni)
        assert result["max_jump_value"] == 10.0
        # argmax prende il primo
        assert result["max_jump_year"] == 2021


# ===================================================================
# analyze_series — test integrazione con gestione COVID
# ===================================================================

class TestAnalyzeSeries:
    def test_no_covid_years(self):
        s = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        anni = np.array([2007, 2008, 2009, 2010, 2011])
        result = analyze_series(s, anni)
        assert result["n_points"] == 5
        assert result["sensibile_covid"] is False
        assert result["first_value"] == 1.0
        assert result["total_change_pp"] == 4.0

    def test_with_covid_years(self):
        # Serie che include 2020-2021
        s = np.array([10, 11, 12, 13, 14, 2, 3, 15, 16, 17])
        anni = np.array([2014, 2015, 2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024])
        result = analyze_series(s, anni)
        assert result["n_points"] == 10
        assert result["n_points_clean"] == 8  # senza 2020, 2021

    def test_increasing_trend(self):
        s = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0])
        anni = np.array([2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014])
        result = analyze_series(s, anni)
        assert result["mk_trend"] == "increasing"
        assert result["mk_p"] < 0.05

    def test_sparkline(self):
        s = np.array([1.1111, 2.2222, 3.3333])
        anni = np.array([2020, 2021, 2022])
        result = analyze_series(s, anni)
        assert result["sparkline"] == [1.1, 2.2, 3.3]

    def test_short_series(self):
        s = np.array([1.0, 2.0, 3.0])
        anni = np.array([2020, 2021, 2022])
        result = analyze_series(s, anni)
        # Serie troppo corta per pulizia COVID (< MIN_DATA_POINTS dopo)
        assert result["n_points"] == 3


# ===================================================================
# apply_fdr
# ===================================================================

class TestApplyFdr:
    def _make_df(self, n: int, analysis_type: str, p_base: float = 0.01) -> pd.DataFrame:
        """Crea DataFrame di test con n righe."""
        return pd.DataFrame({
            "analysis_type": [analysis_type] * n,
            "mk_p": [p_base * (i + 1) for i in range(n)],
            "mk_trend": ["increasing"] * n,
        })

    def test_all_significant(self):
        df = self._make_df(5, "trend_nazionale_assoluto", p_base=0.001)
        result = apply_fdr(df)
        assert result["fdr_significant"].all()

    def test_none_significant(self):
        df = self._make_df(5, "trend_nazionale_assoluto", p_base=0.2)
        result = apply_fdr(df)
        assert not result["fdr_significant"].any()

    def test_nan_p_values_handled(self):
        df = pd.DataFrame({
            "analysis_type": ["divergenza_regionale"] * 3,
            "mk_p": [0.01, np.nan, 0.8],
            "mk_trend": ["increasing", "no trend", "no trend"],
        })
        result = apply_fdr(df)
        assert "mk_p_adjusted" in result.columns

    def test_multiple_families(self):
        df1 = self._make_df(3, "trend_nazionale_assoluto", p_base=0.001)
        df2 = self._make_df(3, "divergenza_regionale", p_base=0.3)
        df = pd.concat([df1, df2], ignore_index=True)
        result = apply_fdr(df)
        # Trend dovrebbe passare, divergenza no
        trend_mask = result["analysis_type"] == "trend_nazionale_assoluto"
        assert result.loc[trend_mask, "fdr_significant"].all()
        assert not result.loc[~trend_mask, "fdr_significant"].any()

    def test_empty_family(self):
        # Famiglia senza righe: non deve crashare
        df = self._make_df(3, "trend_nazionale_assoluto", p_base=0.01)
        result = apply_fdr(df)
        assert len(result) == 3


# ===================================================================
# score_candidates
# ===================================================================

class TestScoreCandidates:
    def _make_candidate_df(self, **overrides) -> pd.DataFrame:
        """Crea DataFrame minimo per score_candidates."""
        base = {
            "mk_p": 0.001,
            "mk_p_adjusted": 0.005,
            "mk_trend": "increasing",
            "total_change_pp": 10.0,
            "monotonicity": 0.8,
            "zscore_last": 2.0,
            "n_points": 15,
            "n_points_clean": 13,
            "fdr_significant": True,
            "anno_min": 2007,
            "anno_max": 2024,
            "analysis_type": "trend_nazionale_assoluto",
            "codice_reato": "THEFT",
        }
        base.update(overrides)
        return pd.DataFrame([base])

    def test_high_confidence(self):
        df = self._make_candidate_df(
            fdr_significant=True,
            monotonicity=0.8,
            n_points=15,
            n_points_clean=13,
        )
        result = score_candidates(df)
        assert result.iloc[0]["confidence"] == "high"

    def test_low_confidence_short_clean(self):
        # n_points_clean < 7 -> confidence forzata a low
        df = self._make_candidate_df(
            fdr_significant=True,
            monotonicity=0.9,
            n_points=15,
            n_points_clean=5,
        )
        result = score_candidates(df)
        assert result.iloc[0]["confidence"] == "low"

    def test_medium_confidence(self):
        df = self._make_candidate_df(
            fdr_significant=True,
            monotonicity=0.5,  # sotto 0.7 -> non high
            n_points=8,
            n_points_clean=8,
        )
        result = score_candidates(df)
        assert result.iloc[0]["confidence"] == "medium"

    def test_score_between_0_and_1(self):
        df = self._make_candidate_df()
        result = score_candidates(df)
        score = result.iloc[0]["score"]
        assert 0 <= score <= 1

    def test_known_events_annotated(self):
        df = self._make_candidate_df(anno_min=2015, anno_max=2020)
        result = score_candidates(df)
        events = result.iloc[0]["known_events"]
        assert "2016" in events
        assert "2020" in events

    def test_propensione_denuncia(self):
        df = self._make_candidate_df(codice_reato="RAPE")
        result = score_candidates(df)
        assert result.iloc[0]["propensione_denuncia"] == "molto_bassa"
        assert result.iloc[0]["interpretazione_propensione"] == "emersione_probabile"

    def test_sorted_by_score_desc(self):
        df = pd.concat([
            self._make_candidate_df(mk_p=0.9, mk_p_adjusted=0.9, total_change_pp=0.1),
            self._make_candidate_df(mk_p=0.001, mk_p_adjusted=0.001, total_change_pp=50.0),
        ], ignore_index=True)
        result = score_candidates(df)
        assert result.iloc[0]["score"] >= result.iloc[1]["score"]
