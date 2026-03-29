"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT,
  PLOTLY_CONFIG,
  PLOTLY_FONT,
  COVID_SHAPES,
  getCovidAnnotations,
  AXIS_FIXED,
  getAxisYear,
  BREAKDOWN_LINES,
  VICTIM_DEFAULT,
} from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { PLOTLY_IT_SEPARATORS } from "@/lib/format";
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
  maschi: number;
  femmine: number;
  pct_stranieri: number;
  pct_minori: number | null;
  pct_maschi: number | null;
  pct_femmine: number | null;
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
    const info = new Map<string, { nome: string; anniCount: number }>();
    for (const r of data) {
      if (r.data_type === dataType) {
        const prev = info.get(r.codice_reato);
        if (prev) {
          prev.anniCount++;
        } else {
          info.set(r.codice_reato, { nome: r.reato, anniCount: 1 });
        }
      }
    }
    const entries = Array.from(info.entries()).map(([codice, v]) => ({
      codice,
      nome: v.nome,
      anniCount: v.anniCount,
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
    // VICTIM non ha TOT: preferisci un reato con serie lunga
    if (reatiDisponibili.some((r) => r.codice === VICTIM_DEFAULT)) return VICTIM_DEFAULT;
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

  // Linea totale
  const traces: Plotly.Data[] = [
    {
      x: anni,
      y: filtered.map((d) => d.totale),
      mode: "lines+markers" as const,
      name: `Totale ${dataType === "OFFEND" ? "autori" : "vittime"}`,
      hovertemplate: "<b>%{fullData.name}</b><br>Anno: %{x}<br>Totale: %{y:,.0f}<extra></extra>",
      line: { color: COLORS.primary, width: 3 },
      marker: { size: 8 },
      yaxis: "y",
    },
  ];

  // Linee breakdown % su asse destro, solo se hanno dati non-null
  for (const bd of BREAKDOWN_LINES) {
    const values = filtered.map((d) => d[bd.key]);
    const hasData = values.some((v) => v !== null);
    if (!hasData) continue;

    traces.push({
      x: anni,
      y: values,
      mode: "lines+markers" as const,
      name: bd.label,
      hovertemplate: "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:.1f}%<extra></extra>",
      line: { color: bd.color, width: 2, dash: "dash" as const },
      marker: { size: 5 },
      yaxis: "y2",
    });
  }

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
          data={traces}
          layout={{
            xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
            yaxis: {
              ...AXIS_FIXED,
              title: {
                text: `Totale ${dataType === "OFFEND" ? "autori" : "vittime"}`,
                font: { color: COLORS.primary, size: PLOTLY_FONT.axisTitle },
              },
              tickfont: { color: COLORS.primary },
              side: "left",
            },
            yaxis2: {
              ...AXIS_FIXED,
              title: { text: "%", font: { size: PLOTLY_FONT.axisTitle, color: COLORS.grigioTesto } },
              overlaying: "y" as const,
              side: "right",
              range: [0, 100],
              showgrid: false,
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
                  font: { size: PLOTLY_FONT.legendMobile },
                }
              : {
                  x: 0.5,
                  y: 1.08,
                  xanchor: "center",
                  orientation: "h" as const,
                },
            separators: PLOTLY_IT_SEPARATORS,
            shapes: COVID_SHAPES,
            annotations: getCovidAnnotations(isMobile),
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
      {filtered.length <= 5 && (
        <p className="text-xs text-muted-foreground">
          Questo reato ha una serie storica breve ({annoMin}-{annoMax}): il dato ISTAT
          &egrave; disponibile solo per {filtered.length} anni.
        </p>
      )}
    </div>
  );
}
