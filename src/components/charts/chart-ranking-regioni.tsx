"use client";

import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { PLOTLY_CONFIG, AXIS_FIXED, COLORS } from "@/lib/config";
import { fmtNum, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

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
  const media =
    dataAnno.reduce((s, d) => s + d.Delitti, 0) /
    dataAnno.reduce((s, d) => s + d.Popolazione, 0) *
    1000;

  const colors = tassi.map((t) => {
    const ratio = Math.min(t / 100, 1);
    const gray = Math.round(245 - ratio * 210);
    return `rgb(${gray},${gray},${gray})`;
  });

  return (
    <ChartFullscreenWrapper ariaDescription={`Classifica regioni per tasso delitti denunciati per 1.000 abitanti, anno ${anno}`}>
      <Plot
        data={[
          {
            type: "bar",
            y: nomi,
            x: tassi,
            orientation: "h" as const,
            marker: { color: colors },
            text: tassi.map((t) => fmtNum(t, 1)),
            textposition: "outside" as const,
            hovertemplate: "<b>%{y}</b><br>Tasso: %{x:.1f} per 1000 ab.<extra></extra>",
          },
        ]}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          xaxis: { ...AXIS_FIXED,
            title: { text: "Tasso per 1000 ab." },
            range: [0, Math.max(...tassi) * 1.15],
          },
          yaxis: { ...AXIS_FIXED,
            automargin: true,
          },
          shapes: [
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
              font: { size: 10, color: COLORS.mediaNazionale },
              xanchor: "left",
              yanchor: "bottom",
              xshift: 4,
            },
          ],
          height: isMobile ? 500 : 550,
          margin: { l: isMobile ? 120 : 180, r: 50, t: 10, b: 40 },
          dragmode: false,
          plot_bgcolor: "white",
          paper_bgcolor: "white",
        }}
        config={PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
      />
    </ChartFullscreenWrapper>
  );
}
