"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT_SMALL,
  PLOTLY_CONFIG,
  COVID_SHAPES,
  COVID_ANNOTATIONS,
  AXIS_FIXED,
} from "@/lib/config";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ReatoAllarme {
  Anno: number;
  Reato: string;
  Delitti: number;
  Popolazione: number;
  Tasso_per_100k: number;
}

const COLORI_ALLARME: Record<string, string> = {
  "Omicidi volontari consumati": COLORS.omicidi,
  "Tentati omicidi": COLORS.tentati_omicidi,
  "Violenze sessuali": COLORS.violenze_sessuali,
  "Atti sessuali con minorenne": COLORS.atti_minori,
  "Rapine in abitazione": COLORS.rapine_abitazione,
  "Sequestri di persona": COLORS.sequestri,
};

interface Props {
  reatoSelezionato: string;
}

export function ChartAllarmeTrendNazionale({ reatoSelezionato }: Props) {
  const { data, loading } = useFetchData<ReatoAllarme[]>(
    "/data/reati_allarme_sociale.json"
  );

  const traces = useMemo(() => {
    if (!data) return [];
    const reati = [...new Set(data.map((d) => d.Reato))];
    return reati.map((reato) => {
      const filtered = data
        .filter((d) => d.Reato === reato)
        .sort((a, b) => a.Anno - b.Anno);
      const isSelected = reato === reatoSelezionato;
      return {
        x: filtered.map((d) => d.Anno),
        y: filtered.map((d) => d.Tasso_per_100k),
        mode: "lines+markers" as const,
        name: reato,
        line: {
          width: isSelected ? 3 : 1.5,
          color: COLORI_ALLARME[reato] ?? "#999999",
        },
        marker: { size: isSelected ? 7 : 4 },
        opacity: isSelected ? 1 : 0.3,
      };
    });
  }, [data, reatoSelezionato]);

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  return (
    <ChartFullscreenWrapper ariaDescription={`Grafico trend nazionale reati allarme sociale 2014-2024, evidenziato: ${reatoSelezionato}`}>
      <Plot
        data={traces}
        layout={{
          dragmode: false as const,
          hovermode: "closest" as const,
          plot_bgcolor: "white",
          paper_bgcolor: "white",
          height: CHART_HEIGHT_SMALL,
          xaxis: { ...AXIS_FIXED, title: { text: "Anno" } },
          yaxis: { ...AXIS_FIXED, title: { text: "Tasso per 100k ab.", font: { size: 12 } } },
          legend: {
            x: 0,
            y: -0.25,
            xanchor: "left" as const,
            orientation: "h" as const,
            font: { size: 10 },
          },
          margin: { l: 50, r: 20, t: 20, b: 80 },
          shapes: COVID_SHAPES,
          annotations: COVID_ANNOTATIONS,
        }}
        config={PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
      />
    </ChartFullscreenWrapper>
  );
}
