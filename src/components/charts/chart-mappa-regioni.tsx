"use client";

import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  CHART_HEIGHT_MAP,
  PLOTLY_CONFIG,
  NUTS_TO_ISTAT,
  COLORS,
} from "@/lib/config";
import { fmtNum, fmtSigned, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface DelittiRegione {
  REF_AREA: string;
  Territorio: string;
  Anno: number;
  Delitti: number;
  Popolazione: number;
  Tasso_per_1000: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSON = any;

const REGION_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  ITC1: { lat: 45.05, lon: 7.9 },    // Piemonte
  ITC2: { lat: 45.74, lon: 7.35 },   // Valle d'Aosta
  ITC3: { lat: 44.35, lon: 8.5 },    // Liguria
  ITC4: { lat: 45.58, lon: 9.9 },    // Lombardia
  ITD12: { lat: 46.5, lon: 11.35 },  // Trentino-Alto Adige
  ITD3: { lat: 45.55, lon: 11.85 },  // Veneto
  ITD4: { lat: 46.07, lon: 13.23 },  // Friuli-Venezia Giulia
  ITD5: { lat: 44.55, lon: 11.0 },   // Emilia-Romagna
  ITE1: { lat: 43.35, lon: 11.15 },  // Toscana
  ITE2: { lat: 42.9, lon: 12.55 },   // Umbria
  ITE3: { lat: 43.4, lon: 13.35 },   // Marche
  ITE4: { lat: 41.9, lon: 12.85 },   // Lazio
  ITF1: { lat: 42.25, lon: 13.6 },   // Abruzzo
  ITF2: { lat: 41.65, lon: 14.55 },  // Molise
  ITF3: { lat: 40.85, lon: 14.75 },  // Campania
  ITF4: { lat: 41.1, lon: 16.15 },   // Puglia
  ITF5: { lat: 40.5, lon: 16.0 },    // Basilicata
  ITF6: { lat: 39.0, lon: 16.55 },   // Calabria
  ITG1: { lat: 37.6, lon: 14.15 },   // Sicilia
  ITG2: { lat: 40.05, lon: 9.05 },   // Sardegna
};

interface Props {
  anno: number;
}

export function ChartMappaRegioni({ anno }: Props) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useFetchData<DelittiRegione[]>(
    "/data/delitti_regioni.json"
  );
  const {
    data: geojson,
    loading: geoLoading,
    error: geoError,
  } = useFetchData<GeoJSON>("/data/geojson_regioni_italia.geojson");

  if (loading || geoLoading)
    return <div className="h-[350px] sm:h-[550px] animate-pulse bg-muted rounded" />;
  if (error || geoError)
    return (
      <p className="text-destructive">Errore: {error || geoError}</p>
    );
  if (!data || !geojson) return null;

  const dataAnno = data.filter((d) => d.Anno === anno);
  const codiciIstat = dataAnno.map((d) => NUTS_TO_ISTAT[d.REF_AREA]);
  const tassi = dataAnno.map((d) => d.Tasso_per_1000);
  const nomi = dataAnno.map((d) => d.Territorio);

  const annoPrecedente = anno - 1;
  const dataPrev = data.filter((d) => d.Anno === annoPrecedente);
  const prevMap = new Map(dataPrev.map((d) => [d.REF_AREA, d.Tasso_per_1000]));

  const sortedForRank = [...dataAnno].sort((a, b) => b.Tasso_per_1000 - a.Tasso_per_1000);
  const rankMap = new Map(sortedForRank.map((d, i) => [d.REF_AREA, i + 1]));

  const customdata = dataAnno.map((d) => {
    const prev = prevMap.get(d.REF_AREA);
    const diff = prev != null ? d.Tasso_per_1000 - prev : null;
    return [
      d.Popolazione,
      d.Delitti,
      diff != null ? fmtSigned(diff, 1) : "n/d",
      `${rankMap.get(d.REF_AREA)}/${dataAnno.length}`,
    ];
  });

  const top = sortedForRank[0];
  const bottom = sortedForRank[sortedForRank.length - 1];
  const totDelitti = dataAnno.reduce((s, d) => s + d.Delitti, 0);
  const totPop = dataAnno.reduce((s, d) => s + d.Popolazione, 0);
  const media = totPop > 0 ? (totDelitti / totPop) * 1000 : 0;
  const totDelittiPrev = dataPrev.reduce((s, d) => s + d.Delitti, 0);
  const totPopPrev = dataPrev.reduce((s, d) => s + d.Popolazione, 0);
  const mediaPrev =
    dataPrev.length > 0 && totPopPrev > 0
      ? (totDelittiPrev / totPopPrev) * 1000
      : null;

  const trendAnnotations = dataPrev.length > 0
    ? dataAnno.map((d) => {
        const prev = prevMap.get(d.REF_AREA);
        const centroid = REGION_CENTROIDS[d.REF_AREA];
        if (prev == null || !centroid) return null;
        const diff = d.Tasso_per_1000 - prev;
        if (Math.abs(diff) < 0.05) return null;
        return {
          lat: centroid.lat,
          lon: centroid.lon,
          markerSymbol: diff > 0 ? "triangle-up" : "triangle-down",
          color: diff > 0 ? COLORS.mediaNazionale : COLORS.verdeCalo,
        };
      }).filter(Boolean) as { lat: number; lon: number; markerSymbol: string; color: string }[]
    : [];

  const varIndicator = (current: number, prev: number | undefined | null) => {
    if (prev == null) return null;
    const diff = current - prev;
    if (Math.abs(diff) < 0.05) return <span className="text-muted-foreground text-xs sm:text-sm ml-1">=</span>;
    return diff > 0
      ? <span className="text-red-600 text-xs sm:text-sm ml-1">&#9650;</span>
      : <span className="text-green-600 text-xs sm:text-sm ml-1">&#9660;</span>;
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="block">
          <strong>Confronti territoriali: cautela necessaria.</strong> Regioni
          con alta presenza turistica o pendolarismo mostrano tassi elevati
          perch&eacute; il denominatore &egrave; la popolazione residente, non quella
          effettiva. La propensione alla denuncia varia per tipo di reato e
          territorio (vedi sezione Numero Oscuro in Home). I dati mostrano
          delitti denunciati, non criminalit&agrave; reale.
        </AlertDescription>
      </Alert>

      <ChartFullscreenWrapper ariaDescription={`Mappa coropleta Italia con tasso delitti per 1.000 abitanti per regione, anno ${anno}`}>
        <Plot
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={[
            {
              type: "choropleth",
              geojson: geojson,
              locations: codiciIstat,
              z: tassi,
              featureidkey: "properties.reg_istat_code_num",
              colorscale: [
                [0, "#f5f5f5"],
                [0.25, "#d9d9d9"],
                [0.5, "#999999"],
                [0.75, "#636363"],
                [1, "#252525"],
              ],
              zmin: 0,
              zmax: 100,
              marker: { line: { color: "white", width: 1.5 } },
              colorbar: {
                title: { text: "Tasso per 1000 ab.", side: "right" },
                x: 0.02,
                y: 0.5,
                len: 0.4,
                thickness: 10,
              },
              text: nomi,
              customdata: customdata,
              hovertemplate:
                "<b>%{text}</b><br>Tasso: %{z:.1f} per 1000 ab.<br>Delitti: %{customdata[1]:,.0f}<br>Popolazione: %{customdata[0]:,.0f}<br>Var. anno prec.: %{customdata[2]}<br>Ranking: %{customdata[3]}<extra></extra>",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            ...trendAnnotations.map((t) => ({
              type: "scattergeo",
              lat: [t.lat],
              lon: [t.lon],
              mode: "markers",
              marker: {
                symbol: t.markerSymbol,
                size: isMobile ? 8 : 11,
                color: t.color,
                line: { color: "white", width: 1 },
              },
              hoverinfo: "skip",
              showlegend: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)),
          ]}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            geo: {
              projection: { type: "mercator", scale: 1 },
              center: { lat: 42.0, lon: 12.0 },
              showland: false,
              showlakes: false,
              showcountries: false,
              showcoastlines: false,
              showframe: false,
              bgcolor: "rgba(0,0,0,0)",
              lonaxis: { range: [6.5, 18.5] },
              lataxis: { range: [36, 47.2] },
            },
            annotations: [
              {
                text: `<b>${anno}</b>`,
                x: 0.02,
                y: 0.97,
                xref: "paper",
                yref: "paper",
                showarrow: false,
                font: { size: 18, color: "#333" },
                xanchor: "left",
                yanchor: "top",
              },
            ],
            height: isMobile ? 350 : CHART_HEIGHT_MAP,
            margin: { r: 0, t: 10, l: 0, b: 50 },
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="py-2 sm:pt-4 sm:pb-2 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tasso nazionale
            </p>
            <p className="text-lg sm:text-2xl font-bold">{fmtNum(media, 1)}{varIndicator(media, mediaPrev)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 sm:pt-4 sm:pb-2 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Piu alto: {top.Territorio}
            </p>
            <p className="text-lg sm:text-2xl font-bold">
              {fmtNum(top.Tasso_per_1000, 1)}{varIndicator(top.Tasso_per_1000, prevMap.get(top.REF_AREA))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 sm:pt-4 sm:pb-2 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Piu basso: {bottom.Territorio}
            </p>
            <p className="text-lg sm:text-2xl font-bold">
              {fmtNum(bottom.Tasso_per_1000, 1)}{varIndicator(bottom.Tasso_per_1000, prevMap.get(bottom.REF_AREA))}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
