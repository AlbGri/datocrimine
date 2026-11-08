"use client";

import { useState } from "react";
import Link from "next/link";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  AXIS_FIXED,
  CHART_HEIGHT,
  CHART_HEIGHT_SMALL,
  CHART_HEIGHT_MAP,
  CHART_HEIGHT_MINI,
  PLOTLY_CONFIG,
  NUTS_TO_ISTAT,
  COLORS,
  COLORI_ALLARME,
  getAxisYear,
} from "@/lib/config";
import { fmtNum, fmtPctSigned, fmtSigned, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { Plot } from "@/components/charts/plot";

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
  contributi: Contributi[];
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

interface VoceContributo {
  codice: string;
  reato: string;
  delitti_base: number;
  delitti_corrente: number;
  differenza: number;
  variazione_pct: number;
  trend_strutturale: string | null;
  inizio_serie: number;
  contesto: string | null;
  caveat: string | null;
  insight_id: string | null;
  nota: string | null;
}

interface Contributi {
  anno_base: number;
  delitti_base: number;
  delitti_corrente: number;
  differenza: number;
  variazione_pct: number;
  sintesi: string;
  aumenti: VoceContributo[];
  cali: VoceContributo[];
  altri: { differenza: number; n_reati: number };
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
    <span className="text-red-600">&#9650; {fmtPctSigned(value)}</span>
  ) : (
    <span className="text-green-600">&#9660; {fmtPctSigned(value)}</span>
  );
}

const TREND_IT: Record<string, string> = {
  increasing: "in crescita",
  decreasing: "in calo",
  "no trend": "nessuna tendenza netta",
};

function trendToItalian(trend: string | null, inizio: number): string {
  if (trend === null) return `serie troppo breve (dal ${inizio})`;
  return TREND_IT[trend] ?? trend;
}

