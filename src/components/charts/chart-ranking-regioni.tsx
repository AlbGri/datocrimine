"use client";

import { useFetchData } from "@/lib/use-fetch-data";
import {
  PLOTLY_CONFIG,
  AXIS_FIXED,
  COLORS,
  CHART_HEIGHT_RANKING,
  CHART_HEIGHT_RANKING_MOBILE,
  MEDIA_ANNOTATION_FONT,
  SCALA_SEQ,
  COLORE_BORDO,
  CLASSI_TASSO_REGIONI,
  classeDi,
} from "@/lib/config";
import { fmtNum, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { Plot } from "@/components/charts/plot";

interface DelittiRegione {
  REF_AREA: string;
  Territorio: string;
  Anno: number;
  Delitti: number;
  Popolazione: number;
  Tasso_per_1000: number;
}

interface Props {
  anno: number;
}

export function ChartRankingRegioni({ anno }: Props) {
  const isMobile = useIsMobile();
  const { data, loading } = useFetchData<DelittiRegione[]>(
    "/data/delitti_regioni.json"
  );

  if (loading)
    return <div className="h-[400px] sm:h-[500px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  const dataAnno = data.filter((d) => d.Anno === anno);
  const sorted = [...dataAnno].sort((a, b) => a.Tasso_per_1000 - b.Tasso_per_1000);

  const nomi = sorted.map((d) => d.Territorio);
  const tassi = sorted.map((d) => d.Tasso_per_1000);
  // Asse uguale per tutti gli anni, cosi' gli anni restano confrontabili
  const tassoMax = Math.max(...data.map((d) => d.Tasso_per_1000));
  const media =
    dataAnno.reduce((s, d) => s + d.Delitti, 0) /
    dataAnno.reduce((s, d) => s + d.Popolazione, 0) *
    1000;

  // Barre nel colore della serie (quelle chiare della scala sparirebbero sul fondo); il quadratino
  // fra nome e barra ha il colore della regione nella mappa, per ritrovarla
  const quadratini = sorted.map((d) => ({
    type: "rect" as const,
    xref: "paper" as const,
    xsizemode: "pixel" as const,
    xanchor: 0,
    x0: -15,
    x1: -5,
    yref: "y" as const,
    ysizemode: "pixel" as const,
    yanchor: d.Territorio,
    y0: -5,
    y1: 5,
    fillcolor: SCALA_SEQ[classeDi(d.Tasso_per_1000, CLASSI_TASSO_REGIONI)],
    line: { color: COLORE_BORDO, width: 1 },
  }));
  // Spazio per il quadratino fra nome e barra (i tipi di Plotly non hanno ancora ticklabelstandoff)
  const yaxis = { ...AXIS_FIXED, automargin: true, ticklabelstandoff: 20 };

  return (
    <ChartFullscreenWrapper ariaDescription={`Classifica regioni per tasso delitti denunciati per 1.000 abitanti, anno ${anno}`}>
      <Plot
        data={[
          {
            type: "bar",
            y: nomi,
            x: tassi,
            orientation: "h" as const,
            marker: { color: COLORS.primary },
            text: tassi.map((t) => fmtNum(t, 1)),
            textposition: "outside" as const,
            // sul telefono il valore della barra piu' lunga uscirebbe tagliato
            cliponaxis: false,
            hovertemplate: "<b>%{y}</b><br>Tasso: %{x:.1f} per 1000 ab.<extra></extra>",
          },
        ]}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          xaxis: { ...AXIS_FIXED,
            title: { text: "Tasso per 1000 ab." },
            range: [0, tassoMax * 1.15],
          },
          yaxis,
          shapes: [
            ...quadratini,
            {
              type: "line",
              x0: media,
              x1: media,
              y0: -0.5,
              y1: nomi.length - 0.5,
              line: { color: COLORS.mediaNazionale, width: 2, dash: "dash" },
            },
          ],
          annotations: [
            {
              x: media,
              y: nomi.length - 0.5,
              text: `Media: ${fmtNum(media, 1)}`,
              showarrow: false,
              font: MEDIA_ANNOTATION_FONT,
              xanchor: "left",
              yanchor: "bottom",
              xshift: 4,
            },
          ],
          height: isMobile ? CHART_HEIGHT_RANKING_MOBILE : CHART_HEIGHT_RANKING,
          margin: { l: isMobile ? 120 : 180, r: 50, t: 10, b: 40 },
          dragmode: false,
          plot_bgcolor: "rgba(0,0,0,0)",
          paper_bgcolor: "rgba(0,0,0,0)",
        }}
        config={PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
      />
    </ChartFullscreenWrapper>
  );
}
