"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT_SMALL,
  PLOTLY_CONFIG,
  PLOTLY_FONT,
  COVID_SHAPES,
  getCovidAnnotations,
  AXIS_FIXED,
  getAxisYear,
  BREAKDOWN_LINES,
  VICTIM_DEFAULT,
} from "@/lib/config";
import { fmtPctSigned, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { useFilterSync, SyncButton } from "@/lib/filter-sync-context";

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

type Metrica = "tasso" | "assoluto";

export function ChartAutoriTrendRegione({ dataType }: Props) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<RegioneRecord[]>(
    "/data/autori_vittime_regioni.json"
  );
  const [regione, setRegione] = useState("");
  const setRegioneStable = useCallback((v: string) => setRegione(v), []);
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
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [data, dataType, effectiveReato]);

  const effectiveRegione = regione || regioni[0] || "";
  const { handleSync } = useFilterSync("regione", effectiveRegione, setRegioneStable);

  // Media nazionale ponderata per il tasso
  const mediaNazionaleTasso = useMemo(() => {
    if (!data) return new Map<number, number>();
    const reatoData = data.filter(
      (r) => r.data_type === dataType && r.codice_reato === effectiveReato
    );
    const anni = [...new Set(reatoData.map((r) => r.anno))];
    const map = new Map<number, number>();
    for (const anno of anni) {
      const rows = reatoData.filter((r) => r.anno === anno);
      const withTasso = rows.filter((r) => r.tasso !== null);
      const totDel = withTasso.reduce((s, r) => s + r.totale, 0);
      const totPop = withTasso.reduce(
        (s, r) => s + (r.tasso! > 0 ? (r.totale / r.tasso!) * 100_000 : 0),
        0
      );
      map.set(anno, totPop > 0 ? (totDel / totPop) * 100_000 : 0);
    }
    return map;
  }, [data, dataType, effectiveReato]);

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const isAssoluto = metrica === "assoluto";
  const selected = regione || regioni[0] || "";
  const regioneData = data
    .filter(
      (r) =>
        r.data_type === dataType &&
        r.regione === selected &&
        r.codice_reato === effectiveReato
    )
    .sort((a, b) => a.anno - b.anno);

  const anni = regioneData.map((r) => r.anno);

  // Tasso regione + media nazionale su asse sinistro
  const conTasso = regioneData.filter((r) => r.tasso !== null);
  const anniTasso = conTasso.map((r) => r.anno);
  const valoriTasso = conTasso.map((r) => r.tasso);
  const mediaNazArr = anniTasso.map((a) =>
    Number((mediaNazionaleTasso.get(a) ?? 0).toFixed(1))
  );

  const hoverTpl = isAssoluto
    ? "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:,.0f}<extra></extra>"
    : "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:.2f} per 100k ab.<extra></extra>";

  const traces: Plotly.Data[] = [
    {
      x: isAssoluto ? anni : anniTasso,
      y: isAssoluto ? regioneData.map((r) => r.totale) : valoriTasso,
      mode: "lines+markers" as const,
      name: selected,
      hovertemplate: hoverTpl,
      line: { width: 3, color: COLORS.primary },
      marker: { size: 6 },
      yaxis: "y",
    },
    ...(!isAssoluto ? [{
      x: anniTasso,
      y: mediaNazArr,
      mode: "lines" as const,
      name: "Media nazionale",
      hovertemplate: "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:.2f} per 100k ab.<extra></extra>",
      line: { width: 2, color: COLORS.grigioMedia, dash: "dash" as const },
      yaxis: "y" as const,
    }] : []),
  ];

  // Linee breakdown % su asse destro
  for (const bd of BREAKDOWN_LINES) {
    const values = regioneData.map((r) => r[bd.key]);
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

  // Variazione primo-ultimo anno
  let variazione: number | null = null;
  let annoInizio: number | null = null;
  let annoFine: number | null = null;
  if (isAssoluto) {
    if (regioneData.length >= 2) {
      const primo = regioneData[0];
      const ultimo = regioneData[regioneData.length - 1];
      if (primo.totale > 0) {
        variazione = ((ultimo.totale - primo.totale) / primo.totale) * 100;
        annoInizio = primo.anno;
        annoFine = ultimo.anno;
      }
    }
  } else if (conTasso.length >= 2) {
    const primo = conTasso[0];
    const ultimo = conTasso[conTasso.length - 1];
    if (primo.tasso! > 0) {
      variazione = ((ultimo.tasso! - primo.tasso!) / primo.tasso!) * 100;
      annoInizio = primo.anno;
      annoFine = ultimo.anno;
    }
  }

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
          <label htmlFor="trend-reg-regione" className="text-sm font-medium mb-1 flex items-center">
            Regione
            <SyncButton onClick={() => handleSync()} />
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
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="tasso">Tasso per 100k ab.</option>
            <option value="assoluto">Numero assoluto</option>
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper
        ariaDescription={`Trend ${effectiveReato} per ${selected} vs media nazionale con composizione %`}
      >
        <Plot
          key={metrica}
          data={traces}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            dragmode: false as const,
            hovermode: "closest" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: CHART_HEIGHT_SMALL,
            xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
            yaxis: {
              ...AXIS_FIXED,
              title: {
                text: isAssoluto ? (dataType === "OFFEND" ? "Autori denunciati" : "Vittime") : "Tasso per 100k ab.",
                font: { color: COLORS.primary, size: PLOTLY_FONT.axisTitle },
              },
              ...(isAssoluto && { tickformat: "~s", hoverformat: ",.0f" }),
              tickfont: { color: COLORS.primary },
              side: "left",
            },
            yaxis2: {
              ...AXIS_FIXED,
              title: { text: "%", font: { size: PLOTLY_FONT.axisTitle } },
              overlaying: "y" as const,
              side: "right",
              range: [0, 100],
              showgrid: false,
            },
            legend: isMobile
              ? {
                  x: 0.5,
                  y: -0.3,
                  xanchor: "center" as const,
                  yanchor: "top" as const,
                  orientation: "h" as const,
                  font: { size: PLOTLY_FONT.legendMobile },
                }
              : {
                  x: 0.5,
                  y: 1.08,
                  xanchor: "center" as const,
                  orientation: "h" as const,
                },
            margin: isMobile
              ? { l: 45, r: 45, t: 40, b: 60 }
              : { l: 60, r: 60, t: 30, b: 80 },
            shapes: COVID_SHAPES,
            annotations: getCovidAnnotations(isMobile),
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      {variazione !== null && annoInizio !== null && annoFine !== null && (
        <p className="text-sm text-muted-foreground">
          <strong>
            {selected} ({annoInizio}-{annoFine}):
          </strong>{" "}
          <span className={variazione < 0 ? "text-green-600" : "text-red-600"}>
            {fmtPctSigned(variazione)}
          </span>{" "}
          {isAssoluto ? "numero assoluto" : "tasso per 100k ab."}
        </p>
      )}
    </div>
  );
}
