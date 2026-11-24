"use client";

import { useFetchData } from "@/lib/use-fetch-data";
import { COLORS, PLOTLY_FONT, AXIS_FIXED, getAxisYear, COVID_SHAPES, COVID_ANNOTATIONS, CHART_HEIGHT_MINI } from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Plot } from "@/components/charts/plot";

/* ================================================================
   Tipi configurazione
   ================================================================ */

export type InsightChartSeries = {
  /** Filtro data_type (OFFEND/VICTIM) — solo per autori_vittime_trend */
  dataType?: string;
  /** Filtro codice_reato singolo — solo per autori_vittime_trend */
  code?: string;
  /** Filtro categoria — solo per insights_categorie (serie gia' aggregate dalla pipeline) */
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
  /** data_type denominatore per calcolo ratio (numeratore = dataType).
   *  Es. OFFEND.totale / VICTIM.totale -> dataType="OFFEND", ratioDataType="VICTIM" */
  ratioDataType?: string;
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
  /** Aggregazione territoriale:
   *  - "ripartizione": 3 linee Nord/Centro/Sud e Isole da insights_ripartizioni
   *    (medie gia' pesate dalla pipeline, le stesse dei testi)
   *  - "divergenza-regionale": area chart media +/- std-dev tra 20 regioni
   *  Usa la prima serie come template per filtro (dataType, code) e yField. */
  aggregation?: "ripartizione" | "divergenza-regionale";
};

/* ================================================================
   Ripartizioni (per aggregation: "ripartizione")
   ================================================================ */

const RIPARTIZIONE_COLORS: Record<string, string> = {
  Nord: COLORS.nord,
  Centro: COLORS.centro,
  "Sud e Isole": COLORS.sud,
};

function buildRipartizioneTraces(
  rawData: Record<string, unknown>[],
  template: InsightChartSeries,
): Plotly.Data[] {
  const isPct = template.yField.startsWith("pct_");

  return Object.keys(RIPARTIZIONE_COLORS).map((rip) => {
    const rows = rawData.filter(
      (row) =>
        row.ripartizione === rip &&
        row.data_type === template.dataType &&
        row.codice_reato === template.code &&
        row[template.yField] != null
    );

    return {
      x: rows.map((r) => r[template.xField] as number),
      y: rows.map((r) => r[template.yField] as number),
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: rip,
      line: { color: RIPARTIZIONE_COLORS[rip], width: 2 },
      marker: { size: 4 },
      hovertemplate: isPct
        ? `%{x}: %{y:.1f}%<extra>${rip}</extra>`
        : `%{x}: %{y:.1f}<extra>${rip}</extra>`,
    };
  });
}

/* ================================================================
   Divergenza regionale: media +/- std-dev tra 20 regioni per anno
   ================================================================ */

function buildDivergenzaTraces(
  rawData: Record<string, unknown>[],
  template: InsightChartSeries,
): Plotly.Data[] {
  const filtered = rawData.filter((row) => {
    if (template.dataType && row.data_type !== template.dataType) return false;
    if (template.code && row.codice_reato !== template.code) return false;
    return true;
  });

  // Raggruppa per anno, raccogli valori da tutte le regioni
  const byAnno = new Map<number, number[]>();
  for (const row of filtered) {
    const anno = row[template.xField] as number;
    const val = row[template.yField] as number;
    if (val == null) continue;
    if (!byAnno.has(anno)) byAnno.set(anno, []);
    byAnno.get(anno)!.push(val);
  }

  const anni = [...byAnno.keys()].sort((a, b) => a - b);
  const medie: number[] = [];
  const stdDevs: number[] = [];

  for (const anno of anni) {
    const vals = byAnno.get(anno)!;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    medie.push(mean);
    stdDevs.push(Math.sqrt(variance));
  }

  const upper = medie.map((m, i) => m + stdDevs[i]);
  const lower = medie.map((m, i) => m - stdDevs[i]);
  const color = template.color || COLORS.primary;

  // Fascia trasparente al 20% (33 esadecimale): resta un esadecimale, che il tema scuro sa sostituire
  const fillColor = `${color}33`;

  return [
    // Fascia superiore (bordo area)
    {
      x: anni,
      y: upper,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Media + 1 std",
      line: { width: 0 },
      showlegend: false,
      hovertemplate: `%{x}: %{y:.1f}<extra>+1 std</extra>`,
    },
    // Fascia inferiore (riempie area fino a upper)
    {
      x: anni,
      y: lower,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Media \u2212 1 std",
      line: { width: 0 },
      fill: "tonexty" as const,
      fillcolor: fillColor,
      showlegend: false,
      hovertemplate: `%{x}: %{y:.1f}<extra>\u22121 std</extra>`,
    },
    // Linea media
    {
      x: anni,
      y: medie,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: "Media regionale",
      line: { color, width: 2 },
      marker: { size: 4 },
      hovertemplate: `%{x}: %{y:.1f}<extra>Media</extra>`,
    },
  ];
}

