"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  COLORI_ALLARME,
  CHART_HEIGHT_SMALL,
  PLOTLY_CONFIG,
  COVID_SHAPES,
  COVID_ANNOTATIONS,
  AXIS_FIXED,
  getAxisYear,
} from "@/lib/config";
import { PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ReatoAllarme {
  Anno: number;
  Reato: string;
  Delitti: number;
  Popolazione: number;
  Tasso_per_100k: number;
}


type Metrica = "tasso" | "assoluto";

interface Props {
  reatoSelezionato: string;
}

export function ChartAllarmeTrendNazionale({ reatoSelezionato }: Props) {
  const isMobile = useIsMobile();
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const { data, loading } = useFetchData<ReatoAllarme[]>(
    "/data/reati_allarme_sociale.json"
  );

  const isAssoluto = metrica === "assoluto";

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
        y: filtered.map((d) => isAssoluto ? d.Delitti : d.Tasso_per_100k),
        mode: "lines+markers" as const,
        name: reato,
        hovertemplate: isAssoluto
          ? "<b>%{fullData.name}</b><br>Anno: %{x}<br>Delitti: %{y:,.0f}<extra></extra>"
          : "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:.2f} per 100k ab.<extra></extra>",
        line: {
          width: isSelected ? 3 : 1.5,
          color: COLORI_ALLARME[reato] ?? COLORS.grigioMedia,
        },
        marker: { size: isSelected ? 7 : 4 },
        opacity: isSelected ? 1 : 0.3,
      };
    });
  }, [data, reatoSelezionato, isAssoluto]);

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="allarme-naz-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="allarme-naz-metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="tasso">Tasso per 100k ab.</option>
            <option value="assoluto">Numero assoluto</option>
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper ariaDescription={`Grafico trend nazionale reati allarme sociale 2014-2024, evidenziato: ${reatoSelezionato}`}>
        <Plot
          key={metrica}
          data={traces}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            dragmode: false as const,
          hovermode: "closest" as const,
          plot_bgcolor: "white",
          paper_bgcolor: "white",
          height: CHART_HEIGHT_SMALL,
          xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
          yaxis: { ...AXIS_FIXED, title: { text: isAssoluto ? "Delitti denunciati" : "Tasso per 100k ab.", font: { size: 12 } }, ...(isAssoluto && { tickformat: "~s", hoverformat: ",.0f" }) },
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
    </div>
  );
}