function TrendLabel({ trend, inizio }: { trend: string | null; inizio: number }) {
  const labels: Record<string, { text: string; color: string }> = {
    increasing: { text: "trend storico: in crescita", color: "text-red-600" },
    decreasing: { text: "trend storico: in calo", color: "text-green-600" },
    "no trend": { text: "nessuna tendenza storica netta", color: "text-muted-foreground" },
  };
  const info = trend === null
    ? { text: `serie troppo breve (dal ${inizio})`, color: "text-muted-foreground" }
    : labels[trend] ?? { text: trend, color: "text-muted-foreground" };
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
      value: fmtNum(data.delitti_totali),
    },
    {
      label: "Tasso per 1.000 ab.",
      value: fmtNum(data.tasso_totale, 1),
      subtitle: `anno prec.: ${fmtNum(data.tasso_precedente, 1)}`,
    },
    {
      label: "Variazione anno",
      value: fmtPctSigned(data.variazione_pct),
      color: data.variazione_pct < 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Media storica",
      value: fmtNum(data.media_storica, 1),
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

function ChartContributi({ dati, anno }: { dati: Contributi; anno: number }) {
  const isMobile = useIsMobile();
  const base = dati.anno_base;
  // Plotly disegna dal basso: cali piu' forti in fondo, aumenti piu' forti in cima
  const voci = [...dati.cali, ...dati.aumenti.slice().reverse()];
  const etichettaAltri = `Restanti ${dati.altri.n_reati} reati`;
  const reati = [
    ...dati.cali.map((d) => d.reato),
    etichettaAltri,
    ...dati.aumenti.slice().reverse().map((d) => d.reato),
  ];
  const values = [
    ...dati.cali.map((d) => d.differenza),
    dati.altri.differenza,
    ...dati.aumenti.slice().reverse().map((d) => d.differenza),
  ];
  const colors = values.map((v, i) =>
    reati[i] === etichettaAltri
      ? COLORS.grigioAltro
      : v >= 0 ? COLORS.secondary : COLORS.verdeCalo
  );
  const hover = (d: VoceContributo) =>
    `<b>${d.reato}</b><br>Differenza: ${fmtSigned(d.differenza, 0)} (${fmtPctSigned(d.variazione_pct)})<br>` +
    `Delitti ${base}: ${fmtNum(d.delitti_base)}<br>Delitti ${anno}: ${fmtNum(d.delitti_corrente)}<br>` +
    `Trend storico: ${trendToItalian(d.trend_strutturale, d.inizio_serie)}`;
  const hovertext = [
    ...dati.cali.map(hover),
    `<b>${etichettaAltri}</b><br>Differenza complessiva: ${fmtSigned(dati.altri.differenza, 0)}`,
    ...dati.aumenti.slice().reverse().map(hover),
  ];

  return (
    <ChartFullscreenWrapper
      ariaDescription={`Grafico a barre orizzontali: delitti denunciati in più e in meno per reato, ${anno} rispetto al ${base}. ${voci.length} reati più una barra con i restanti`}
    >
      <Plot
        data={[
          {
            type: "bar",
            orientation: "h",
            y: reati,
            x: values,
            marker: { color: colors },
            hovertext,
            hovertemplate: "%{hovertext}<extra></extra>",
          },
        ]}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          height: isMobile ? CHART_HEIGHT_SMALL : CHART_HEIGHT,
          xaxis: {
            ...AXIS_FIXED,
            // Su telefono l'area delle barre e' stretta e il titolo verrebbe tagliato
            title: { text: isMobile ? "" : `Differenza rispetto al ${base}` },
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

function ListaContributi({
  titolo,
  colore,
  voci,
}: {
  titolo: string;
  colore: string;
  voci: VoceContributo[];
}) {
  return (
    <div>
      <h3 className={`font-semibold ${colore} mb-2`}>{titolo}</h3>
      <ul className="space-y-3">
        {voci.map((d) => (
          <li key={d.codice}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{d.reato}</span>
              <span className={`${colore} font-semibold`}>
                {fmtSigned(d.differenza, 0)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({fmtPctSigned(d.variazione_pct)})
              </span>
              <TrendLabel trend={d.trend_strutturale} inizio={d.inizio_serie} />
            </div>
            {d.contesto && (
              <p className="text-xs text-muted-foreground mt-0.5">{d.contesto}</p>
            )}
            {d.nota && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">{d.nota}</p>
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
  );
}

function SezioneContributi({
  contributi,
  anno,
}: {
  contributi: Contributi[];
  anno: number;
}) {
  const [indice, setIndice] = useState(0);
  const dati = contributi[indice];
  if (!dati) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl sm:text-2xl font-semibold text-primary">
        Cosa &egrave; cambiato
      </h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Anno di confronto">
        {contributi.map((c, i) => (
          <button
            key={c.anno_base}
            onClick={() => setIndice(i)}
            aria-pressed={indice === i}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              indice === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Rispetto al {c.anno_base}
          </button>
        ))}
      </div>
      <p>{dati.sintesi}</p>
      <p className="text-sm text-muted-foreground">
        Delitti denunciati in pi&ugrave; e in meno per reato: i{" "}
        {dati.aumenti.length} aumenti e i {dati.cali.length} cali maggiori in
        valore assoluto. La barra grigia somma i restanti reati, cos&igrave; le
        barre insieme danno la variazione totale.
      </p>
      <ChartContributi dati={dati} anno={anno} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <ListaContributi titolo="Aumenti maggiori" colore="text-red-600" voci={dati.aumenti} />
        <ListaContributi titolo="Cali maggiori" colore="text-green-600" voci={dati.cali} />
      </div>
    </section>
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
    r.tasso_corrente,
    r.tasso_precedente,
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
              [0, COLORS.verdeCalo],
              [0.5, "#f5f5f5"],
              [1, COLORS.mediaNazionale],
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
              `<b>%{text}</b><br>Variazione: %{z:+.1f}%<br>Tasso ${anno}: %{customdata[0]:.1f}<br>Tasso ${anno - 1}: %{customdata[1]:.1f}<extra></extra>`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ]}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
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
    r.variazione_pct >= 0 ? COLORS.secondary : COLORS.verdeCalo
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
              (r) => fmtPctSigned(r.variazione_pct)
            ),
            textposition: "outside",
            hovertemplate:
              `<b>%{x}</b><br>Variazione: %{y:+.1f}%<extra></extra>`,
          },
        ]}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          height: CHART_HEIGHT_MINI,
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
            y: percezione,
            type: "scatter",
            mode: "lines+markers",
            name: "Percezione insicurezza (%)",
            hovertemplate: "<b>Percezione insicurezza</b><br>Anno: %{x}<br>%{y:.1f}%<extra></extra>",
            line: { color: COLORS.secondary },
            marker: {
              size: anni.map((a) => (a === anno ? 12 : 6)),
              line: {
                color: anni.map((a) =>
                  a === anno ? "#000" : COLORS.secondary
                ),
                width: anni.map((a) => (a === anno ? 2 : 0)),
              },
            },
            yaxis: "y",
          },
          {
            x: anni,
            y: tassi,
            type: "scatter",
            mode: "lines+markers",
            name: "Tasso delitti (per 1.000 ab.)",
            hovertemplate: "<b>Tasso delitti</b><br>Anno: %{x}<br>%{y:.2f} per 1.000 ab.<extra></extra>",
            line: { color: COLORS.primary, dash: "dash" },
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
            yaxis: "y2",
          },
        ]}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          height: CHART_HEIGHT,
          xaxis: getAxisYear(isMobile),
          yaxis: {
            ...AXIS_FIXED,
            title: { text: "% Percezione rischio", font: { color: COLORS.secondary, size: 12 } },
            tickfont: { color: COLORS.secondary },
            side: "left",
          },
          yaxis2: {
            ...AXIS_FIXED,
            title: { text: "Tasso per 1.000 ab.", font: { color: COLORS.primary, size: 12 } },
            tickfont: { color: COLORS.primary },
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
          <strong>{fmtNum(es.delitti_totali)}</strong> delitti
          in Italia, con un tasso di{" "}
          <strong>{fmtNum(es.tasso_totale, 1)}</strong> per 1.000 abitanti (
          <VariazioneIndicator value={es.variazione_pct} /> rispetto al{" "}
          {annoNum - 1}). La media storica degli anni precedenti &egrave;{" "}
          {fmtNum(es.media_storica, 1)}.
        </p>
      </section>

      {/* 2. Cosa e' cambiato */}
      <SezioneContributi contributi={data.contributi} anno={annoNum} />

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
              {fmtNum(r.tasso_corrente, 1)} (
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
            I {data.reati_allarme_sociale.length} reati che generano maggiore allarme nell&apos;opinione
            pubblica: tasso per 100.000 abitanti e variazione rispetto al{" "}
            {annoNum - 1}.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.reati_allarme_sociale.map((r) => (
              <Card key={r.reato} style={{ borderLeftWidth: 3, borderLeftColor: COLORI_ALLARME[r.reato] ?? COLORS.grigioMedia }}>
                <CardContent className="py-0">
                  <p className="text-xs text-muted-foreground">{r.reato}</p>
                  <p className="text-lg font-bold">
                    {fmtNum(r.tasso_corrente, 2)}
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
            a fronte di un tasso reale di {fmtNum(data.percezione.tasso_delitti, 1)}{" "}
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
