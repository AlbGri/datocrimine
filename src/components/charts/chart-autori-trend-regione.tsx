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
  AXIS_YEAR,
} from "@/lib/config";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface RegioneRecord {
  data_type: "OFFEND" | "VICTIM";
  codice_regione: string;
  regione: string;
  codice_reato: string;
  reato: string;
  anno: number;
  tasso: number | null;
  totale: number;
  stranieri: number;
  minori: number;
  pct_stranieri: number;
  pct_minori: number | null;
}

type Metrica = "tasso" | "pct_stranieri" | "pct_minori";

interface Props {
  dataType: "OFFEND" | "VICTIM";
}

const VICTIM_DEFAULT = "CULPINJU";

const METRICA_LABELS: Record<Metrica, string> = {
  tasso: "Tasso per 100k ab.",
  pct_stranieri: "% stranieri",
  pct_minori: "% minori",
};

export function ChartAutoriTrendRegione({ dataType }: Props) {
  const { data, loading, error } = useFetchData<RegioneRecord[]>(
    "/data/autori_vittime_regioni.json"
  );
  const [regione, setRegione] = useState("");
  const [codiceReato, setCodiceReato] = useState("TOT");
  const [metrica, setMetrica] = useState<Metrica>("tasso");

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

  const effectiveReato = useMemo(() => {
    if (reatiDisponibili.some((r) => r.codice === codiceReato)) return codiceReato;
    if (reatiDisponibili.some((r) => r.codice === VICTIM_DEFAULT)) return VICTIM_DEFAULT;
    return reatiDisponibili[0]?.codice ?? "TOT";
  }, [codiceReato, reatiDisponibili]);

  const regioni = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const r of data) {
      if (r.data_type === dataType && r.codice_reato === effectiveReato) {
        set.add(r.regione);
      }
    }
    return Array.from(set).sort();
  }, [data, dataType, effectiveReato]);

  // Verifica disponibilita' % minori per reato/dataType
  const hasMinori = useMemo(() => {
    if (!data) return false;
    return data.some(
      (r) =>
        r.data_type === dataType &&
        r.codice_reato === effectiveReato &&
        r.pct_minori !== null
    );
  }, [data, dataType, effectiveReato]);

  const effectiveMetrica = metrica === "pct_minori" && !hasMinori ? "tasso" : metrica;

  const getVal = (r: RegioneRecord): number | null =>
    effectiveMetrica === "tasso"
      ? r.tasso
      : effectiveMetrica === "pct_stranieri"
        ? r.pct_stranieri
        : r.pct_minori;

  // Media nazionale ponderata
  const mediaNazionale = useMemo(() => {
    if (!data) return new Map<number, number>();
    const reatoData = data.filter(
      (r) => r.data_type === dataType && r.codice_reato === effectiveReato
    );
    const anni = [...new Set(reatoData.map((r) => r.anno))];
    const map = new Map<number, number>();
    for (const anno of anni) {
      const rows = reatoData.filter((r) => r.anno === anno);
      if (effectiveMetrica === "tasso") {
        const withTasso = rows.filter((r) => r.tasso !== null);
        const totDel = withTasso.reduce((s, r) => s + r.totale, 0);
        const totPop = withTasso.reduce(
          (s, r) => s + (r.tasso! > 0 ? (r.totale / r.tasso!) * 100_000 : 0),
          0
        );
        map.set(anno, totPop > 0 ? (totDel / totPop) * 100_000 : 0);
      } else if (effectiveMetrica === "pct_stranieri") {
        const totSum = rows.reduce((s, r) => s + r.totale, 0);
        const strSum = rows.reduce((s, r) => s + r.stranieri, 0);
        map.set(anno, totSum > 0 ? (strSum / totSum) * 100 : 0);
      } else {
        const withMinori = rows.filter((r) => r.pct_minori !== null);
        const totSum = withMinori.reduce((s, r) => s + r.totale, 0);
        const minSum = withMinori.reduce((s, r) => s + r.minori, 0);
        map.set(anno, totSum > 0 ? (minSum / totSum) * 100 : 0);
      }
    }
    return map;
  }, [data, dataType, effectiveReato, effectiveMetrica]);

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const selected = regione || regioni[0] || "";
  const regioneData = data
    .filter(
      (r) =>
        r.data_type === dataType &&
        r.regione === selected &&
        r.codice_reato === effectiveReato &&
        getVal(r) !== null
    )
    .sort((a, b) => a.anno - b.anno);

  const anni = regioneData.map((r) => r.anno);
  const valori = regioneData.map((r) => getVal(r));
  const mediaNazArr = anni.map((a) =>
    Number((mediaNazionale.get(a) ?? 0).toFixed(1))
  );

  // Variazione primo-ultimo anno
  const primo = regioneData[0];
  const ultimo = regioneData[regioneData.length - 1];
  const primoVal = primo ? getVal(primo) : null;
  const ultimoVal = ultimo ? getVal(ultimo) : null;
  const variazione =
    primoVal !== null && ultimoVal !== null && primoVal > 0
      ? ((ultimoVal - primoVal) / primoVal) * 100
      : null;

  const yLabel = METRICA_LABELS[effectiveMetrica];

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label htmlFor="trend-reg-reato" className="block text-sm font-medium mb-1">
            Tipo di reato
          </label>
          <select
            id="trend-reg-reato"
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
        <div>
          <label htmlFor="trend-reg-regione" className="block text-sm font-medium mb-1">
            Regione
          </label>
          <select
            id="trend-reg-regione"
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
          <label htmlFor="trend-reg-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="trend-reg-metrica"
            value={effectiveMetrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="tasso">Tasso per 100k ab.</option>
            <option value="pct_stranieri">% stranieri</option>
            <option value="pct_minori" disabled={!hasMinori}>
              % minori{!hasMinori ? " (non disponibile)" : ""}
            </option>
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper
        ariaDescription={`Trend ${effectiveReato} per ${selected} vs media nazionale, ${yLabel}`}
      >
        <Plot
          data={[
            {
              x: anni,
              y: valori,
              mode: "lines+markers" as const,
              name: selected,
              line: { width: 3, color: COLORS.primary },
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
            xaxis: { ...AXIS_YEAR, title: { text: "Anno" } },
            yaxis: {
              ...AXIS_FIXED,
              title: { text: yLabel, font: { size: 12 } },
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

      {variazione !== null && primo && ultimo && (
        <p className="text-sm text-muted-foreground">
          <strong>
            {selected} ({primo.anno}-{ultimo.anno}):
          </strong>{" "}
          <span className={variazione < 0 ? "text-green-600" : "text-red-600"}>
            {variazione > 0 ? "+" : ""}
            {variazione.toFixed(1)}%
          </span>
        </p>
      )}
    </div>
  );
}
