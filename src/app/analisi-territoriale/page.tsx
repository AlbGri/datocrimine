"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pause, Play } from "lucide-react";
import { ChartMappaRegioni } from "@/components/charts/chart-mappa-regioni";
import { ChartRankingRegioni } from "@/components/charts/chart-ranking-regioni";
import { ChartTrendRegione } from "@/components/charts/chart-trend-regione";
import { ChartTabellaProvince } from "@/components/charts/chart-tabella-province";
import { ChartTrendProvincia } from "@/components/charts/chart-trend-provincia";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

const ANNI = Array.from({ length: 11 }, (_, i) => 2014 + i);
const PLAY_INTERVAL_MS = 1500;

export default function AnalisiTerritoriale() {
  const [anno, setAnno] = useState(2024);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    setPlaying(true);
    setAnno(ANNI[0]);
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx++;
      if (idx >= ANNI.length) {
        stopPlay();
        return;
      }
      setAnno(ANNI[idx]);
    }, PLAY_INTERVAL_MS);
  }, [stopPlay]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlay();
    } else {
      startPlay();
    }
  }, [playing, stopPlay, startPlay]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold">
          Analisi Territoriale
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Selezione anno">
          <button
            onClick={togglePlay}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label={playing ? "Pausa animazione anni" : "Avvia animazione anni"}
          >
            {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </button>
          {ANNI.map((a) => (
            <button
              key={a}
              onClick={() => {
                stopPlay();
                setAnno(a);
              }}
              aria-pressed={anno === a}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                anno === a
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <hr />

      <CollapsibleSection
        title={`Mappa Regionale (${anno})`}
        description="Distribuzione territoriale dei delitti denunciati"
        defaultOpen
      >
        <ChartMappaRegioni anno={anno} />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title={`Ranking Regionale (${anno})`}
        description="Classifica regioni per tasso di delitti denunciati"
      >
        <ChartRankingRegioni anno={anno} />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title="Trend Regionale (2014-2024)"
        description="Andamento temporale per singola regione"
      >
        <ChartTrendRegione />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title={`Dati Provinciali (${anno})`}
        description="Tabella con dati per provincia e variazioni temporali"
      >
        <ChartTabellaProvince anno={anno} />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title="Trend Provinciale (2014-2024)"
        description="Andamento temporale per singola provincia"
      >
        <ChartTrendProvincia />
      </CollapsibleSection>
    </main>
  );
}
