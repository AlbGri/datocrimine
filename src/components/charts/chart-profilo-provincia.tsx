"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import { PLOTLY_CONFIG, AXIS_FIXED } from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { useFilterSync } from "@/lib/filter-sync-context";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ProvinciaRecord {
  data_type: "OFFEND" | "VICTIM";
  ref_area: string;
  provincia: string;
  regione: string;
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

interface PopolazioneRecord {
  REF_AREA: string;
  Territorio: string;
  Anno: number;
  Popolazione: number;
}

interface Props {
  dataType: "OFFEND" | "VICTIM";
}

export function ChartProfiloProvincia({ dataType }: Props) {
  const isMobile = useIsMobile();
  const { data: provData, loading: l1, error: e1 } = useFetchData<ProvinciaRecord[]>(
    "/data/autori_vittime_province.json"
  );
  const { data: popData, loading: l2, error: e2 } = useFetchData<PopolazioneRecord[]>(
    "/data/delitti_province.json"
  );
  const [selectedProvincia, setSelectedProvincia] = useState<string | null>(null);
  const [selectedAnno, setSelectedAnno] = useState<number | null>(null);

  const popMap = useMemo(() => {
    if (!popData) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const r of popData) {
      m.set(`${r.REF_AREA}|${r.Anno}`, r.Popolazione);
    }
    return m;
  }, [popData]);

  const province = useMemo(() => {
    if (!provData) return [];
    const map = new Map<string, string>();
    for (const r of provData) {
      if (r.data_type === dataType) map.set(r.provincia, r.regione);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "it"))
      .map(([provincia, regione]) => ({ provincia, regione }));
  }, [provData, dataType]);

  const provincia = selectedProvincia && province.some((p) => p.provincia === selectedProvincia)
    ? selectedProvincia
    : province[0]?.provincia ?? "Agrigento";

  // Sync regione: quando arriva broadcast regione, seleziona la prima provincia di quella regione
  const setRegioneForSync = useCallback((v: string) => {
    const match = province.find((p) => p.regione === v);
    if (match) setSelectedProvincia(match.provincia);
  }, [province]);
  useFilterSync("regione", province.find((p) => p.provincia === provincia)?.regione ?? "", setRegioneForSync);

  const anniDisponibili = useMemo(() => {
    if (!provData) return [];
    const set = new Set<number>();
    for (const r of provData) {
      if (r.data_type === dataType && r.provincia === provincia) {
        set.add(r.anno);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [provData, dataType, provincia]);

  const anno = selectedAnno && anniDisponibili.includes(selectedAnno)
    ? selectedAnno
    : anniDisponibili[0] ?? 2024;

  const loading = l1 || l2;
  const error = e1 || e2;

  if (loading)
    return <div className="h-[400px] sm:h-[550px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!provData || !popData) return null;

  // Media nazionale (tasso per 100k) per ogni reato
  const mediaNazionale = new Map<string, number>();
  const reatoGruppo = new Map<string, { totale: number; popolazione: number }>();
  for (const r of provData.filter(
    (r) => r.data_type === dataType && r.anno === anno && r.codice_reato !== "TOT"
  )) {
    const pop = popMap.get(`${r.ref_area}|${anno}`);
    if (!pop || pop === 0) continue;
    if (!reatoGruppo.has(r.codice_reato)) {
      reatoGruppo.set(r.codice_reato, { totale: 0, popolazione: 0 });
    }
    const g = reatoGruppo.get(r.codice_reato)!;
    g.totale += r.totale;
    g.popolazione += pop;
  }
  for (const [codice, g] of reatoGruppo) {
    if (g.popolazione > 0) {
      mediaNazionale.set(codice, (g.totale / g.popolazione) * 100_000);
    }
  }

  const refArea = provData.find(
    (r) => r.provincia === provincia && r.data_type === dataType
  )?.ref_area;
  const pop = refArea ? popMap.get(`${refArea}|${anno}`) : undefined;

  const provinciaData = provData.filter(
    (r) =>
      r.data_type === dataType &&
      r.provincia === provincia &&
      r.anno === anno &&
      r.codice_reato !== "TOT"
  );

  const items = provinciaData
    .map((r) => {
      const media = mediaNazionale.get(r.codice_reato);
      if (!media || media === 0) return null;
      const tasso = pop && pop > 0 ? (r.totale / pop) * 100_000 : null;
      if (tasso === null) return null;
      const scostamento = ((tasso - media) / media) * 100;
      return {
        reato: r.reato,
        codice: r.codice_reato,
        tasso,
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
          <label htmlFor="profilo-provincia" className="text-sm font-medium mb-1 flex items-center">
            Provincia
          </label>
          <select
            id="profilo-provincia"
            value={provincia}
            onChange={(e) => setSelectedProvincia(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {province.map((p) => (
              <option key={p.provincia} value={p.provincia}>
                {p.provincia} ({p.regione})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="profilo-prov-anno" className="block text-sm font-medium mb-1">
            Anno
          </label>
          <select
            id="profilo-prov-anno"
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
        ariaDescription={`Profilo criminale ${provincia}, tasso per 100k abitanti per tipo di reato, ${anno}`}
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
              name: provincia,
              hovertemplate: items.map(
                (i) =>
                  `<b>${i.reato}</b><br>` +
                  `Tasso provincia: ${i.tasso.toFixed(1)} per 100k<br>` +
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
