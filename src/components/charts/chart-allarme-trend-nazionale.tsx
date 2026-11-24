"use client";

import { useState, useMemo } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { COLORS, COLORI_ALLARME, CHART_HEIGHT_SMALL, PLOTLY_FONT, COVID_SHAPES, COVID_ANNOTATIONS, AXIS_FIXED, getAxisYear, PERIODO_DELITTI } from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Plot } from "@/components/charts/plot";

interface ReatoAllarme {
  Anno: number;
  Reato: string;
  Delitti: number;
  Popolazione: number;
  Tasso_per_100k: number;
}

type Metrica = "tasso" | "assoluto";

interface Props {
  reatoSelezionato: string;
}

export function ChartAllarmeTrendNazionale({ reatoSelezionato }: Props) {
  const isMobile = useIsMobile();
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const { data, loading } = useFetchData<ReatoAllarme[]>(
    "/data/reati_allarme_sociale.json"
  );

  const isAssoluto = metrica === "assoluto";

  const traces = useMemo(() => {
    if (!data) return [];
    // La voce scelta per ultima, cosi' e' disegnata sopra le altre
    const reati = [...new Set(data.map((d) => d.Reato))].sort(
      (a, b) => Number(a === reatoSelezionato) - Number(b === reatoSelezionato),
    );
    return reati.map((reato) => {
      const filtered = data
        .filter((d) => d.Reato === reato)
        .sort((a, b) => a.Anno - b.Anno);
      const isSelected = reato === reatoSelezionato;
      return {
        x: filtered.map((d) => d.Anno),
        y: filtered.map((d) => isAssoluto ? d.Delitti : d.Tasso_per_100k),
        // Serie di confronto (stile comune, sezione 7): le altre in grigio pieno, il nome al passaggio
        mode: isSelected ? ("lines+markers" as const) : ("lines" as const),
        name: reato,
        hovertemplate: isAssoluto
          ? "<b>%{fullData.name}</b><br>Anno: %{x}<br>Delitti: %{y:,.0f}<extra></extra>"
          : "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:.2f} per 100k ab.<extra></extra>",
        line: {
          width: isSelected ? 3 : 1,
          color: isSelected ? (COLORI_ALLARME[reato] ?? COLORS.altro) : COLORS.altro,
        },
        marker: { size: 7 },
      };
    });
  }, [data, reatoSelezionato, isAssoluto]);

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="allarme-naz-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="allarme-naz-metrica"
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
          descrizione={`Grafico trend nazionale reati allarme sociale ${PERIODO_DELITTI}, evidenziato: ${reatoSelezionato}`}
          key={metrica}
          data={traces}
          layout={{
          hovermode: "closest" as const,
          height: CHART_HEIGHT_SMALL,
          xaxis: getAxisYear(isMobile),
          yaxis: { ...AXIS_FIXED, title: { text: isAssoluto ? "Delitti denunciati" : "Tasso per 100k ab.", font: { size: PLOTLY_FONT.axisTitle } }, ...(isAssoluto && { tickformat: "~s", hoverformat: ",.0f" }) },
          // La voce scelta e' nel titolo, le altre al passaggio
          showlegend: false,
          margin: { l: 50, r: 20, t: 20, b: 55 },
          shapes: COVID_SHAPES,
          annotations: COVID_ANNOTATIONS,
        }}
      />
    </div>
  );
}
