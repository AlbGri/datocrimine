"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { PLOTLY_CONFIG, AXIS_FIXED } from "@/lib/config";
import { fmtNum, fmtPct, PLOTLY_IT_SEPARATORS } from "@/lib/format";
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
  maschi: number;
  femmine: number;
  pct_stranieri: number;
  pct_maschi: number | null;
  pct_femmine: number | null;
  pct_minori: number | null;
}

interface DelittiItaliaRecord {
  Anno: number;
  Delitti: number;
  Popolazione: number;
  Tasso_per_1000: number;
}

type Metrica = "tasso" | "pct_stranieri" | "pct_maschi" | "pct_femmine" | "pct_minori";

const METRICHE: { value: Metrica; label: string; color: string }[] = [
  { value: "tasso", label: "Tasso per 100k ab.", color: "#2563eb" },
  { value: "pct_stranieri", label: "% stranieri", color: "#2E86AB" },
  { value: "pct_maschi", label: "% maschi", color: "#2563eb" },
  { value: "pct_femmine", label: "% femmine", color: "#db2777" },
  { value: "pct_minori", label: "% minori", color: "#7c3aed" },
];

interface Props {
  dataType: "OFFEND" | "VICTIM";
}

const MIN_CASI = 30;
const TOP_N = 10;

interface ChartItem {
  reato: string;
  value: number;
  totale: number;
  stranieri: number;
  minori: number;
  maschi: number;
  femmine: number;
  isAltro?: boolean;
  altroCount?: number;
}

