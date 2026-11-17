"use client";

import { useState, useMemo } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT_SMALL,
  PLOTLY_FONT,
  COVID_SHAPES,
  getCovidAnnotations,
  AXIS_FIXED,
  getAxisYear,
  getLegendMultiSeries,
  BREAKDOWN_LINES,
  VICTIM_DEFAULT,
  PERIODO_AUTORI,
} from "@/lib/config";
import { fmtPctSigned } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { NotaIngiuriePersone } from "@/components/charts/nota-ingiurie";
import { Plot } from "@/components/charts/plot";
import { useNotaGrafico, useSceltaGrafico } from "@/components/charts/grafico";
import { useReatoScelto } from "@/lib/use-parametro";
import { CHI, type DataType } from "@/lib/persone";

interface RegioneRecord {
  data_type: DataType;
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
  dataType: DataType;
  regione: string;
}

type Metrica = "tasso" | "assoluto";

export function ChartAutoriTrendRegione({ dataType, regione }: Props) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<RegioneRecord[]>(
    "/data/autori_vittime_regioni.json"
  );
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const isAssoluto = metrica === "assoluto";

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

  const reato = useReatoScelto(reatiDisponibili, VICTIM_DEFAULT);
  const effectiveReato = reato.codice;

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

  const regioneData = (data ?? [])
    .filter(
      (r) =>
        r.data_type === dataType &&
        r.regione === regione &&
        r.codice_reato === effectiveReato
    )
    .sort((a, b) => a.anno - b.anno);
  const conTasso = regioneData.filter((r) => r.tasso !== null);

  // Variazione primo-ultimo anno
  const serie = isAssoluto
    ? regioneData.map((r) => ({ anno: r.anno, valore: r.totale }))
    : conTasso.map((r) => ({ anno: r.anno, valore: r.tasso! }));
  const primo = serie[0];
  const ultimo = serie[serie.length - 1];
  const variazione =
    serie.length >= 2 && primo.valore > 0 ? ((ultimo.valore - primo.valore) / primo.valore) * 100 : null;

  useNotaGrafico(
    variazione === null
      ? null
      : `${regione}: ${fmtPctSigned(variazione)} dal ${primo.anno} al ${ultimo.anno}, ${isAssoluto ? "numero assoluto" : "tasso per 100k ab."}`,
  );
  const periodo = regioneData.length
    ? `${regioneData[0].anno}-${regioneData[regioneData.length - 1].anno}`
    : PERIODO_AUTORI;
  useSceltaGrafico(`${reato.nome}, ${CHI[dataType].titolo}, ${regione}, ${periodo}`, {
    reato: reato.nome,
  });

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const anni = regioneData.map((r) => r.anno);

  // Tasso regione + media nazionale su asse sinistro
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
      name: regione,
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
      line: { width: 2, color: COLORS.mediaNazionale, dash: "dash" as const },
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
            onChange={(e) => reato.imposta(e.target.value)}
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

      <Plot
        descrizione={`Trend ${reato.nome} per ${regione} vs media nazionale con composizione %`}
        key={metrica}
        data={traces}
        layout={{
          hovermode: "closest" as const,
          height: CHART_HEIGHT_SMALL,
          xaxis: getAxisYear(isMobile),
          yaxis: {
            ...AXIS_FIXED,
            title: {
              text: isAssoluto ? CHI[dataType].etichetta : "Tasso per 100k ab.",
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
          legend: getLegendMultiSeries(isMobile),
          margin: isMobile
            ? { l: 45, r: 45, t: 40, b: 60 }
            : { l: 60, r: 60, t: 30, b: 80 },
          shapes: COVID_SHAPES,
          annotations: getCovidAnnotations(isMobile),
        }}
      />

      {effectiveReato === "TOT" && <NotaIngiuriePersone />}
    </div>
  );
}
