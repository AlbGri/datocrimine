"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { PLOTLY_CONFIG, AXIS_FIXED } from "@/lib/config";
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

export function ChartProfiloTerritorio({ dataType }: Props) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<RegioneRecord[]>(
    "/data/autori_vittime_regioni.json"
  );
  const [selectedRegione, setSelectedRegione] = useState<string | null>(null);
  const setRegioneStable = useCallback((v: string) => setSelectedRegione(v), []);
  const [selectedAnno, setSelectedAnno] = useState<number | null>(null);

  const regioni = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const r of data) {
      if (r.data_type === dataType) set.add(r.regione);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [data, dataType]);

  const regione = selectedRegione && regioni.includes(selectedRegione)
    ? selectedRegione
    : regioni[0] ?? "Abruzzo";

  const { handleSync } = useFilterSync("regione", regione, setRegioneStable);

  const anniDisponibili = useMemo(() => {
    if (!data) return [];
    const set = new Set<number>();
    for (const r of data) {
      if (r.data_type === dataType && r.regione === regione && r.tasso !== null) {
        set.add(r.anno);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [data, dataType, regione]);

  const anno = selectedAnno && anniDisponibili.includes(selectedAnno)
    ? selectedAnno
    : anniDisponibili[0] ?? 2024;

  if (loading)
    return <div className="h-[400px] sm:h-[550px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  // Media nazionale (tasso per 100k) per ogni reato nell'anno selezionato
  const mediaNazionale = new Map<string, number>();
  const reatiPerAnno = data.filter(
    (r) => r.data_type === dataType && r.anno === anno && r.tasso !== null
  );
  const reatoGruppo = new Map<string, RegioneRecord[]>();
  for (const r of reatiPerAnno) {
    if (!reatoGruppo.has(r.codice_reato)) reatoGruppo.set(r.codice_reato, []);
    reatoGruppo.get(r.codice_reato)!.push(r);
  }
  for (const [codice, records] of reatoGruppo) {
    const totDel = records.reduce((s, r) => s + r.totale, 0);
    const totPop = records.reduce(
      (s, r) => s + (r.tasso! > 0 ? (r.totale / r.tasso!) * 100_000 : 0),
      0
    );
    if (totPop > 0) mediaNazionale.set(codice, (totDel / totPop) * 100_000);
  }

  // Dati regione selezionata
  const regioneData = data.filter(
    (r) =>
      r.data_type === dataType &&
      r.regione === regione &&
      r.anno === anno &&
      r.tasso !== null &&
      r.codice_reato !== "TOT"
  );

  const items = regioneData
    .map((r) => {
      const media = mediaNazionale.get(r.codice_reato);
      if (!media || media === 0) return null;
      const scostamento = ((r.tasso! - media) / media) * 100;
      return {
        reato: r.reato,
        codice: r.codice_reato,
        tasso: r.tasso!,
        media,
        scostamento,
        totale: r.totale,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.tasso - b.tasso);

  const nomi = items.map((i) => i.reato);
  const valori = items.map((i) => i.tasso);
  const medieNaz = items.map((i) => i.media);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label htmlFor="profilo-regione" className="text-sm font-medium mb-1 flex items-center">
            Regione
            <SyncButton onClick={() => handleSync()} />
          </label>
          <select
            id="profilo-regione"
            value={regione}
            onChange={(e) => setSelectedRegione(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {regioni.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="profilo-anno" className="block text-sm font-medium mb-1">
            Anno
          </label>
          <select
            id="profilo-anno"
            value={anno}
            onChange={(e) => setSelectedAnno(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {anniDisponibili.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper
        ariaDescription={`Profilo criminale ${regione}, tasso per 100k abitanti per tipo di reato, ${anno}`}
      >
        <Plot
          data={[
            {
              type: "bar",
              y: nomi,
              x: valori,
              orientation: "h" as const,
              marker: { color: "#2563eb" },
              text: valori.map((v) => v.toFixed(1)),
              textposition: "outside" as const,
              name: regione,
              hovertemplate: items.map(
                (i) =>
                  `<b>${i.reato}</b><br>` +
                  `Tasso regione: ${i.tasso.toFixed(1)} per 100k<br>` +
                  `Media nazionale: ${i.media.toFixed(1)} per 100k<br>` +
                  `Scostamento: ${i.scostamento >= 0 ? "+" : ""}${i.scostamento.toFixed(1)}%<br>` +
                  `Denunce: ${i.totale.toLocaleString("it-IT")}` +
                  `<extra></extra>`
              ),
            },
            {
              type: "scatter",
              y: nomi,
              x: medieNaz,
              mode: "markers" as const,
              marker: { color: "#dc2626", symbol: "line-ns", size: 14, line: { width: 2, color: "#dc2626" } },
              name: "Media nazionale",
              hovertemplate: nomi.map(
                (n, idx) => `<b>${n}</b><br>Media nazionale: ${medieNaz[idx].toFixed(1)} per 100k<extra></extra>`
              ),
            },
          ]}
          layout={{
            xaxis: {
              ...AXIS_FIXED,
              title: { text: "Tasso per 100k abitanti" },
            },
            yaxis: { ...AXIS_FIXED, automargin: true },
            height: isMobile ? 500 : Math.max(550, items.length * 28),
            margin: { l: isMobile ? 140 : 200, r: 70, t: 10, b: 40 },
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            showlegend: true,
            legend: { orientation: "h" as const, y: -0.15, x: 0.5, xanchor: "center" as const },
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>
    </div>
  );
}
