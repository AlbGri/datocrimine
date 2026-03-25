"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT_SMALL,
  PLOTLY_CONFIG,
  COVID_SHAPES,
  COVID_ANNOTATIONS,
  AXIS_FIXED,
  getAxisYear,
  varTriennale,
  TRIENNALE_PERIODI,
} from "@/lib/config";
import { fmtPctSigned, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { useFilterSync, SyncButton } from "@/lib/filter-sync-context";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface AllarmeProvincia {
  REF_AREA: string;
  Territorio: string;
  Anno: number;
  Reato: string;
  Delitti: number;
  Regione: string;
  Popolazione: number;
  Tasso_per_100k: number;
}

const COLORI_ALLARME: Record<string, string> = {
  "Omicidi volontari consumati": COLORS.omicidi,
  "Tentati omicidi": COLORS.tentati_omicidi,
  "Violenze sessuali": COLORS.violenze_sessuali,
  "Atti sessuali con minorenne": COLORS.atti_minori,
  "Rapine in abitazione": COLORS.rapine_abitazione,
  "Sequestri di persona": COLORS.sequestri,
};

interface Props {
  reato: string;
}

type Metrica = "tasso" | "assoluto";

export function ChartAllarmeTrendProvincia({ reato }: Props) {
  const isMobile = useIsMobile();
  const { data, loading } = useFetchData<AllarmeProvincia[]>(
    "/data/reati_allarme_sociale_province.json"
  );
  const [regione, setRegione] = useState<string>("");
  const [provincia, setProvincia] = useState<string>("");
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const setRegioneStable = useCallback((v: string) => { setRegione(v); setProvincia(""); }, []);

  const regioni = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((d) => d.Regione))].sort((a, b) => a.localeCompare(b, "it"));
  }, [data]);

  const selectedRegione = regione || regioni[0] || "";
  const { handleSync } = useFilterSync("regione", selectedRegione, setRegioneStable);

  const province = useMemo(() => {
    if (!data) return [];
    return [...new Set(
      data
        .filter((d) => d.Regione === selectedRegione && d.Reato === reato)
        .map((d) => d.Territorio)
    )].sort((a, b) => a.localeCompare(b, "it"));
  }, [data, selectedRegione, reato]);

  const selectedProvincia = province.includes(provincia)
    ? provincia
    : province[0] || "";

  // Media regionale ponderata per anno per il reato selezionato
  const mediaRegionale = useMemo(() => {
    if (!data) return new Map<number, number>();
    const reatoRegione = data.filter(
      (d) => d.Regione === selectedRegione && d.Reato === reato
    );
    const anni = [...new Set(reatoRegione.map((d) => d.Anno))];
    const map = new Map<number, number>();
    for (const anno of anni) {
      const rows = reatoRegione.filter((d) => d.Anno === anno);
      const totDel = rows.reduce((s, d) => s + d.Delitti, 0);
      const totPop = rows.reduce((s, d) => s + d.Popolazione, 0);
      map.set(anno, totPop > 0 ? (totDel / totPop) * 100_000 : 0);
    }
    return map;
  }, [data, selectedRegione, reato]);

  if (loading)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;
  if (!data) return null;

  const isAssoluto = metrica === "assoluto";

  const provData = data
    .filter(
      (d) => d.Territorio === selectedProvincia && d.Reato === reato
    )
    .sort((a, b) => a.Anno - b.Anno);

  const anni = provData.map((d) => d.Anno);
  const mediaRegArr = anni.map((a) =>
    Number((mediaRegionale.get(a) ?? 0).toFixed(2))
  );

  const varProvincia = varTriennale(
    provData.map((d) => ({ anno: d.Anno, tasso: isAssoluto ? d.Delitti : d.Tasso_per_100k }))
  );

  const lineColor = COLORI_ALLARME[reato] ?? COLORS.primary;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <div>
          <label
            htmlFor="allarme-prov-regione-select"
            className="text-sm font-medium mb-1 flex items-center"
          >
            Regione
            <SyncButton onClick={() => handleSync()} />
          </label>
          <select
            id="allarme-prov-regione-select"
            value={selectedRegione}
            onChange={(e) => {
              setRegione(e.target.value);
              setProvincia("");
            }}
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
          <label
            htmlFor="allarme-prov-provincia-select"
            className="block text-sm font-medium mb-1"
          >
            Provincia
          </label>
          <select
            id="allarme-prov-provincia-select"
            value={selectedProvincia}
            onChange={(e) => setProvincia(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {province.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="allarme-prov-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="allarme-prov-metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="tasso">Tasso per 100k ab.</option>
            <option value="assoluto">Numero assoluto</option>
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper ariaDescription={`Grafico trend ${reato} per ${selectedProvincia} vs media ${selectedRegione}, 2014-2024`}>
        <Plot
          data={[
            {
              x: anni,
              y: provData.map((d) => isAssoluto ? d.Delitti : d.Tasso_per_100k),
              mode: "lines+markers" as const,
              name: selectedProvincia,
              line: { width: 3, color: lineColor },
              marker: { size: 6 },
            },
            ...(!isAssoluto ? [{
              x: anni,
              y: mediaRegArr,
              mode: "lines" as const,
              name: `Media ${selectedRegione}`,
              line: { width: 2, color: "#999999", dash: "dash" as const },
            }] : []),
          ]}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            dragmode: false as const,
            hovermode: "x unified" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: CHART_HEIGHT_SMALL,
            xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
            yaxis: { ...AXIS_FIXED,
              title: { text: isAssoluto ? "Delitti denunciati" : "Tasso per 100k ab.", font: { size: 12 } },
              ...(isAssoluto && { tickformat: ",", hoverformat: "," }),
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

      {varProvincia !== null && (
        <p className="text-sm text-muted-foreground">
          <strong>{selectedProvincia} ({TRIENNALE_PERIODI}):</strong>{" "}
          <span
            className={varProvincia < 0 ? "text-green-600" : "text-red-600"}
          >
            {fmtPctSigned(varProvincia)}
          </span>
        </p>
      )}
    </div>
  );
}