export function ChartProfiloNazionale({ dataType }: Props) {
  const isMobile = useIsMobile();
  const { data, loading: l1, error: e1 } = useFetchData<TrendRecord[]>(
    "/data/autori_vittime_trend.json"
  );
  const { data: delittiData, loading: l2, error: e2 } = useFetchData<DelittiItaliaRecord[]>(
    "/data/delitti_italia.json"
  );
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const [selectedAnno, setSelectedAnno] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const popMap = useMemo(() => {
    if (!delittiData) return new Map<number, number>();
    const m = new Map<number, number>();
    for (const r of delittiData) m.set(r.Anno, r.Popolazione);
    return m;
  }, [delittiData]);

  const anniDisponibili = useMemo(() => {
    if (!data) return [];
    const set = new Set<number>();
    for (const r of data) {
      if (r.data_type !== dataType) continue;
      if (metrica === "tasso") {
        if (popMap.has(r.anno)) set.add(r.anno);
      } else if (r[metrica] !== null) {
        set.add(r.anno);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [data, dataType, metrica, popMap]);

  const anno =
    selectedAnno && anniDisponibili.includes(selectedAnno)
      ? selectedAnno
      : anniDisponibili[0] ?? 2024;

  const loading = l1 || l2;
  const error = e1 || e2;

  if (loading)
    return (
      <div className="h-[400px] sm:h-[600px] animate-pulse bg-muted rounded" />
    );
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data || !delittiData) return null;

  const popolazione = popMap.get(anno) ?? 0;
  const isTasso = metrica === "tasso";

  const filtered = data.filter(
    (r) =>
      r.data_type === dataType &&
      r.anno === anno &&
      r.codice_reato !== "TOT" &&
      r.totale >= MIN_CASI &&
      (isTasso || r[metrica] !== null)
  );

  const metricaConfig = METRICHE.find((m) => m.value === metrica)!;
  const subjectLabel = dataType === "OFFEND" ? "autori" : "vittime";

  // Tutti gli item ordinati per valore decrescente (top = piu' alti)
  const allItems: ChartItem[] = filtered
    .map((d) => ({
      reato: d.reato,
      value: isTasso
        ? popolazione > 0 ? (d.totale / popolazione) * 100_000 : 0
        : (d[metrica] as number),
      totale: d.totale,
      stranieri: d.stranieri,
      minori: d.minori,
      maschi: d.maschi,
      femmine: d.femmine,
    }))
    .sort((a, b) => b.value - a.value);

  const needsGrouping = allItems.length > TOP_N;

  let displayItems: ChartItem[];
  if (!needsGrouping || expanded) {
    // Ordine ascendente per Plotly (basso -> alto)
    displayItems = [...allItems].reverse();
  } else {
    const topItems = allItems.slice(0, TOP_N);
    const restItems = allItems.slice(TOP_N);

    let altroValue: number;
    if (isTasso) {
      altroValue = restItems.reduce((s, i) => s + i.value, 0);
    } else {
      const totW = restItems.reduce((s, i) => s + i.totale, 0);
      altroValue = totW > 0
        ? restItems.reduce((s, i) => s + i.value * i.totale, 0) / totW
        : 0;
    }

    const altro: ChartItem = {
      reato: `Altro (${restItems.length} reati)`,
      value: altroValue,
      totale: restItems.reduce((s, i) => s + i.totale, 0),
      stranieri: restItems.reduce((s, i) => s + i.stranieri, 0),
      minori: restItems.reduce((s, i) => s + i.minori, 0),
      maschi: restItems.reduce((s, i) => s + i.maschi, 0),
      femmine: restItems.reduce((s, i) => s + i.femmine, 0),
      isAltro: true,
      altroCount: restItems.length,
    };

    // Ordine ascendente: altro in fondo (basso), top in cima (alto)
    displayItems = [altro, ...topItems.reverse()];
  }

  const esclusi = data.filter(
    (r) =>
      r.data_type === dataType &&
      r.anno === anno &&
      r.codice_reato !== "TOT" &&
      r.totale > 0 &&
      r.totale < MIN_CASI
  );

  const nomi = displayItems.map((d) => d.reato);
  const valori = displayItems.map((d) => d.value);

  const maxVal = Math.max(...valori, 1);
  const baseColor = metricaConfig.color;
  const colors = displayItems.map((d) => {
    if (d.isAltro) return "#9ca3af";
    const ratio = Math.min(d.value / maxVal, 1);
    const opacity = 0.25 + ratio * 0.75;
    return baseColor + Math.round(opacity * 255).toString(16).padStart(2, "0");
  });

  const nBars = displayItems.length;
  const barHeight = isMobile ? 18 : 22;
  const chartHeight = Math.max(400, nBars * barHeight + 80);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label
            htmlFor="profilo-naz-metrica"
            className="block text-sm font-medium mb-1"
          >
            Metrica
          </label>
          <select
            id="profilo-naz-metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {METRICHE.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="profilo-naz-anno"
            className="block text-sm font-medium mb-1"
          >
            Anno
          </label>
          <select
            id="profilo-naz-anno"
            value={anno}
            onChange={(e) => setSelectedAnno(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {anniDisponibili.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper
        ariaDescription={`Profilo criminale nazionale, ${metricaConfig.label} ${subjectLabel} per tipo di reato, ${anno}`}
      >
        <Plot
          data={[
            {
              type: "bar",
              y: nomi,
              x: valori,
              orientation: "h" as const,
              marker: { color: colors },
              text: valori.map((v) =>
                isTasso ? fmtNum(v, 1) : fmtPct(v)
              ),
              textposition: "outside" as const,
              hovertemplate: displayItems.map((d) => {
                const lines = [`<b>${d.reato}</b>`];
                if (isTasso) {
                  lines.push(
                    d.isAltro
                      ? `Tasso cumulato: ${fmtNum(d.value, 1)} per 100k ab.`
                      : `Tasso: ${fmtNum(d.value, 1)} per 100k ab.`
                  );
                } else {
                  lines.push(
                    d.isAltro
                      ? `${metricaConfig.label} media: ${fmtPct(d.value)}`
                      : `${metricaConfig.label}: ${fmtPct(d.value)}`
                  );
                }
                lines.push(
                  `Totale ${subjectLabel}: ${fmtNum(d.totale)}`
                );
                if (metrica === "pct_stranieri")
                  lines.push(`Stranieri: ${fmtNum(d.stranieri)}`);
                if (metrica === "pct_minori")
                  lines.push(`Minori: ${fmtNum(d.minori)}`);
                if (metrica === "pct_maschi")
                  lines.push(`Maschi: ${fmtNum(d.maschi)}`);
                if (metrica === "pct_femmine")
                  lines.push(`Femmine: ${fmtNum(d.femmine)}`);
                return lines.join("<br>") + "<extra></extra>";
              }),
            },
          ]}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            xaxis: {
              ...AXIS_FIXED,
              title: { text: metricaConfig.label },
              range: [0, Math.max(...valori) * 1.15],
            },
            yaxis: {
              ...AXIS_FIXED,
              automargin: true,
              tickfont: { size: isMobile ? 9 : 11 },
            },
            height: chartHeight,
            margin: {
              l: isMobile ? 140 : 220,
              r: 50,
              t: 10,
              b: 40,
            },
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      {needsGrouping && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary hover:underline"
        >
          {expanded
            ? "Mostra top 10"
            : `Mostra tutti i reati (${allItems.length})`}
        </button>
      )}

      {esclusi.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Esclusi {esclusi.length} reati con meno di {MIN_CASI} casi totali (
          {esclusi.map((r) => `${r.reato}: ${r.totale}`).join(", ")}).
        </p>
      )}
    </div>
  );
}