/* ================================================================
   Componente
   ================================================================ */

export function InsightMiniChart({ config, ariaLabel }: { config: InsightChartConfig; ariaLabel?: string }) {
  const { data: rawData, loading } = useFetchData<Record<string, unknown>[]>(
    `/data/${config.file}`
  );
  const isMobile = useIsMobile();

  if (loading || !rawData)
    return <div className="h-[300px] animate-pulse bg-muted rounded" />;

  const isDivergenza = config.aggregation === "divergenza-regionale";
  const isRipartizione = config.aggregation === "ripartizione";

  const traces: Plotly.Data[] = isDivergenza
    ? buildDivergenzaTraces(rawData, config.series[0])
    : isRipartizione
    ? buildRipartizioneTraces(rawData, config.series[0])
    : config.series.map((s) => {
        const filtered = rawData.filter((row) => {
          if (s.dataType && row.data_type !== s.dataType) return false;
          if (s.code && row.codice_reato !== s.code) return false;
          if (s.category && row.categoria !== s.category) return false;
          return true;
        });

        let xVals: number[];
        let yVals: number[];
        if (s.ratioDataType) {
          // Ratio: numeratore (dataType) / denominatore (ratioDataType) per anno
          const denomFiltered = rawData.filter((row) => {
            if (row.data_type !== s.ratioDataType) return false;
            if (s.code && row.codice_reato !== s.code) return false;
            return true;
          });
          const numByAnno = new Map<number, number>();
          for (const row of filtered) {
            const anno = row[s.xField] as number;
            const val = row[s.yField] as number;
            if (val != null) numByAnno.set(anno, val);
          }
          const denByAnno = new Map<number, number>();
          for (const row of denomFiltered) {
            const anno = row[s.xField] as number;
            const val = row[s.yField] as number;
            if (val != null) denByAnno.set(anno, val);
          }
          const anni = [...numByAnno.keys()].filter((a) => denByAnno.has(a)).sort((a, b) => a - b);
          xVals = anni;
          yVals = anni.map((a) => {
            const den = denByAnno.get(a)!;
            return den > 0 ? numByAnno.get(a)! / den : 0;
          });
        } else {
          xVals = filtered.map((r) => r[s.xField] as number);
          yVals = filtered.map((r) => r[s.yField] as number);
        }

        const isRatio = !!s.ratioDataType;
        return {
          x: xVals,
          y: yVals,
          type: "scatter" as const,
          mode: "lines+markers" as const,
          name: s.label,
          line: { color: s.color, width: 2, dash: s.dash ?? "solid" },
          marker: { size: 4 },
          yaxis: s.yaxis ?? "y",
          hovertemplate: isRatio
            ? `%{x}: %{y:.2f}<extra>${s.label}</extra>`
            : s.yField.startsWith("pct_") || s.yField === "Percezione_pct"
              ? `%{x}: %{y:.1f}%<extra>${s.label}</extra>`
              : `%{x}: %{y:,.0f}<extra>${s.label}</extra>`,
        };
      });

  const hasDualY = !isRipartizione && !isDivergenza && config.series.some((s) => s.yaxis === "y2");

  // Colore asse Y derivato dalla prima serie su ciascun asse
  const y1Color = config.series.find((s) => !s.yaxis)?.color;
  const y2Color = config.series.find((s) => s.yaxis === "y2")?.color;

  const layout: Partial<Plotly.Layout> = {
    height: CHART_HEIGHT_MINI,
    xaxis: getAxisYear(isMobile),
    yaxis: {
      ...AXIS_FIXED,
      title: config.yAxisLabel
        ? { text: config.yAxisLabel, standoff: 5, font: hasDualY && y1Color ? { color: y1Color } : undefined }
        : undefined,
      ...(hasDualY ? { side: "left" as const } : {}),
    },
    margin: { t: 10, l: 55, r: hasDualY ? 55 : 20, b: 40 },
    shapes: COVID_SHAPES,
    annotations: COVID_ANNOTATIONS,
    legend: {
      orientation: "h" as const,
      y: -0.15,
      x: 0.5,
      xanchor: "center" as const,
      font: { size: PLOTLY_FONT.legendMini },
    },
    showlegend: true,
  };

  if (hasDualY) {
    layout.yaxis2 = {
      ...AXIS_FIXED,
      title: config.y2AxisLabel
        ? { text: config.y2AxisLabel, standoff: 5, font: y2Color ? { color: y2Color } : undefined }
        : undefined,
      overlaying: "y" as const,
      side: "right" as const,
    };
  }

  return (
    <Plot
        descrizione={ariaLabel ?? "Grafico insight"}
        data={traces}
        layout={layout}
      />
  );
}
