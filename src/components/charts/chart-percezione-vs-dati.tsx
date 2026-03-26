"use client";

import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT,
  PLOTLY_CONFIG,
  COVID_SHAPES,
  COVID_ANNOTATIONS,
  AXIS_FIXED,
  getAxisYear,
} from "@/lib/config";
import { PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface PercezioneVsDati {
  Anno: number;
  Delitti: number;
  Popolazione: number;
  Tasso_per_1000: number;
  Percezione_pct: number;
}

export function ChartPercezioneVsDati() {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<PercezioneVsDati[]>(
    "/data/percezione_vs_dati.json"
  );

  if (loading) return <div className="h-[300px] sm:h-[450px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const anni = data.map((d) => d.Anno);


  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="block">
          <strong>Percezione e realt&agrave;:</strong> dal 2015 al 2020 entrambe le serie calano, dal 2021 risalgono. La correlazione &egrave; positiva, ma il nesso &egrave; incerto: la percezione &egrave; influenzata da copertura mediatica, clima politico e fattori locali che i dati aggregati non catturano.
        </AlertDescription>
      </Alert>

      <ChartFullscreenWrapper ariaDescription="Grafico percezione insicurezza vs tasso delitti denunciati dal 2014 al 2024: la percezione segue dinamiche diverse dai dati reali">
        <Plot
          data={[
            {
              x: anni,
              y: data.map((d) => d.Percezione_pct),
              mode: "lines+markers" as const,
              name: "Percezione insicurezza (%)",
              hovertemplate: "<b>Percezione insicurezza</b><br>Anno: %{x}<br>%{y:.1f}%<extra></extra>",
              line: { color: COLORS.secondary, width: 3 },
              marker: { size: 8 },
              yaxis: "y",
            },
            {
              x: anni,
              y: data.map((d) => d.Tasso_per_1000),
              mode: "lines+markers" as const,
              name: "Tasso delitti per 1000 ab.",
              hovertemplate: "<b>Tasso delitti</b><br>Anno: %{x}<br>%{y:.2f} per 1.000 ab.<extra></extra>",
              line: { color: COLORS.primary, width: 3, dash: "dash" as const },
              marker: { size: 8 },
              yaxis: "y2",
            },
          ]}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
            yaxis: { ...AXIS_FIXED,
              title: { text: "% Percezione rischio", font: { color: COLORS.secondary, size: 12 } },
              tickfont: { color: COLORS.secondary },
              side: "left",
            },
            yaxis2: { ...AXIS_FIXED,
              title: { text: "Tasso per 1000 ab.", font: { color: COLORS.primary, size: 12 } },
              tickfont: { color: COLORS.primary },
              overlaying: "y" as const,
              side: "right",
            },
            dragmode: false,
            hovermode: "closest" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: isMobile ? 300 : CHART_HEIGHT,
            margin: isMobile ? { l: 45, r: 45, t: 40, b: 60 } : { l: 50, r: 50, t: 30, b: 50 },
            legend: isMobile
              ? { x: 0.5, y: -0.3, xanchor: "center", yanchor: "top", orientation: "h" as const, font: { size: 9 } }
              : { x: 0.5, y: 1.08, xanchor: "center", orientation: "h" as const },
            shapes: COVID_SHAPES,
            annotations: [
              ...(isMobile
                ? COVID_ANNOTATIONS.map((a) => ({ ...a, y: 0.92, font: { ...a.font, size: 8 } }))
                : COVID_ANNOTATIONS),
              {
                x: 2015,
                y: 41.1,
                xref: "x" as const,
                yref: "y" as const,
                text: isMobile ? "+11 p.p." : "+11.1 p.p. sul 2014",
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowcolor: "#999",
                ax: isMobile ? 20 : 40,
                ay: isMobile ? -25 : -35,
                font: { size: isMobile ? 9 : 11, color: "#666" },
              },
            ],
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

    </div>
  );
}
