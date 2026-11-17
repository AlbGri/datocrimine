"use client";

import { useState, useMemo } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { AXIS_FIXED, MetricaProfilo, METRICHE_PROFILO, COLORS, MIN_CASI, TOP_N, isVoceAutonoma, CHART_HEIGHT_RANKING, CHART_HEIGHT_RANKING_MOBILE, ANNO_ULTIMO_AUTORI } from "@/lib/config";
import { fmtNum, fmtPct, fmtPctSigned, nomeProvincia } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Plot } from "@/components/charts/plot";
import { useSceltaGrafico } from "@/components/charts/grafico";
import { useParametro } from "@/lib/use-parametro";
import { CHI, type DataType } from "@/lib/persone";

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

type Metrica = MetricaProfilo;
const METRICHE = METRICHE_PROFILO;

interface Props {
  dataType: DataType;
  provincia: string;
}

interface ChartItem {
  reato: string;
  value: number;
  media: number;
  scostamento: number;
  totale: number;
  isAltro?: boolean;
  altroCount?: number;
}

export function ChartProfiloProvincia({ dataType, provincia }: Props) {
  const isMobile = useIsMobile();
  const { data: provData, loading: l1, error: e1 } = useFetchData<ProvinciaRecord[]>(
    "/data/autori_vittime_province.json"
  );
  const { data: popData, loading: l2, error: e2 } = useFetchData<PopolazioneRecord[]>(
    "/data/delitti_province.json"
  );
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const [expanded, setExpanded] = useState(false);

  const popMap = useMemo(() => {
    if (!popData) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const r of popData) {
      m.set(`${r.REF_AREA}|${r.Anno}`, r.Popolazione);
    }
    return m;
  }, [popData]);

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

  const anniTesto = anniDisponibili.map(String);
  const [annoTesto, setAnno] = useParametro("anno", anniTesto, anniTesto[0] ?? String(ANNO_ULTIMO_AUTORI));
  const anno = Number(annoTesto);
  const etichettaMetrica = METRICHE.find((m) => m.value === metrica)!.label;
  useSceltaGrafico(
    `${CHI[dataType].soggetto} per reato, ${nomeProvincia(provincia)}, ${anno}${metrica === "tasso" ? "" : `, ${etichettaMetrica}`}`,
    { anno },
  );

  const loading = l1 || l2;
  const error = e1 || e2;

  if (loading)
    return <div className="h-[400px] sm:h-[550px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!provData || !popData) return null;

  const isTasso = metrica === "tasso";
  const metricaConfig = METRICHE.find((m) => m.value === metrica)!;

  // Media nazionale per ogni reato
  const mediaNazionale = new Map<string, number>();

  if (isTasso) {
    const reatoGruppo = new Map<string, { totale: number; popolazione: number }>();
    for (const r of provData.filter(
      (r) => r.data_type === dataType && r.anno === anno && isVoceAutonoma(r.codice_reato)
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
  } else {
    const reatoGruppo = new Map<string, { sum: number; totale: number }>();
    for (const r of provData.filter(
      (r) => r.data_type === dataType && r.anno === anno && isVoceAutonoma(r.codice_reato) && r.totale >= MIN_CASI
    )) {
      const val = r[metrica] as number | null;
      if (val === null) continue;
      if (!reatoGruppo.has(r.codice_reato)) {
        reatoGruppo.set(r.codice_reato, { sum: 0, totale: 0 });
      }
      const g = reatoGruppo.get(r.codice_reato)!;
      g.sum += val * r.totale;
      g.totale += r.totale;
    }
    for (const [codice, g] of reatoGruppo) {
      if (g.totale > 0) mediaNazionale.set(codice, g.sum / g.totale);
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
      isVoceAutonoma(r.codice_reato) &&
      r.totale >= MIN_CASI
  );

  // Tutti gli item ordinati per valore decrescente
  const allItems: ChartItem[] = provinciaData
    .map((r) => {
      let value: number | null;
      if (isTasso) {
        value = pop && pop > 0 ? (r.totale / pop) * 100_000 : null;
      } else {
        value = r[metrica] as number | null;
      }
      if (value === null) return null;
      const media = mediaNazionale.get(r.codice_reato);
      if (!media || media === 0) return null;
      const scostamento = ((value - media) / media) * 100;
      return { reato: r.reato, value, media, scostamento, totale: r.totale };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.value - a.value);

  const needsGrouping = allItems.length > TOP_N;

  let displayItems: ChartItem[];
  if (!needsGrouping || expanded) {
    displayItems = [...allItems].reverse();
  } else {
    const topItems = allItems.slice(0, TOP_N);
    const restItems = allItems.slice(TOP_N);

    let altroValue: number;
    let altroMedia: number;
    if (isTasso) {
      altroValue = restItems.reduce((s, i) => s + i.value, 0);
      altroMedia = restItems.reduce((s, i) => s + i.media, 0);
    } else {
      const totW = restItems.reduce((s, i) => s + i.totale, 0);
      altroValue = totW > 0
        ? restItems.reduce((s, i) => s + i.value * i.totale, 0) / totW
        : 0;
      altroMedia = totW > 0
        ? restItems.reduce((s, i) => s + i.media * i.totale, 0) / totW
        : 0;
    }
    const altroScost = altroMedia > 0 ? ((altroValue - altroMedia) / altroMedia) * 100 : 0;

    const altro: ChartItem = {
      reato: `Altro (${restItems.length} reati)`,
      value: altroValue,
      media: altroMedia,
      scostamento: altroScost,
      totale: restItems.reduce((s, i) => s + i.totale, 0),
      isAltro: true,
      altroCount: restItems.length,
    };

    displayItems = [altro, ...topItems.reverse()];
  }

  const nomi = displayItems.map((i) => i.reato);
  const valori = displayItems.map((i) => i.value);
  const medieNaz = displayItems.map((i) => i.media);
  const barColors = displayItems.map((i) =>
    i.isAltro ? COLORS.grigioAltro : metricaConfig.color
  );

  const nBars = displayItems.length;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label htmlFor="profilo-prov-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="profilo-prov-metrica"
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
          <label htmlFor="profilo-prov-anno" className="block text-sm font-medium mb-1">
            Anno
          </label>
          <select
            id="profilo-prov-anno"
            value={anno}
            onChange={(e) => setAnno(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {anniDisponibili.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <Plot
          descrizione={`Profilo criminale ${provincia}, ${metricaConfig.label} per tipo di reato, ${anno}`}
          data={[
            {
              type: "bar",
              y: nomi,
              x: valori,
              orientation: "h" as const,
              marker: { color: barColors },
              text: valori.map((v) =>
                isTasso ? fmtNum(v, 1) : fmtPct(v)
              ),
              textposition: "outside" as const,
              name: provincia,
              hovertemplate: displayItems.map((i) => {
                const lines = [`<b>${i.reato}</b>`];
                if (isTasso) {
                  lines.push(`Tasso provincia: ${fmtNum(i.value, 1)} per 100k`);
                  lines.push(`Media nazionale: ${fmtNum(i.media, 1)} per 100k`);
                } else {
                  lines.push(`${metricaConfig.label} provincia: ${fmtPct(i.value)}`);
                  lines.push(`${metricaConfig.label} nazionale: ${fmtPct(i.media)}`);
                }
                lines.push(
                  `Scostamento: ${fmtPctSigned(i.scostamento)}`
                );
                lines.push(`Denunce: ${fmtNum(i.totale)}`);
                return lines.join("<br>") + "<extra></extra>";
              }),
            },
            {
              type: "scatter",
              y: nomi,
              x: medieNaz,
              mode: "markers" as const,
              marker: { color: COLORS.mediaNazionale, symbol: "line-ns", size: 14, line: { width: 2, color: COLORS.mediaNazionale } },
              name: "Media nazionale",
              hovertemplate: nomi.map(
                (n, idx) => {
                  const val = fmtNum(medieNaz[idx], 1);
                  return `<b>${n}</b><br>Media nazionale: ${val}${isTasso ? " per 100k" : "%"}<extra></extra>`;
                }
              ),
            },
          ]}
          layout={{
            xaxis: {
              ...AXIS_FIXED,
              title: { text: metricaConfig.label },
            },
            yaxis: { ...AXIS_FIXED, automargin: true },
            height: isMobile ? CHART_HEIGHT_RANKING_MOBILE : Math.max(CHART_HEIGHT_RANKING, nBars * 28),
            margin: { l: isMobile ? 140 : 200, r: 70, t: 10, b: 40 },
            showlegend: true,
            legend: { orientation: "h" as const, y: -0.15, x: 0.5, xanchor: "center" as const },
          }}
        />

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
    </div>
  );
}
