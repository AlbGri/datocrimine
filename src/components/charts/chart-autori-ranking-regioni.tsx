"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { PLOTLY_CONFIG, AXIS_FIXED } from "@/lib/config";
import { fmtNum, fmtPct, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
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
  maschi: number;
  femmine: number;
  pct_stranieri: number;
  pct_minori: number | null;
  pct_maschi: number | null;
  pct_femmine: number | null;
}

type Metrica = "tasso" | "pct_stranieri" | "pct_minori" | "pct_maschi" | "pct_femmine";

interface Props {
  dataType: "OFFEND" | "VICTIM";
}

export function ChartAutoriRankingRegioni({ dataType }: Props) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<RegioneRecord[]>(
    "/data/autori_vittime_regioni.json"
  );
  const [codiceReato, setCodiceReato] = useState("TOT");
  const [anno, setAnno] = useState(2022);
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const VICTIM_DEFAULT = "CULPINJU";

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

  const anniDisponibili = useMemo(() => {
    if (!data) return [];
    const set = new Set<number>();
    for (const r of data) {
      if (r.data_type === dataType && r.codice_reato === effectiveReato) {
        set.add(r.anno);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [data, dataType, effectiveReato]);

  const effectiveAnno = useMemo(() => {
    if (anniDisponibili.includes(anno)) return anno;
    return anniDisponibili[anniDisponibili.length - 1] ?? 2022;
  }, [anno, anniDisponibili]);

  if (loading)
    return <div className="h-[400px] sm:h-[550px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const filtered = data.filter(
    (r) =>
      r.data_type === dataType &&
      r.codice_reato === effectiveReato &&
      r.anno === effectiveAnno
  );

  const hasMinori = filtered.some((r) => r.pct_minori !== null);
  const hasSesso = filtered.some((r) => r.pct_maschi !== null);
  const effectiveMetrica = (() => {
    if (metrica === "pct_minori" && !hasMinori) return "pct_stranieri";
    if ((metrica === "pct_maschi" || metrica === "pct_femmine") && !hasSesso) return "pct_stranieri";
    return metrica;
  })();

  const getValue = (r: RegioneRecord) => {
    switch (effectiveMetrica) {
      case "tasso": return r.tasso ?? 0;
      case "pct_minori": return r.pct_minori ?? 0;
      case "pct_maschi": return r.pct_maschi ?? 0;
      case "pct_femmine": return r.pct_femmine ?? 0;
      default: return r.pct_stranieri;
    }
  };

  const sorted = [...filtered].sort((a, b) => getValue(a) - getValue(b));
  const nomi = sorted.map((r) => r.regione);
  const valori = sorted.map((r) => getValue(r));

  let media = 0;
  if (effectiveMetrica === "pct_stranieri") {
    const totSum = filtered.reduce((s, r) => s + r.totale, 0);
    const strSum = filtered.reduce((s, r) => s + r.stranieri, 0);
    media = totSum > 0 ? (strSum / totSum) * 100 : 0;
  } else if (effectiveMetrica === "pct_minori") {
    const withMinori = filtered.filter((r) => r.pct_minori !== null);
    const totSum = withMinori.reduce((s, r) => s + r.totale, 0);
    const minSum = withMinori.reduce((s, r) => s + r.minori, 0);
    media = totSum > 0 ? (minSum / totSum) * 100 : 0;
  } else if (effectiveMetrica === "pct_maschi" || effectiveMetrica === "pct_femmine") {
    const field = effectiveMetrica === "pct_maschi" ? "maschi" : "femmine";
    const withData = filtered.filter((r) => r[effectiveMetrica] !== null);
    const totSum = withData.reduce((s, r) => s + r.totale, 0);
    const partSum = withData.reduce((s, r) => s + r[field], 0);
    media = totSum > 0 ? (partSum / totSum) * 100 : 0;
  } else {
    const tassiNonNull = filtered.filter((r) => r.tasso !== null);
    if (tassiNonNull.length > 0) {
      const totDel = tassiNonNull.reduce((s, r) => s + r.totale, 0);
      const totPop = tassiNonNull.reduce(
        (s, r) => s + (r.tasso! > 0 ? (r.totale / r.tasso!) * 100_000 : 0),
        0
      );
      media = totPop > 0 ? (totDel / totPop) * 100_000 : 0;
    }
  }

  const METRICA_LABELS: Record<Metrica, string> = {
    pct_stranieri: "% stranieri",
    pct_minori: "% minori",
    pct_maschi: "% maschi",
    pct_femmine: "% femmine",
    tasso: "Tasso per 100k ab.",
  };
  const etichettaMetrica = METRICA_LABELS[effectiveMetrica];
  const decimali = 1;

  const maxVal = Math.max(...valori, 0.1);
  const colors = valori.map((v) => {
    const ratio = Math.min(v / maxVal, 1);
    const gray = Math.round(240 - ratio * 200);
    return `rgb(${gray},${gray},${gray})`;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label htmlFor="ranking-reg-reato" className="block text-sm font-medium mb-1">
            Tipo di reato
          </label>
          <select
            id="ranking-reg-reato"
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
          <label htmlFor="ranking-reg-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="ranking-reg-metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="tasso">Tasso per 100k ab.</option>
            <option value="pct_stranieri">% stranieri</option>
            <option value="pct_minori" disabled={!hasMinori}>
              % minori{!hasMinori ? " (non disponibile)" : ""}
            </option>
            <option value="pct_maschi" disabled={!hasSesso}>
              % maschi{!hasSesso ? " (non disponibile)" : ""}
            </option>
            <option value="pct_femmine" disabled={!hasSesso}>
              % femmine{!hasSesso ? " (non disponibile)" : ""}
            </option>
          </select>
        </div>
        {anniDisponibili.length > 1 && (
          <div>
            <label htmlFor="ranking-reg-anno" className="block text-sm font-medium mb-1">
              Anno
            </label>
            <select
              id="ranking-reg-anno"
              value={effectiveAnno}
              onChange={(e) => setAnno(Number(e.target.value))}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              {anniDisponibili.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ChartFullscreenWrapper
        ariaDescription={`Classifica regioni per ${etichettaMetrica}, ${filtered[0]?.reato ?? effectiveReato}, ${effectiveAnno}`}
      >
        <Plot
          data={[
            {
              type: "bar",
              y: nomi,
              x: valori,
              orientation: "h" as const,
              marker: { color: colors },
              text: valori.map((v) => effectiveMetrica !== "tasso" ? fmtPct(v, decimali) : fmtNum(v, decimali)),
              textposition: "outside" as const,
              hovertemplate: (() => {
                const base = "<b>%{y}</b><br>";
                switch (effectiveMetrica) {
                  case "pct_stranieri": return base + "Stranieri: %{x:.1f}%<br>Totale: %{customdata[0]:,.0f}<br>Stranieri: %{customdata[1]:,.0f}<extra></extra>";
                  case "pct_minori": return base + "Minori: %{x:.1f}%<br>Totale: %{customdata[0]:,.0f}<br>Minori: %{customdata[2]:,.0f}<extra></extra>";
                  case "pct_maschi": return base + "Maschi: %{x:.1f}%<br>Totale: %{customdata[0]:,.0f}<br>Maschi: %{customdata[3]:,.0f}<extra></extra>";
                  case "pct_femmine": return base + "Femmine: %{x:.1f}%<br>Totale: %{customdata[0]:,.0f}<br>Femmine: %{customdata[4]:,.0f}<extra></extra>";
                  default: return base + "Tasso: %{x:.1f} per 100k<br>Totale: %{customdata[0]:,.0f}<extra></extra>";
                }
              })(),
              customdata: sorted.map((r) => [
                r.totale,
                r.stranieri,
                r.minori,
                r.maschi,
                r.femmine,
              ]),
            },
          ]}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            xaxis: {
              ...AXIS_FIXED,
              title: { text: etichettaMetrica },
              range: effectiveMetrica !== "tasso" ? [0, 100] : [0, maxVal * 1.2],
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
                text: `Media: ${fmtNum(media, decimali)}`,
                showarrow: false,
                font: { size: 10, color: "#dc2626" },
                xanchor: "left",
                yanchor: "bottom",
                xshift: 4,
              },
            ],
            height: isMobile ? 500 : 550,
            margin: { l: isMobile ? 130 : 180, r: 60, t: 10, b: 40 },
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>
    </div>
  );
}
