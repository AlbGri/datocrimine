"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { PLOTLY_CONFIG, AXIS_FIXED, COLORS } from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ReatiRecord {
  data_type: "OFFEND" | "VICTIM";
  codice_reato: string;
  reato: string;
  totale: number;
  stranieri: number;
  minori: number;
  pct_stranieri: number;
  pct_minori: number | null;
}

const MIN_CASI = 30;

export function ChartAutoriVsVittime() {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<ReatiRecord[]>(
    "/data/autori_vittime_reati.json"
  );

  const { reati, esclusi } = useMemo(() => {
    if (!data) return { reati: [], esclusi: 0 };
    const offend = new Map<string, ReatiRecord>();
    const victim = new Map<string, ReatiRecord>();
    for (const r of data) {
      if (r.data_type === "OFFEND") offend.set(r.codice_reato, r);
      else victim.set(r.codice_reato, r);
    }

    const common: { reato: string; autori: number; vittime: number; ratio: number }[] = [];
    let skip = 0;
    for (const [codice, o] of offend) {
      const v = victim.get(codice);
      if (!v) continue;
      if (o.totale < MIN_CASI && v.totale < MIN_CASI) { skip++; continue; }
      common.push({
        reato: o.reato,
        autori: o.totale,
        vittime: v.totale,
        ratio: v.totale > 0 ? o.totale / v.totale : 0,
      });
    }
    // Ordina per rapporto A/V crescente (vittima-centrico in alto, autore-centrico in basso)
    common.sort((a, b) => a.ratio - b.ratio);
    return { reati: common, esclusi: skip };
  }, [data]);

  if (loading)
    return <div className="h-[400px] sm:h-[600px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (reati.length === 0) return null;

  const nomi = reati.map((d) => d.reato);
  const ratios = reati.map((d) => d.ratio);

  const colors = ratios.map((r) => {
    if (r >= 1) return COLORS.primary;
    return COLORS.secondary;
  });

  const barHeight = isMobile ? 18 : 22;
  const chartHeight = Math.max(400, reati.length * barHeight + 80);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Rapporto tra autori denunciati e vittime per ogni reato (2022).
        Valori &gt; 1 indicano pi&ugrave; autori che vittime (tipico di reati con co-autori),
        valori &lt; 1 indicano pi&ugrave; vittime che autori identificati.
      </p>

      <ChartFullscreenWrapper ariaDescription="Grafico rapporto autori su vittime per tipo di reato, 2022">
        <Plot
          data={[
            {
              type: "bar",
              y: nomi,
              x: ratios,
              orientation: "h" as const,
              marker: { color: colors },
              text: ratios.map((r) => r.toFixed(2)),
              textposition: "outside" as const,
              hovertemplate:
                "<b>%{y}</b><br>Rapporto A/V: %{x:.2f}<br>" +
                "Autori: %{customdata[0]}<br>Vittime: %{customdata[1]}<extra></extra>",
              customdata: reati.map((d) => [
                d.autori.toLocaleString("it-IT"),
                d.vittime.toLocaleString("it-IT"),
              ]),
            },
          ]}
          layout={{
            xaxis: {
              ...AXIS_FIXED,
              title: { text: "Rapporto Autori / Vittime" },
              type: "log",
            },
            yaxis: {
              ...AXIS_FIXED,
              automargin: true,
              tickfont: { size: isMobile ? 9 : 11 },
            },
            height: chartHeight,
            margin: {
              l: isMobile ? 140 : 220,
              r: 60,
              t: 10,
              b: 40,
            },
            shapes: [
              {
                type: "line",
                x0: 1,
                x1: 1,
                y0: -0.5,
                y1: reati.length - 0.5,
                yref: "y",
                line: { color: "gray", width: 1.5, dash: "dash" },
              },
            ],
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      <p className="text-xs text-muted-foreground">
        Scala logaritmica. Linea tratteggiata = parit&agrave; (1 autore per 1 vittima).{" "}
        <span style={{ color: COLORS.secondary }}>Rosso</span>: pi&ugrave; vittime che autori.{" "}
        <span style={{ color: COLORS.primary }}>Blu</span>: pi&ugrave; autori che vittime.
        {esclusi > 0 && ` Esclusi ${esclusi} reati con meno di ${MIN_CASI} casi.`}
      </p>
    </div>
  );
}
