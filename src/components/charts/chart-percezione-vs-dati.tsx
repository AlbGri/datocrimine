"use client";

import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT,
  PLOTLY_FONT,
  COVID_SHAPES,
  getCovidAnnotations,
  AXIS_FIXED,
  getAxisYear,
  getLegendMultiSeries,
  ANNO_PRIMO,
  ANNO_ULTIMO,
} from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plot } from "@/components/charts/plot";
import { fmtSigned } from "@/lib/format";

// Salto della percezione, probabilmente un cambio di metodo ISTAT
const ANNO_SALTO = 2015;

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
  const salto = data.find((d) => d.Anno === ANNO_SALTO);
  const primaDelSalto = data.find((d) => d.Anno === ANNO_SALTO - 1);

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="block">
          Dal 2015 al 2020 entrambe le serie calano, dal 2021 risalgono. La correlazione &egrave; positiva, ma il nesso &egrave; incerto. Sulla percezione pesano anche il clima politico e fattori locali che i dati aggregati non catturano.
        </AlertDescription>
      </Alert>

      <Plot
          descrizione={`Grafico percezione insicurezza vs tasso delitti denunciati dal ${ANNO_PRIMO} al ${ANNO_ULTIMO}: dal 2015 al 2020 entrambe le serie calano, dal 2021 risalgono`}
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
            xaxis: getAxisYear(isMobile),
            yaxis: { ...AXIS_FIXED,
              title: { text: "% Percezione rischio", font: { color: COLORS.secondary, size: PLOTLY_FONT.axisTitle } },
              tickfont: { color: COLORS.secondary },
              side: "left",
            },
            yaxis2: { ...AXIS_FIXED,
              title: { text: "Tasso per 1000 ab.", font: { color: COLORS.primary, size: PLOTLY_FONT.axisTitle } },
              tickfont: { color: COLORS.primary },
              overlaying: "y" as const,
              side: "right",
            },
            hovermode: "closest" as const,
            height: isMobile ? 300 : CHART_HEIGHT,
            margin: isMobile ? { l: 45, r: 45, t: 40, b: 60 } : { l: 50, r: 50, t: 30, b: 50 },
            legend: getLegendMultiSeries(isMobile),
            shapes: COVID_SHAPES,
            annotations: [
              ...getCovidAnnotations(isMobile),
              ...(salto && primaDelSalto ? [{
                x: ANNO_SALTO,
                y: salto.Percezione_pct,
                xref: "x" as const,
                yref: "y" as const,
                text: `${fmtSigned(salto.Percezione_pct - primaDelSalto.Percezione_pct, isMobile ? 0 : 1)} p.p.${isMobile ? "" : ` sul ${ANNO_SALTO - 1}`}`,
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowcolor: COLORS.grigioTesto,
                ax: isMobile ? 20 : 40,
                ay: isMobile ? -25 : -35,
                font: { size: isMobile ? PLOTLY_FONT.tickMobile : PLOTLY_FONT.tick, color: COLORS.grigioTesto },
              }] : []),
            ],
          }}
        />

    </div>
  );
}
