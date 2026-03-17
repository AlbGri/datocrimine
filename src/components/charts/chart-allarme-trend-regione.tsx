"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT_SMALL,
  PLOTLY_CONFIG,
  COVID_SHAPES,
  COVID_ANNOTATIONS,
  AXIS_FIXED,
  varTriennale,
  TRIENNALE_PERIODI,
} from "@/lib/config";
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
  reato: string;
}

export function ChartAllarmeTrendRegione({ reato }: Props) {
  const { data, loading } = useFetchData<AllarmeRegione[]>(
    "/data/reati_allarme_sociale_regioni.json"
  );
  const [regione, setRegione] = useState<string>("");

  const regioni = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((d) => d.Territorio))].sort();
  }, [data]);

  const mediaNazionale = useMemo(() => {
    if (!data) return new Map<number, number>();
    const reatoData = data.filter((d) => d.Reato === reato);
    const anni = [...new Set(reatoData.map((d) => d.Anno))];
    const map = new Map<number, number>();
    for (const anno of anni) {
      const rows = reatoData.filter((d) => d.Anno === anno);
      const totDel = rows.reduce((s, d) => s + d.Delitti, 0);
      const totPop = rows.reduce((s, d) => s + d.Popolazione, 0);
      map.set(anno, totPop > 0 ? (totDel / totPop) * 100_000 : 0);
    }
    return map;
  }, [data, reato]);

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  const selected = regione || regioni[0] || "";
  const regioneData = data
    .filter((d) => d.Territorio === selected && d.Reato === reato)
    .sort((a, b) => a.Anno - b.Anno);

  const anni = regioneData.map((d) => d.Anno);
  const mediaNazArr = anni.map((a) =>
    Number((mediaNazionale.get(a) ?? 0).toFixed(2))
  );

  const varRegione = varTriennale(
    regioneData.map((d) => ({ anno: d.Anno, tasso: d.Tasso_per_100k }))
  );

  const lineColor = COLORI_ALLARME[reato] ?? COLORS.primary;

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="allarme-regione-select"
          className="block text-sm font-medium mb-1"
        >
          Seleziona regione
        </label>
        <select
          id="allarme-regione-select"
          value={selected}
          onChange={(e) => setRegione(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          {regioni.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <ChartFullscreenWrapper ariaDescription={`Grafico trend ${reato} per ${selected} vs media nazionale, 2014-2024`}>
        <Plot
          data={[
            {
              x: anni,
              y: regioneData.map((d) => d.Tasso_per_100k),
              mode: "lines+markers" as const,
              name: selected,
              line: { width: 3, color: lineColor },
              marker: { size: 6 },
            },
            {
              x: anni,
              y: mediaNazArr,
              mode: "lines" as const,
              name: "Media nazionale",
              line: { width: 2, color: "#999999", dash: "dash" },
            },
          ]}
          layout={{
            dragmode: false as const,
            hovermode: "x unified" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: CHART_HEIGHT_SMALL,
            xaxis: { ...AXIS_FIXED, title: { text: "Anno" } },
            yaxis: { ...AXIS_FIXED,
              title: { text: "Tasso per 100k ab.", font: { size: 12 } },
            },
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

      {varRegione !== null && (
        <p className="text-sm text-muted-foreground">
          <strong>
            {selected} ({TRIENNALE_PERIODI}):
          </strong>{" "}
          <span
            className={varRegione < 0 ? "text-green-600" : "text-red-600"}
          >
            {varRegione > 0 ? "+" : ""}
            {varRegione.toFixed(1)}%
          </span>
        </p>
      )}
    </div>
  );
}
