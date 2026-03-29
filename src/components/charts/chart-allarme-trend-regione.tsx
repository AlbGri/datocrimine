"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  COLORI_ALLARME,
  CHART_HEIGHT_SMALL,
  PLOTLY_CONFIG,
  PLOTLY_FONT,
  COVID_SHAPES,
  COVID_ANNOTATIONS,
  AXIS_FIXED,
  getAxisYear,
  varTriennale,
  TRIENNALE_PERIODI,
} from "@/lib/config";
import { fmtPctSigned, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { useFilterSync, SyncButton } from "@/lib/filter-sync-context";

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


interface Props {
  reato: string;
}

type Metrica = "tasso" | "assoluto";

export function ChartAllarmeTrendRegione({ reato }: Props) {
  const isMobile = useIsMobile();
  const { data, loading } = useFetchData<AllarmeRegione[]>(
    "/data/reati_allarme_sociale_regioni.json"
  );
  const [regione, setRegione] = useState<string>("");
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const setRegioneStable = useCallback((v: string) => setRegione(v), []);

  const regioni = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((d) => d.Territorio))].sort((a, b) => a.localeCompare(b, "it"));
  }, [data]);

  const effectiveRegione = regione || regioni[0] || "";
  const { handleSync } = useFilterSync("regione", effectiveRegione, setRegioneStable);

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

  const isAssoluto = metrica === "assoluto";
  const selected = regione || regioni[0] || "";
  const regioneData = data
    .filter((d) => d.Territorio === selected && d.Reato === reato)
    .sort((a, b) => a.Anno - b.Anno);

  const anni = regioneData.map((d) => d.Anno);
  const mediaNazArr = anni.map((a) =>
    Number((mediaNazionale.get(a) ?? 0).toFixed(2))
  );

  const varRegione = varTriennale(
    regioneData.map((d) => ({ anno: d.Anno, tasso: isAssoluto ? d.Delitti : d.Tasso_per_100k }))
  );

  const lineColor = COLORI_ALLARME[reato] ?? COLORS.primary;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <div>
          <label
            htmlFor="allarme-regione-select"
            className="text-sm font-medium mb-1 flex items-center"
          >
            Seleziona regione
            <SyncButton onClick={() => handleSync()} />
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
        <div>
          <label htmlFor="allarme-reg-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="allarme-reg-metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="tasso">Tasso per 100k ab.</option>
            <option value="assoluto">Numero assoluto</option>
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper ariaDescription={`Grafico trend ${reato} per ${selected} vs media nazionale, 2014-2024`}>
        <Plot
          data={[
            {
              x: anni,
              y: regioneData.map((d) => isAssoluto ? d.Delitti : d.Tasso_per_100k),
              mode: "lines+markers" as const,
              name: selected,
              hovertemplate: isAssoluto
                ? "<b>%{fullData.name}</b>: %{y:,.0f}<extra></extra>"
                : "<b>%{fullData.name}</b>: %{y:.2f} per 100k ab.<extra></extra>",
              line: { width: 3, color: lineColor },
              marker: { size: 6 },
            },
            ...(!isAssoluto ? [{
              x: anni,
              y: mediaNazArr,
              mode: "lines" as const,
              name: "Media nazionale",
              hovertemplate: "<b>%{fullData.name}</b>: %{y:.2f} per 100k ab.<extra></extra>",
              line: { width: 2, color: COLORS.grigioMedia, dash: "dash" as const },
            }] : []),
          ]}
          key={metrica}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            dragmode: false as const,
            hovermode: "x unified" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: CHART_HEIGHT_SMALL,
            xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
            yaxis: { ...AXIS_FIXED,
              title: { text: isAssoluto ? "Delitti denunciati" : "Tasso per 100k ab.", font: { size: PLOTLY_FONT.axisTitle } },
              ...(isAssoluto && { tickformat: "~s", hoverformat: ",.0f" }),
            },
            legend: {
              x: 0,
              y: -0.25,
              xanchor: "left" as const,
              orientation: "h" as const,
              font: { size: PLOTLY_FONT.legendFixed },
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
            {fmtPctSigned(varRegione)}
          </span>
        </p>
      )}
    </div>
  );
}
