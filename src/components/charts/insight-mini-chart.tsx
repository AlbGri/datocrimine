"use client";

import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { PLOTLY_CONFIG, AXIS_FIXED, getAxisYear } from "@/lib/config";
import { PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

/* ================================================================
   Tipi configurazione
   ================================================================ */

export type InsightChartSeries = {
  /** Filtro data_type (OFFEND/VICTIM) — solo per autori_vittime_trend */
  dataType?: string;
  /** Filtro codice_reato — solo per autori_vittime_trend */
  code?: string;
  /** Filtro Categoria — solo per delitti_categorie */
  category?: string;
  /** Campo x (anno/Anno) */
  xField: string;
  /** Campo y da plottare */
  yField: string;
  /** Label legenda */
  label: string;
  /** Colore linea */
  color: string;
  /** Se su asse y secondario */
  yaxis?: "y2";
  /** Stile linea */
  dash?: "solid" | "dash" | "dot";
};

export type InsightChartConfig = {
  /** File JSON in public/data/ */
  file: string;
  /** Serie da plottare */
  series: InsightChartSeries[];
  /** Label asse y sinistro */
  yAxisLabel?: string;
  /** Label asse y destro (se dual-y) */
  y2AxisLabel?: string;
};

/* ================================================================
   Componente
   ================================================================ */

const MINI_CHART_HEIGHT = 300;

export function InsightMiniChart({ config }: { config: InsightChartConfig }) {
  const { data: rawData, loading } = useFetchData<Record<string, unknown>[]>(
    `/data/${config.file}`
  );
  const isMobile = useIsMobile();

  if (loading || !rawData)
    return <div className="h-[300px] animate-pulse bg-muted rounded" />;

  const hasDualY = config.series.some((s) => s.yaxis === "y2");

  const traces: Plotly.Data[] = config.series.map((s) => {
    const filtered = rawData.filter((row) => {
      if (s.dataType && row.data_type !== s.dataType) return false;
      if (s.code && row.codice_reato !== s.code) return false;
      if (s.category && row.Categoria !== s.category) return false;
      return true;
    });

    return {
      x: filtered.map((r) => r[s.xField] as number),
      y: filtered.map((r) => r[s.yField] as number),
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: s.label,
      line: { color: s.color, width: 2, dash: s.dash ?? "solid" },
      marker: { size: 4 },
      yaxis: s.yaxis ?? "y",
      hovertemplate:
        s.yField.startsWith("pct_") || s.yField === "Percezione_pct"
          ? `%{x}: %{y:.1f}%<extra>${s.label}</extra>`
          : `%{x}: %{y:,.0f}<extra>${s.label}</extra>`,
    };
  });

  const layout: Partial<Plotly.Layout> = {
    height: MINI_CHART_HEIGHT,
    xaxis: getAxisYear(isMobile),
    yaxis: {
      ...AXIS_FIXED,
      title: config.yAxisLabel
        ? { text: config.yAxisLabel, standoff: 5 }
        : undefined,
      ...(hasDualY ? { side: "left" as const } : {}),
    },
    margin: { t: 10, l: 55, r: hasDualY ? 55 : 20, b: 35 },
    dragmode: false,
    plot_bgcolor: "white",
    paper_bgcolor: "white",
    separators: PLOTLY_IT_SEPARATORS,
    legend: {
      orientation: "h" as const,
      y: -0.2,
      x: 0.5,
      xanchor: "center" as const,
      font: { size: 11 },
    },
    showlegend: config.series.length > 1,
  };

  if (hasDualY) {
    layout.yaxis2 = {
      ...AXIS_FIXED,
      title: config.y2AxisLabel
        ? { text: config.y2AxisLabel, standoff: 5 }
        : undefined,
      overlaying: "y" as const,
      side: "right" as const,
    };
  }

  return (
    <Plot
      data={traces}
      layout={layout}
      config={PLOTLY_CONFIG}
      useResizeHandler
      className="w-full"
    />
  );
}
