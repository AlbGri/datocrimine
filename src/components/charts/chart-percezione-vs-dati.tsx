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
} from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
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

  const varPercezione =
    data[data.length - 1].Percezione_pct - data[0].Percezione_pct;
  const varTasso =
    data[data.length - 1].Tasso_per_1000 - data[0].Tasso_per_1000;

  const percezioni = data.map((d) => d.Percezione_pct);
  const idxMaxPercezione = percezioni.indexOf(Math.max(...percezioni));

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="block">
          <strong>Divario percezione-dati:</strong> la percezione di insicurezza non &egrave; &quot;sbagliata&quot; - risponde a fattori legittimi come copertura mediatica, degrado urbano, sfiducia istituzionale. Percezione e delitti denunciati seguono dinamiche diverse.
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
              line: { color: COLORS.secondary, width: 3 },
              marker: { size: 8 },
              yaxis: "y",
            },
            {
              x: anni,
              y: data.map((d) => d.Tasso_per_1000),
              mode: "lines+markers" as const,
              name: "Tasso delitti per 1000 ab.",
              line: { color: COLORS.primary, width: 3, dash: "dash" as const },
              marker: { size: 8 },
              yaxis: "y2",
            },
          ]}
          layout={{
            xaxis: { ...AXIS_FIXED, title: { text: "Anno" } },
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

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="py-2 sm:pt-4 sm:pb-2 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">Delta Percezione 2014-2024</p>
            <p className="text-lg sm:text-2xl font-bold">{varPercezione.toFixed(1)} punti %</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 sm:pt-4 sm:pb-2 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">Delta Tasso delitti denunciati</p>
            <p className="text-lg sm:text-2xl font-bold">{varTasso.toFixed(1)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">per 1.000 ab.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 sm:pt-4 sm:pb-2 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">Anno percezione max</p>
            <p className="text-lg sm:text-2xl font-bold">{anni[idxMaxPercezione]}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
