"use client";

import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { COLORS, PLOTLY_CONFIG, AXIS_FIXED } from "@/lib/config";
import { fmtNum, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface AllarmeRegione {
  REF_AREA: string;
  Territorio: string;
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
  anno: number;
  reato: string;
}

export function ChartAllarmeRankingRegioni({ anno, reato }: Props) {
  const isMobile = useIsMobile();
  const { data, loading } = useFetchData<AllarmeRegione[]>(
    "/data/reati_allarme_sociale_regioni.json"
  );

  if (loading)
    return <div className="h-[400px] sm:h-[500px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  const dataAnno = data.filter((d) => d.Anno === anno && d.Reato === reato);
  const sorted = [...dataAnno].sort((a, b) => a.Tasso_per_100k - b.Tasso_per_100k);

  const nomi = sorted.map((d) => d.Territorio);
  const tassi = sorted.map((d) => d.Tasso_per_100k);

  const totDel = dataAnno.reduce((s, d) => s + d.Delitti, 0);
  const totPop = dataAnno.reduce((s, d) => s + d.Popolazione, 0);
  const media = totPop > 0 ? (totDel / totPop) * 100_000 : 0;

  const barColor = COLORI_ALLARME[reato] ?? COLORS.primary;
  const colors = tassi.map((t) => {
    const maxT = Math.max(...tassi, 1);
    const ratio = Math.min(t / maxT, 1);
    const r = parseInt(barColor.slice(1, 3), 16);
    const g = parseInt(barColor.slice(3, 5), 16);
    const b = parseInt(barColor.slice(5, 7), 16);
    const mix = (c: number) => Math.round(240 + (c - 240) * ratio);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  });

  return (
    <ChartFullscreenWrapper ariaDescription={`Classifica regioni per ${reato}, tasso per 100.000 abitanti, anno ${anno}`}>
      <Plot
        data={[
          {
            type: "bar",
            y: nomi,
            x: tassi,
            orientation: "h" as const,
            marker: { color: colors },
            text: tassi.map((t) => fmtNum(t, 2)),
            textposition: "outside" as const,
            hovertemplate:
              "<b>%{y}</b><br>Tasso: %{x:.2f} per 100k ab.<extra></extra>",
          },
        ]}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          xaxis: { ...AXIS_FIXED,
            title: { text: "Tasso per 100k ab." },
            range: [0, Math.max(...tassi) * 1.2],
          },
          yaxis: { ...AXIS_FIXED, automargin: true },
          shapes: [
            {
              type: "line",
              x0: media,
              x1: media,
              y0: -0.5,
              y1: nomi.length - 0.5,
              line: { color: "#dc2626", width: 2, dash: "dash" },
            },
          ],
          annotations: [
            {
              x: media,
              y: nomi.length - 0.5,
              text: `Media: ${fmtNum(media, 2)}`,
              showarrow: false,
              font: { size: 10, color: "#dc2626" },
              xanchor: "left",
              yanchor: "bottom",
              xshift: 4,
            },
          ],
          height: isMobile ? 500 : 550,
          margin: { l: isMobile ? 120 : 180, r: 60, t: 10, b: 40 },
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
