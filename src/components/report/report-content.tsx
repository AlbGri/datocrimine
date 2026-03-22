"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  AXIS_FIXED,
  CHART_HEIGHT,
  CHART_HEIGHT_MAP,
  PLOTLY_CONFIG,
  NUTS_TO_ISTAT,
  COLORS,
} from "@/lib/config";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSON = any;

interface ReportData {
  anno: number;
  executive_summary: {
    tasso_totale: number;
    tasso_precedente: number;
    variazione_pct: number;
    media_storica: number;
    popolazione: number;
    delitti_totali: number;
  };
  top_crescita: {
    reato: string;
    codice: string;
    yoy_pct: number;
    valore_corrente: number;
    valore_precedente: number;
    trend_strutturale: string;
    contesto: string;
    caveat: string | null;
    insight_id: string | null;
    nota: string | null;
  }[];
  top_calo: {
    reato: string;
    codice: string;
    yoy_pct: number;
    valore_corrente: number;
    valore_precedente: number;
    trend_strutturale: string;
    contesto: string;
    caveat: string | null;
    insight_id: string | null;
    nota: string | null;
  }[];
  variazione_regioni: {
    REF_AREA: string;
    Territorio: string;
    tasso_corrente: number;
    tasso_precedente: number;
    variazione_pct: number;
  }[];
  variazione_ripartizioni: {
    ripartizione: string;
    tasso_corrente: number;
    tasso_precedente: number;
    variazione_pct: number;
  }[];
  percezione: {
    anno: number;
    percezione_pct: number;
    tasso_delitti: number;
  } | null;
  reati_allarme_sociale: {
    reato: string;
    tasso_corrente: number;
    tasso_precedente: number;
    variazione_pct: number;
    delitti_corrente: number;
  }[];
}

interface PercezioneRow {
  Anno: number;
  Tasso_per_1000: number;
  Percezione_pct: number;
}

function VariazioneIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 0.05)
    return <span className="text-muted-foreground">=</span>;
  return value > 0 ? (
    <span className="text-red-600">&#9650; +{value.toFixed(1)}%</span>
  ) : (
    <span className="text-green-600">&#9660; {value.toFixed(1)}%</span>
  );
}

function TrendLabel({ trend }: { trend: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    increasing: { text: "trend storico: in crescita", color: "text-red-600" },
    decreasing: { text: "trend storico: in calo", color: "text-green-600" },
    "no trend": { text: "trend storico: stabile", color: "text-muted-foreground" },
  };
  const info = labels[trend] ?? { text: trend, color: "text-muted-foreground" };
  return <span className={`text-xs ${info.color}`}>{info.text}</span>;
}

// ---------------------------------------------------------------------------
// Sezioni del report
// ---------------------------------------------------------------------------

