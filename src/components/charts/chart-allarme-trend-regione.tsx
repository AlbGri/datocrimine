"use client";

import { useState, useMemo } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { COLORS, COLORI_ALLARME, CHART_HEIGHT_SMALL, PLOTLY_FONT, COVID_SHAPES, COVID_ANNOTATIONS, AXIS_FIXED, getAxisYear, LEGEND_BOTTOM_LEFT, varTriennale, notaTriennale, PERIODO_DELITTI } from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Plot } from "@/components/charts/plot";
import { useNotaGrafico } from "@/components/charts/grafico";

interface AllarmeRegione {
  REF_AREA: string;
  Territorio: string;
  Anno: number;
  Reato: string;
  Delitti: number;
  Popolazione: number;
  Tasso_per_100k: number;
}

interface Props {
  reato: string;
  regione: string;
}

type Metrica = "tasso" | "assoluto";

export function ChartAllarmeTrendRegione({ reato, regione }: Props) {
  const isMobile = useIsMobile();
  const { data, loading } = useFetchData<AllarmeRegione[]>(
    "/data/reati_allarme_sociale_regioni.json"
  );
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const isAssoluto = metrica === "assoluto";

  const mediaNazionale = useMemo(() => {
    if (!data) return new Map<number, number>();
    const reatoData = data.filter((d) => d.Reato === reato);
    const anni = [...new Set(reatoData.map((d) => d.Anno))];
    const map = new Map<number, number>();
    for (const anno of anni) {
      const rows = reatoData.filter((d) => d.Anno === anno);
      const totDel = rows.reduce((s, d) => s + d.Delitti, 0);
      const totPop = rows.reduce((s, d) => s + d.Popolazione, 0);
      map.set(anno, totPop > 0 ? (totDel / totPop) * 100_000 : 0);
    }
    return map;
  }, [data, reato]);

  const regioneData = useMemo(
    () =>
      (data ?? [])
        .filter((d) => d.Territorio === regione && d.Reato === reato)
        .sort((a, b) => a.Anno - b.Anno),
    [data, regione, reato],
  );

  useNotaGrafico(
    notaTriennale(
      regione,
      varTriennale(regioneData.map((d) => ({ anno: d.Anno, tasso: isAssoluto ? d.Delitti : d.Tasso_per_100k }))),
    ),
  );

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  const anni = regioneData.map((d) => d.Anno);
  const mediaNazArr = anni.map((a) =>
    Number((mediaNazionale.get(a) ?? 0).toFixed(2))
  );

  const lineColor = COLORI_ALLARME[reato] ?? COLORS.primary;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="allarme-reg-metrica" className="block text-sm font-medium mb-1">
          Metrica
        </label>
        <select
          id="allarme-reg-metrica"
          value={metrica}
          onChange={(e) => setMetrica(e.target.value as Metrica)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="tasso">Tasso per 100k ab.</option>
          <option value="assoluto">Numero assoluto</option>
        </select>
      </div>

      <Plot
        descrizione={`Grafico trend ${reato} per ${regione} vs media nazionale, ${PERIODO_DELITTI}`}
        data={[
          {
            x: anni,
            y: regioneData.map((d) => isAssoluto ? d.Delitti : d.Tasso_per_100k),
            mode: "lines+markers" as const,
            name: regione,
            hovertemplate: isAssoluto
              ? "<b>%{fullData.name}</b>: %{y:,.0f}<extra></extra>"
              : "<b>%{fullData.name}</b>: %{y:.2f} per 100k ab.<extra></extra>",
            line: { width: 3, color: lineColor },
            marker: { size: 6 },
          },
          ...(!isAssoluto ? [{
            x: anni,
            y: mediaNazArr,
            mode: "lines" as const,
            name: "Media nazionale",
            hovertemplate: "<b>%{fullData.name}</b>: %{y:.2f} per 100k ab.<extra></extra>",
            line: { width: 2, color: COLORS.mediaNazionale, dash: "dash" as const },
          }] : []),
        ]}
        key={metrica}
        layout={{
          hovermode: "x unified" as const,
          height: CHART_HEIGHT_SMALL,
          xaxis: getAxisYear(isMobile),
          yaxis: { ...AXIS_FIXED,
            title: { text: isAssoluto ? "Delitti denunciati" : "Tasso per 100k ab.", font: { size: PLOTLY_FONT.axisTitle } },
            ...(isAssoluto && { tickformat: "~s", hoverformat: ",.0f" }),
          },
          legend: LEGEND_BOTTOM_LEFT,
          margin: { l: 50, r: 20, t: 20, b: 55 },
          shapes: COVID_SHAPES,
          annotations: COVID_ANNOTATIONS,
        }}
      />
    </div>
  );
}
