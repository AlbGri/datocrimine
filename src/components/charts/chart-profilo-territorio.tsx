"use client";

import { useState, useMemo } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { AXIS_FIXED, MetricaProfilo, METRICHE_PROFILO, COLORS, MIN_CASI, TOP_N, isVoceAutonoma, CHART_HEIGHT_RANKING, CHART_HEIGHT_RANKING_MOBILE, ANNO_ULTIMO_AUTORI } from "@/lib/config";
import { fmtNum, fmtPct, fmtPctSigned } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Plot } from "@/components/charts/plot";
import { useSceltaGrafico } from "@/components/charts/grafico";
import { useParametro } from "@/lib/use-parametro";
import { CHI, type DataType } from "@/lib/persone";

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

type Metrica = MetricaProfilo;
const METRICHE = METRICHE_PROFILO;

interface Props {
  dataType: DataType;
  regione: string;
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

export function ChartProfiloTerritorio({ dataType, regione }: Props) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<RegioneRecord[]>(
    "/data/autori_vittime_regioni.json"
  );
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const [expanded, setExpanded] = useState(false);

  const anniDisponibili = useMemo(() => {
    if (!data) return [];
    const set = new Set<number>();
    for (const r of data) {
      if (r.data_type !== dataType || r.regione !== regione) continue;
      if (metrica === "tasso") {
        if (r.tasso !== null) set.add(r.anno);
      } else if (r[metrica] !== null) {
        set.add(r.anno);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [data, dataType, regione, metrica]);

  const anniTesto = anniDisponibili.map(String);
  const [annoTesto, setAnno] = useParametro("anno", anniTesto, anniTesto[0] ?? String(ANNO_ULTIMO_AUTORI));
  const anno = Number(annoTesto);
  const etichettaMetrica = METRICHE.find((m) => m.value === metrica)!.label;
  useSceltaGrafico(
    `${CHI[dataType].soggetto} per reato, ${regione}, ${anno}${metrica === "tasso" ? "" : `, ${etichettaMetrica}`}`,
    { anno },
  );

  if (loading)
    return <div className="h-[400px] sm:h-[550px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const isTasso = metrica === "tasso";
  const metricaConfig = METRICHE.find((m) => m.value === metrica)!;

  // Media nazionale per ogni reato
  const mediaNazionale = new Map<string, number>();
  const reatiPerAnno = data.filter(
    (r) => r.data_type === dataType && r.anno === anno
  );

  if (isTasso) {
    const reatoGruppo = new Map<string, RegioneRecord[]>();
    for (const r of reatiPerAnno) {
      if (r.tasso === null) continue;
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
  } else {
    const reatoGruppo = new Map<string, { sum: number; totale: number }>();
    for (const r of reatiPerAnno) {
      const val = r[metrica] as number | null;
      if (val === null || r.totale < MIN_CASI) continue;
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

  // Dati regione
  const regioneData = data.filter(
    (r) =>
      r.data_type === dataType &&
      r.regione === regione &&
      r.anno === anno &&
      isVoceAutonoma(r.codice_reato) &&
      r.totale >= MIN_CASI
  );

  // Tutti gli item ordinati per valore decrescente
  const allItems: ChartItem[] = regioneData
    .map((r) => {
      const value = isTasso ? r.tasso : (r[metrica] as number | null);
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
          <label htmlFor="profilo-reg-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="profilo-reg-metrica"
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
          <label htmlFor="profilo-anno" className="block text-sm font-medium mb-1">
            Anno
          </label>
          <select
            id="profilo-anno"
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
          descrizione={`Profilo criminale ${regione}, ${metricaConfig.label} per tipo di reato, ${anno}`}
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
              name: regione,
              hovertemplate: displayItems.map((i) => {
                const lines = [`<b>${i.reato}</b>`];
                if (isTasso) {
                  lines.push(`Tasso regione: ${fmtNum(i.value, 1)} per 100k`);
                  lines.push(`Media nazionale: ${fmtNum(i.media, 1)} per 100k`);
                } else {
                  lines.push(`${metricaConfig.label} regione: ${fmtPct(i.value)}`);
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