function ExecutiveSummary({
  data,
}: {
  data: ReportData["executive_summary"];
  anno: number;
}) {
  const items = [
    {
      label: "Delitti denunciati",
      value: data.delitti_totali.toLocaleString("it-IT"),
    },
    {
      label: "Tasso per 1.000 ab.",
      value: data.tasso_totale.toFixed(1),
      subtitle: `anno prec.: ${data.tasso_precedente.toFixed(1)}`,
    },
    {
      label: "Variazione anno",
      value: `${data.variazione_pct > 0 ? "+" : ""}${data.variazione_pct.toFixed(1)}%`,
      color: data.variazione_pct < 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Media storica",
      value: data.media_storica.toFixed(1),
      subtitle: "per 1.000 ab.",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="py-0 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {item.label}
            </p>
            <p
              className={`text-xl sm:text-2xl font-bold ${"color" in item && item.color ? item.color : ""}`}
            >
              {item.value}
            </p>
            {"subtitle" in item && item.subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {item.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartTopVariazioni({
  crescita,
  calo,
  anno,
}: {
  crescita: ReportData["top_crescita"];
  calo: ReportData["top_calo"];
  anno: number;
}) {
  const isMobile = useIsMobile();
  const allItems = [
    ...calo.slice().reverse(),
    ...crescita,
  ];
  const reati = allItems.map((d) => d.reato);
  const values = allItems.map((d) => d.yoy_pct);
  const colors = allItems.map((d) =>
    d.yoy_pct >= 0 ? COLORS.secondary : "#16a34a"
  );
  const customdata = allItems.map((d) => [
    d.valore_corrente.toLocaleString("it-IT"),
    d.valore_precedente.toLocaleString("it-IT"),
    d.trend_strutturale,
  ]);

  return (
    <ChartFullscreenWrapper
      ariaDescription={`Grafico a barre orizzontali: top 5 reati in crescita e top 5 in calo nel ${anno}`}
    >
      <Plot
        data={[
          {
            type: "bar",
            orientation: "h",
            y: reati,
            x: values,
            marker: { color: colors },
            customdata: customdata,
            hovertemplate:
              "<b>%{y}</b><br>Variazione: %{x:+.1f}%<br>" +
              `Autori denunciati ${anno}: %{customdata[0]}<br>` +
              `Autori denunciati ${anno - 1}: %{customdata[1]}<br>` +
              "Trend storico: %{customdata[2]}<extra></extra>",
          },
        ]}
        layout={{
          height: isMobile ? 380 : CHART_HEIGHT,
          xaxis: {
            ...AXIS_FIXED,
            title: { text: "Variazione % anno su anno" },
            zeroline: true,
            zerolinecolor: "#999",
            zerolinewidth: 1,
          },
          yaxis: {
            ...AXIS_FIXED,
            automargin: true,
          },
          margin: { t: 10, l: isMobile ? 120 : 200, r: 20, b: 50 },
          dragmode: false,
          plot_bgcolor: "white",
          paper_bgcolor: "white",
        }}
        config={PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
      />
    </ChartFullscreenWrapper>
  );
}

function ChartMappaVariazione({
  regioni,
  anno,
}: {
  regioni: ReportData["variazione_regioni"];
  anno: number;
}) {
  const isMobile = useIsMobile();
  const {
    data: geojson,
    loading: geoLoading,
  } = useFetchData<GeoJSON>("/data/geojson_regioni_italia.geojson");

  if (geoLoading)
    return (
      <div className="h-[350px] sm:h-[550px] animate-pulse bg-muted rounded" />
    );
  if (!geojson) return null;

  const locations = regioni.map((r) => NUTS_TO_ISTAT[r.REF_AREA]);
  const values = regioni.map((r) => r.variazione_pct);
  const nomi = regioni.map((r) => r.Territorio);
  const customdata = regioni.map((r) => [
    r.tasso_corrente.toFixed(1),
    r.tasso_precedente.toFixed(1),
  ]);

  const maxAbs = Math.max(...values.map(Math.abs), 5);

  return (
    <ChartFullscreenWrapper
      ariaDescription={`Mappa Italia con variazione percentuale tasso delitti per regione, ${anno} vs ${anno - 1}`}
    >
      <Plot
        data={[
          {
            type: "choropleth",
            geojson: geojson,
            locations: locations,
            z: values,
            featureidkey: "properties.reg_istat_code_num",
            colorscale: [
              [0, "#16a34a"],
              [0.5, "#f5f5f5"],
              [1, "#dc2626"],
            ],
            zmin: -maxAbs,
            zmax: maxAbs,
            zmid: 0,
            marker: { line: { color: "white", width: 1.5 } },
            colorbar: {
              title: { text: "Var. %", side: "right" },
              x: 0.02,
              y: 0.5,
              len: 0.4,
              thickness: 10,
            },
            text: nomi,
            customdata: customdata,
            hovertemplate:
              `<b>%{text}</b><br>Variazione: %{z:+.1f}%<br>Tasso ${anno}: %{customdata[0]}<br>Tasso ${anno - 1}: %{customdata[1]}<extra></extra>`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ]}
        layout={{
          geo: {
            projection: { type: "mercator", scale: 1 },
            scope: "europe",
            center: { lat: 42, lon: 12.5 },
            lonaxis: { range: [6, 19] },
            lataxis: { range: [35.5, 47.5] },
            showframe: false,
            showcoastlines: false,
            showland: false,
            showlakes: false,
            bgcolor: "white",
          },
          height: isMobile ? 350 : CHART_HEIGHT_MAP,
          margin: { t: 0, b: 0, l: 0, r: 0 },
          dragmode: false,
          paper_bgcolor: "white",
        }}
        config={PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
      />
    </ChartFullscreenWrapper>
  );
}

function ChartRipartizioni({
  ripartizioni,
  anno,
}: {
  ripartizioni: ReportData["variazione_ripartizioni"];
  anno: number;
}) {
  const colors = ripartizioni.map((r) =>
    r.variazione_pct >= 0 ? COLORS.secondary : "#16a34a"
  );

  return (
    <ChartFullscreenWrapper
      ariaDescription={`Grafico a barre: variazione tasso delitti per ripartizione, ${anno} vs ${anno - 1}`}
    >
      <Plot
        data={[
          {
            type: "bar",
            x: ripartizioni.map((r) => r.ripartizione),
            y: ripartizioni.map((r) => r.variazione_pct),
            marker: { color: colors },
            text: ripartizioni.map(
              (r) => `${r.variazione_pct > 0 ? "+" : ""}${r.variazione_pct.toFixed(1)}%`
            ),
            textposition: "outside",
            hovertemplate:
              `<b>%{x}</b><br>Variazione: %{y:+.1f}%<extra></extra>`,
          },
        ]}
        layout={{
          height: 300,
          xaxis: { ...AXIS_FIXED },
          yaxis: {
            ...AXIS_FIXED,
            title: { text: "Variazione %" },
            zeroline: true,
            zerolinecolor: "#999",
          },
          margin: { t: 20, l: 50, r: 20, b: 40 },
          dragmode: false,
          plot_bgcolor: "white",
          paper_bgcolor: "white",
        }}
        config={PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
      />
    </ChartFullscreenWrapper>
  );
}

function ChartPercezione({ anno }: { anno: number }) {
  const { data, loading } = useFetchData<PercezioneRow[]>(
    "/data/percezione_vs_dati.json"
  );
  const isMobile = useIsMobile();

  if (loading || !data)
    return <div className="h-[400px] animate-pulse bg-muted rounded" />;

  const anni = data.map((d) => d.Anno);
  const tassi = data.map((d) => d.Tasso_per_1000);
  const percezione = data.map((d) => d.Percezione_pct);

  return (
    <ChartFullscreenWrapper
      ariaDescription={`Grafico percezione insicurezza vs tasso delitti reale, 2014-${anno}`}
    >
      <Plot
        data={[
          {
            x: anni,
            y: tassi,
            type: "scatter",
            mode: "lines+markers",
            name: "Tasso delitti (per 1.000 ab.)",
            line: { color: COLORS.primary },
            marker: {
              size: anni.map((a) => (a === anno ? 12 : 6)),
              color: anni.map((a) =>
                a === anno ? COLORS.primary : COLORS.primary
              ),
              line: {
                color: anni.map((a) => (a === anno ? "#000" : COLORS.primary)),
                width: anni.map((a) => (a === anno ? 2 : 0)),
              },
            },
            yaxis: "y",
          },
          {
            x: anni,
            y: percezione,
            type: "scatter",
            mode: "lines+markers",
            name: "Percezione insicurezza (%)",
            line: { color: COLORS.secondary, dash: "dash" },
            marker: {
              size: anni.map((a) => (a === anno ? 12 : 6)),
              line: {
                color: anni.map((a) =>
                  a === anno ? "#000" : COLORS.secondary
                ),
                width: anni.map((a) => (a === anno ? 2 : 0)),
              },
            },
            yaxis: "y2",
          },
        ]}
        layout={{
          height: CHART_HEIGHT,
          xaxis: {
            ...AXIS_FIXED,
            dtick: isMobile ? 2 : 1,
          },
          yaxis: {
            ...AXIS_FIXED,
            title: { text: "Tasso per 1.000 ab." },
            side: "left",
          },
          yaxis2: {
            ...AXIS_FIXED,
            title: { text: "Percezione %" },
            side: "right",
            overlaying: "y",
          },
          legend: {
            orientation: "h",
            y: -0.15,
            x: 0.5,
            xanchor: "center",
          },
          margin: { t: 20, l: 50, r: 50, b: 60 },
          dragmode: false,
          plot_bgcolor: "white",
          paper_bgcolor: "white",
        }}
        config={PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
      />
    </ChartFullscreenWrapper>
  );
}

// ---------------------------------------------------------------------------
// Report principale
// ---------------------------------------------------------------------------

export function ReportContent({ anno }: { anno: string }) {
  const annoNum = parseInt(anno, 10);
  const { data, loading, error } = useFetchData<ReportData>(
    `/data/report_${anno}.json`
  );

  if (loading)
    return (
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
        <div className="space-y-6">
          <div className="h-10 animate-pulse bg-muted rounded w-2/3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse bg-muted rounded" />
            ))}
          </div>
          <div className="h-[400px] animate-pulse bg-muted rounded" />
        </div>
      </main>
    );

  if (error)
    return (
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
        <p className="text-destructive">
          Errore nel caricamento del report: {error}
        </p>
      </main>
    );

  if (!data) return null;

  const { executive_summary: es } = data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8 space-y-10">
      <header>
        <h1 className="text-2xl sm:text-4xl font-bold">
          Criminalit&agrave; in Italia {annoNum}
        </h1>
        <p className="text-muted-foreground mt-2">
          Cosa &egrave; cambiato rispetto al {annoNum - 1}: variazioni nei
          delitti denunciati per reato, territorio e confronto con la media
          storica. Dati ISTAT.
        </p>
      </header>

      {/* 1. Executive Summary */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Sintesi
        </h2>
        <ExecutiveSummary data={es} anno={annoNum} />
        <p>
          Nel {annoNum} sono stati denunciati{" "}
          <strong>{es.delitti_totali.toLocaleString("it-IT")}</strong> delitti
          in Italia, con un tasso di{" "}
          <strong>{es.tasso_totale.toFixed(1)}</strong> per 1.000 abitanti (
          <VariazioneIndicator value={es.variazione_pct} /> rispetto al{" "}
          {annoNum - 1}). La media storica degli anni precedenti &egrave;{" "}
          {es.media_storica.toFixed(1)}.
        </p>
      </section>

      {/* 2. Cosa e' cambiato */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Cosa &egrave; cambiato
        </h2>
        <p className="text-sm text-muted-foreground">
          Top 5 reati in crescita e in calo per numero di autori denunciati,{" "}
          {annoNum} vs {annoNum - 1}.
        </p>
        <ChartTopVariazioni
          crescita={data.top_crescita}
          calo={data.top_calo}
          anno={annoNum}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-red-600 mb-2">
              Maggiore crescita
            </h3>
            <ul className="space-y-3">
              {data.top_crescita.map((d) => (
                <li key={d.codice}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{d.reato}</span>
                    <span className="text-red-600 font-semibold">
                      +{d.yoy_pct.toFixed(1)}%
                    </span>
                    <TrendLabel trend={d.trend_strutturale} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.contesto}
                  </p>
                  {d.nota && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      {d.nota}
                    </p>
                  )}
                  {d.caveat && (
                    <p className="text-xs text-amber-700 mt-0.5 border-l-2 border-amber-300 pl-2">
                      {d.caveat}
                    </p>
                  )}
                  {d.insight_id && (
                    <Link
                      href={`/insights#${d.insight_id}`}
                      className="text-xs text-primary hover:underline mt-0.5 inline-block"
                    >
                      Approfondimento negli Insights &rarr;
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-green-600 mb-2">
              Maggiore calo
            </h3>
            <ul className="space-y-3">
              {data.top_calo.map((d) => (
                <li key={d.codice}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{d.reato}</span>
                    <span className="text-green-600 font-semibold">
                      {d.yoy_pct.toFixed(1)}%
                    </span>
                    <TrendLabel trend={d.trend_strutturale} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.contesto}
                  </p>
                  {d.nota && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      {d.nota}
                    </p>
                  )}
                  {d.caveat && (
                    <p className="text-xs text-amber-700 mt-0.5 border-l-2 border-amber-300 pl-2">
                      {d.caveat}
                    </p>
                  )}
                  {d.insight_id && (
                    <Link
                      href={`/insights#${d.insight_id}`}
                      className="text-xs text-primary hover:underline mt-0.5 inline-block"
                    >
                      Approfondimento negli Insights &rarr;
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. Mappa variazione regionale */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          La mappa del {annoNum}
        </h2>
        <p className="text-sm text-muted-foreground">
          Variazione del tasso di delitti denunciati per 1.000 abitanti rispetto
          al {annoNum - 1}. Rosso = aumento, verde = calo.
        </p>
        <ChartMappaVariazione regioni={data.variazione_regioni} anno={annoNum} />
        <div className="text-sm space-y-1">
          <p>
            <strong>Maggiore aumento:</strong>{" "}
            {data.variazione_regioni[0]?.Territorio} (
            <VariazioneIndicator
              value={data.variazione_regioni[0]?.variazione_pct ?? 0}
            />
            )
          </p>
          <p>
            <strong>Maggiore calo:</strong>{" "}
            {data.variazione_regioni[data.variazione_regioni.length - 1]
              ?.Territorio}{" "}
            (
            <VariazioneIndicator
              value={
                data.variazione_regioni[data.variazione_regioni.length - 1]
                  ?.variazione_pct ?? 0
              }
            />
            )
          </p>
        </div>
      </section>

      {/* 4. Confronto ripartizioni */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Nord, Centro, Sud
        </h2>
        <p className="text-sm text-muted-foreground">
          Come cambia il tasso di delitti denunciati nelle tre grandi
          ripartizioni territoriali. I tassi sono medie pesate per popolazione.
        </p>
        <ChartRipartizioni
          ripartizioni={data.variazione_ripartizioni}
          anno={annoNum}
        />
        <div className="text-sm space-y-1">
          {data.variazione_ripartizioni.map((r) => (
            <p key={r.ripartizione}>
              <strong>{r.ripartizione}:</strong> tasso{" "}
              {r.tasso_corrente.toFixed(1)} (
              <VariazioneIndicator value={r.variazione_pct} />)
            </p>
          ))}
        </div>
      </section>

      {/* 5. Reati di allarme sociale */}
      {data.reati_allarme_sociale.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-semibold text-primary">
            Reati di allarme sociale
          </h2>
          <p className="text-sm text-muted-foreground">
            I sei reati che generano maggiore allarme nell&apos;opinione
            pubblica: tasso per 100.000 abitanti e variazione rispetto al{" "}
            {annoNum - 1}.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.reati_allarme_sociale.map((r) => (
              <Card key={r.reato}>
                <CardContent className="py-0">
                  <p className="text-xs text-muted-foreground">{r.reato}</p>
                  <p className="text-lg font-bold">
                    {r.tasso_corrente.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">denunciati per 100k ab.</p>
                  <p className="text-sm font-semibold">
                    <VariazioneIndicator value={r.variazione_pct} />
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 6. Percezione */}
      {data.percezione && (
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-semibold text-primary">
            Percezione vs realt&agrave;
          </h2>
          <p className="text-sm text-muted-foreground">
            Andamento del tasso di criminalit&agrave; reale e della percezione
            di insicurezza (% famiglie che percepiscono rischio). Anno{" "}
            {annoNum} evidenziato.
          </p>
          <ChartPercezione anno={annoNum} />
          <p className="text-sm">
            Nel {annoNum} il {data.percezione.percezione_pct}% delle famiglie
            percepisce un rischio di criminalit&agrave; nella propria zona,
            a fronte di un tasso reale di {data.percezione.tasso_delitti.toFixed(1)}{" "}
            per 1.000 abitanti.
          </p>
        </section>
      )}

      {/* 7. Nota metodologica */}
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Nota metodologica
        </h2>
        <p className="text-sm text-muted-foreground">
          I dati provengono da ISTAT (DCCV_DELITTIPS e DCCV_AUTVITTPS). I tassi
          sono calcolati sulla popolazione residente. Le variazioni anno su anno
          riflettono cambiamenti nei delitti denunciati, non necessariamente
          nella criminalit&agrave; reale: la propensione alla denuncia varia per
          tipo di reato e territorio.
        </p>
        <p className="text-sm">
          Per approfondimenti su fonti, metodi e limiti dei dati, vedi la{" "}
          <Link
            href="/metodologia"
            className="text-primary underline hover:no-underline"
          >
            pagina Metodologia
          </Link>{" "}
          e la{" "}
          <Link
            href="/guida"
            className="text-primary underline hover:no-underline"
          >
            Guida alla Lettura
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
