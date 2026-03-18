"use client";

import { useState, useMemo } from "react";
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
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface TrendRecord {
  data_type: "OFFEND" | "VICTIM";
  codice_reato: string;
  reato: string;
  anno: number;
  totale: number;
  stranieri: number;
  minori: number;
  pct_stranieri: number;
  pct_minori: number | null;
}

interface Props {
  dataType: "OFFEND" | "VICTIM";
}

export function ChartAutoriTrend({ dataType }: Props) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<TrendRecord[]>(
    "/data/autori_vittime_trend.json"
  );
  const [codiceReato, setCodiceReato] = useState("TOT");

  // Lista reati disponibili per il data_type selezionato
  const reatiDisponibili = useMemo(() => {
    if (!data) return [];
    const info = new Map<string, string>();
    for (const r of data) {
      if (r.data_type === dataType && !info.has(r.codice_reato)) {
        info.set(r.codice_reato, r.reato);
      }
    }
    const entries = Array.from(info.entries()).map(([codice, nome]) => ({
      codice,
      nome,
    }));
    return entries.sort((a, b) => {
      if (a.codice === "TOT") return -1;
      if (b.codice === "TOT") return 1;
      return a.nome.localeCompare(b.nome, "it");
    });
  }, [data, dataType]);

  // Se il reato selezionato non esiste per questo dataType, fallback
  const effectiveReato = useMemo(() => {
    if (reatiDisponibili.some((r) => r.codice === codiceReato)) return codiceReato;
    // VICTIM non ha TOT: default al primo reato disponibile
    return reatiDisponibili[0]?.codice ?? "TOT";
  }, [codiceReato, reatiDisponibili]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter((r) => r.data_type === dataType && r.codice_reato === effectiveReato)
      .sort((a, b) => a.anno - b.anno);
  }, [data, dataType, effectiveReato]);

  if (loading)
    return (
      <div className="h-[250px] sm:h-[450px] animate-pulse bg-muted rounded" />
    );
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data || filtered.length === 0) return null;

  const anni = filtered.map((d) => d.anno);
  const reatoLabel = filtered[0]?.reato ?? effectiveReato;
  const annoMin = anni[0];
  const annoMax = anni[anni.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label htmlFor="trend-reato-select" className="block text-sm font-medium mb-1">
            Tipo di reato
          </label>
          <select
            id="trend-reato-select"
            value={effectiveReato}
            onChange={(e) => setCodiceReato(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {reatiDisponibili.map((r) => (
              <option key={r.codice} value={r.codice}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper ariaDescription={`Grafico trend ${dataType === "OFFEND" ? "autori" : "vittime"} ${reatoLabel} ${annoMin}-${annoMax}`}>
        <Plot
          data={[
            {
              x: anni,
              y: filtered.map((d) => d.totale),
              mode: "lines+markers" as const,
              name: `Totale ${dataType === "OFFEND" ? "autori" : "vittime"}`,
              line: { color: COLORS.primary, width: 3 },
              marker: { size: 8 },
              yaxis: "y",
            },
            {
              x: anni,
              y: filtered.map((d) => d.pct_stranieri),
              mode: "lines+markers" as const,
              name: "% stranieri",
              line: {
                color: COLORS.secondary,
                width: 3,
                dash: "dash" as const,
              },
              marker: { size: 8 },
              yaxis: "y2",
            },
          ]}
          layout={{
            xaxis: { ...AXIS_FIXED, title: { text: "Anno" } },
            yaxis: {
              ...AXIS_FIXED,
              title: {
                text: `Totale ${dataType === "OFFEND" ? "autori" : "vittime"}`,
                font: { color: COLORS.primary, size: 12 },
              },
              tickfont: { color: COLORS.primary },
              side: "left",
            },
            yaxis2: {
              ...AXIS_FIXED,
              title: {
                text: "% stranieri",
                font: { color: COLORS.secondary, size: 12 },
              },
              tickfont: { color: COLORS.secondary },
              overlaying: "y" as const,
              side: "right",
            },
            dragmode: false,
            hovermode: "closest" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: isMobile ? 300 : CHART_HEIGHT,
            margin: isMobile
              ? { l: 45, r: 45, t: 40, b: 60 }
              : { l: 60, r: 60, t: 30, b: 50 },
            legend: isMobile
              ? {
                  x: 0.5,
                  y: -0.3,
                  xanchor: "center",
                  yanchor: "top",
                  orientation: "h" as const,
                  font: { size: 9 },
                }
              : {
                  x: 0.5,
                  y: 1.08,
                  xanchor: "center",
                  orientation: "h" as const,
                },
            shapes: COVID_SHAPES,
            annotations: isMobile
              ? COVID_ANNOTATIONS.map((a) => ({
                  ...a,
                  y: 0.92,
                  font: { ...a.font, size: 8 },
                }))
              : COVID_ANNOTATIONS,
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      {effectiveReato === "TOT" && annoMax < 2024 && (
        <p className="text-xs text-muted-foreground">
          La serie si ferma al {annoMax} perch&eacute; il dato aggregato (totale per tutti i reati)
          non &egrave; ancora disponibile per gli anni successivi. Per i singoli reati
          la serie arriva al 2024.
        </p>
      )}
    </div>
  );
}
