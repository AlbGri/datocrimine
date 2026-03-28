"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { COLORS, CHART_HEIGHT_SMALL, PLOTLY_CONFIG, AXIS_FIXED } from "@/lib/config";
import { PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const URL_REATI_2023 =
  "https://www.istat.it/comunicato-stampa/reati-contro-la-persona-e-contro-la-proprieta-vittime-ed-eventi-2022-2023/";
const URL_REPORT_2025 =
  "https://www.istat.it/wp-content/uploads/2025/06/Report_REATI-CONTRO-LA-PERSONA-E-LA-PROPRIETA_VITTIME-ED-EVENTI.pdf";
const URL_VIOLENZA_2025 =
  "https://www.istat.it/comunicato-stampa/la-violenza-contro-le-donne-dentro-e-fuori-la-famiglia-primi-risultati-anno-2025/";
const URL_REPORT_2019 =
  "https://www.istat.it/it/files/2019/02/Reati-contro-la-persona-e-contro-la-proprieta.pdf";

const categorie = [
  "Violenza da partner",
  "Frodi/truffe",
  "Aggressioni",
  "Scippi",
  "Furti auto/moto",
];
const pctDenunciati = [11, 24, 41, 68, 95];
const pctNonDenunciati = [89, 76, 59, 32, 5];

const catConfronto = ["Frodi/truffe", "Aggressioni", "Scippi"];
const pct2016 = [18.4, 19.9, 88.9];
const pct2023 = [24.1, 40.6, 68.2];

// Propensione denuncia per macroarea - ISTAT Tavola 6 (2022-2023)
const macroaree = ["Nord-ovest", "Nord-est", "Centro", "Sud", "Isole"];
const macroCat2023 = {
  "Reati proprietà individuale": [45.5, 34.0, 44.6, 52.6, 34.6],
  "Reati violenti": [37.3, 10.4, 65.2, 58.6, 13.0],
  "Reati abitazione": [59.7, 67.3, 48.8, 48.1, 33.9],
  "Reati veicoli": [40.1, 31.8, 43.2, 50.6, 43.4],
};
const mediaNazionale2023: Record<string, number> = {
  "Reati proprietà individuale": 44.7,
  "Reati violenti": 41.6,
  "Reati abitazione": 55.3,
  "Reati veicoli": 41.3,
};
const coloriMacro = ["#2E86AB", "#E63946", "#ff7f0e", "#9467bd"];

// Confronto storico per macroarea - tutti i singoli reati
// 2015-2016: Prospetto 6 report ISTAT 1 feb 2019
// 2022-2023: Tavola 6 report ISTAT 9 giu 2025
// Ordine: NO, NE, Centro, Sud, Isole
const reatiStorico = [
  "Scippi", "Borseggi", "Rapine", "Furti oggetti personali",
  "Aggressioni", "Minacce",
  "Furti abitazione", "Furti veicoli", "Furti oggetti dai veicoli",
];
const storico2016: Record<string, number[]> = {
  "Scippi": [71.7, 64.4, 51.1, 46.9, 8.5],
  "Borseggi": [62.5, 44.2, 37.1, 31.7, 33.2],
  "Rapine": [59.9, 52.0, 32.1, 40.0, 22.5],
  "Furti oggetti personali": [37.4, 16.3, 20.1, 30.8, 19.8],
  "Aggressioni": [14.3, 26.2, 17.0, 9.2, 41.9],
  "Minacce": [36.9, 26.9, 40.1, 22.2, 24.6],
  "Furti abitazione": [73.1, 63.3, 51.3, 54.9, 64.0],
  "Furti veicoli": [38.5, 30.3, 23.4, 49.2, 24.7],
  "Furti oggetti dai veicoli": [42.9, 55.5, 48.4, 45.9, 34.6],
};
// Asterisco (*) = errore campionario >35% nel report ISTAT
const asterischi2016: Record<string, boolean[]> = {
  "Scippi": [false, false, false, false, true],
  "Borseggi": [false, false, false, false, false],
  "Rapine": [false, false, false, false, true],
  "Furti oggetti personali": [false, false, false, false, false],
  "Aggressioni": [false, false, false, true, false],
  "Minacce": [false, false, false, false, false],
  "Furti abitazione": [false, false, false, false, false],
  "Furti veicoli": [false, false, false, false, false],
  "Furti oggetti dai veicoli": [false, false, false, false, false],
};
const storico2023: Record<string, number[]> = {
  "Scippi": [33.9, 39.2, 63.0, 54.2, 52.9],
  "Borseggi": [51.4, 47.8, 62.5, 68.5, 28.4],
  "Rapine": [23.5, 23.5, 57.0, 74.7, 42.9],
  "Furti oggetti personali": [45.5, 26.4, 15.9, 38.0, 33.2],
  "Aggressioni": [42.3, 10.4, 69.0, 55.3, 11.1],
  "Minacce": [34.6, 16.9, 13.8, 32.5, 16.0],
  "Furti abitazione": [63.5, 79.3, 61.0, 68.9, 38.5],
  "Furti veicoli": [38.3, 41.8, 44.6, 65.7, 55.9],
  "Furti oggetti dai veicoli": [73.5, 68.9, 49.0, 57.6, 30.0],
};
const asterischi2023: Record<string, boolean[]> = {
  "Scippi": [false, false, false, false, true],
  "Borseggi": [false, false, false, false, true],
  "Rapine": [false, true, false, false, true],
  "Furti oggetti personali": [false, false, true, false, false],
  "Aggressioni": [false, true, false, false, true],
  "Minacce": [false, true, true, true, false],
  "Furti abitazione": [false, false, false, false, false],
  "Furti veicoli": [false, false, false, false, false],
  "Furti oggetti dai veicoli": [false, false, false, false, true],
};
const fmtAst = (vals: number[], ast: boolean[]) =>
  vals.map((v, i) => `${v}%${ast[i] ? "*" : ""}`);

const MACRO_DETTAGLIO: Record<string, string> = {
  "Reati proprietà individuale": "scippi, borseggi, furti di oggetti personali",
  "Reati violenti": "aggressioni, minacce",
  "Reati abitazione": "furti in abitazione, tentati furti in abitazione",
  "Reati veicoli": "furti di veicoli, furti di oggetti dai veicoli",
};

export function ChartNumeroOscuro() {
  const [showMacro, setShowMacro] = useState(false);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription className="block">
          <strong>Il numero oscuro</strong> è la differenza tra reati commessi e
          reati denunciati. L&apos;Indagine ISTAT sulla Sicurezza dei Cittadini
          stima la quota di vittime che denuncia, permettendo di misurare quanto
          le statistiche ufficiali sottostimino la realt&agrave;. I dati
          provengono dalle edizioni 2015-2016 e 2022-2023 dell&apos;indagine:
          tra le due rilevazioni la propensione pu&ograve; essere variata e i
          valori non coprono l&apos;intero periodo analizzato dal sito.
        </AlertDescription>
      </Alert>

      <ChartFullscreenWrapper ariaDescription="Grafico numero oscuro: percentuale di reati denunciati vs non denunciati per tipologia. Violenza da partner denunciata solo nell'11% dei casi">
        <Plot
          data={[
            {
              name: "Denunciati (dati visibili)",
              y: categorie,
              x: pctDenunciati,
              orientation: "h" as const,
              type: "bar",
              marker: { color: COLORS.primary },
              text: pctDenunciati.map((v) => `${v}%`),
              textposition: "inside" as const,
              hovertemplate: "<b>%{y}</b><br>%{fullData.name}: %{x}%<extra></extra>",
            },
            {
              name: "Non denunciati (numero oscuro)",
              y: categorie,
              x: pctNonDenunciati,
              orientation: "h" as const,
              type: "bar",
              marker: { color: "#d3d3d3" },
              text: pctNonDenunciati.map((v) => `${v}%`),
              textposition: "inside" as const,
              hovertemplate: "<b>%{y}</b><br>%{fullData.name}: %{x}%<extra></extra>",
            },
          ]}
          layout={{
            barmode: "stack",
            xaxis: { ...AXIS_FIXED, title: { text: "Percentuale (%)" }, range: [0, 100] },
            yaxis: { ...AXIS_FIXED },
            height: CHART_HEIGHT_SMALL,
            legend: { orientation: "h" as const, y: -0.22 },
            margin: { t: 20, l: 150, r: 20, b: 60 },
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            separators: PLOTLY_IT_SEPARATORS,
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-primary">
          Come cambia la propensione alla denuncia nel tempo
        </h3>
        <p className="text-muted-foreground">
          Confronto tra le due edizioni dell&apos;indagine ISTAT per i reati
          comparabili.
        </p>
      </div>

      <ChartFullscreenWrapper ariaDescription="Grafico confronto propensione alla denuncia tra 2015-2016 e 2022-2023 per frodi, aggressioni e scippi">
        <Plot
          data={[
            {
              name: "2015-2016",
              x: catConfronto,
              y: pct2016,
              type: "bar",
              marker: { color: "#b0c4de" },
              text: pct2016.map((v) => `${v}%`),
              textposition: "outside" as const,
              hovertemplate: "<b>%{x}</b><br>%{fullData.name}: %{y:.1f}%<extra></extra>",
            },
            {
              name: "2022-2023",
              x: catConfronto,
              y: pct2023,
              type: "bar",
              marker: { color: COLORS.primary },
              text: pct2023.map((v) => `${v}%`),
              textposition: "outside" as const,
              hovertemplate: "<b>%{x}</b><br>%{fullData.name}: %{y:.1f}%<extra></extra>",
            },
          ]}
          layout={{
            barmode: "group",
            xaxis: { ...AXIS_FIXED },
            yaxis: { ...AXIS_FIXED,
              title: { text: "% vittime che hanno denunciato" },
              range: [0, 100],
            },
            height: 350,
            legend: { orientation: "h" as const, y: -0.22 },
            margin: { t: 20, l: 50, r: 20, b: 60 },
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            separators: PLOTLY_IT_SEPARATORS,
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      <p>
        Le aggressioni denunciate sono <strong>raddoppiate</strong> (da 19.9% a
        40.6%), probabilmente per maggiore fiducia nelle istituzioni e campagne
        di sensibilizzazione. Gli scippi denunciati sono invece{" "}
        <strong>calati</strong> (da 88.9% a 68.2%), forse per rassegnazione su
        reati percepiti come a basso recupero. Le frodi/truffe mostrano un{" "}
        <strong>lieve aumento</strong> (da 18.4% a 24.1%), probabilmente legato
        alla crescita delle truffe bancarie online dove c&apos;è maggiore
        consapevolezza e incentivo a denunciare.
      </p>

      <hr />

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-primary">
          Chi denuncia di più? La propensione per territorio (2022-2023)
        </h3>
        <p className="text-muted-foreground">
          La propensione alla denuncia varia per tipo di reato e territorio. Il
          luogo comune &quot;il Sud denuncia meno&quot; non regge all&apos;analisi
          disaggregata. La linea tratteggiata indica la media nazionale.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMacro((v) => !v)}
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors"
          aria-expanded={showMacro}
          aria-label="Mostra dettaglio macro-categorie"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs font-medium">i</span>
          <span>{showMacro ? "Nascondi categorie" : "Cosa include ogni categoria?"}</span>
        </button>
      </div>

      {showMacro && (
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          {Object.entries(MACRO_DETTAGLIO).map(([cat, dettaglio], i) => (
            <div key={cat} className="rounded-md border border-border p-2">
              <span className="font-medium" style={{ color: coloriMacro[i] }}>{cat}</span>
              <span className="text-muted-foreground">: {dettaglio}</span>
            </div>
          ))}
        </div>
      )}

      <ChartFullscreenWrapper ariaDescription="Grafico propensione alla denuncia per macro-area geografica e tipo di reato, 2022-2023. Il Sud denuncia piu' della media per reati violenti e contro la proprieta'">
        <Plot
          data={[
            ...Object.entries(macroCat2023).map(([cat, vals], i) => ({
              name: cat,
              x: macroaree,
              y: vals,
              type: "bar" as const,
              marker: { color: coloriMacro[i] },
              text: vals.map((v) => `${v}%`),
              textposition: "outside" as const,
              textfont: { size: 10 },
              hovertemplate: "<b>%{fullData.name}</b><br>%{x}: %{y:.1f}%<extra></extra>",
            })),
          ]}
          layout={{
            barmode: "group",
            xaxis: { ...AXIS_FIXED },
            yaxis: { ...AXIS_FIXED,
              title: { text: "% vittime che hanno denunciato" },
              range: [0, 85],
            },
            height: CHART_HEIGHT_SMALL,
            legend: { orientation: "h" as const, y: -0.22 },
            margin: { t: 20, l: 50, r: 50, b: 60 },
            dragmode: false,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            separators: PLOTLY_IT_SEPARATORS,
            shapes: Object.values(mediaNazionale2023).map((val, i) => ({
              type: "line" as const,
              xref: "paper" as const,
              yref: "y" as const,
              x0: 0,
              x1: 1,
              y0: val,
              y1: val,
              line: { color: coloriMacro[i], width: 1, dash: "dot" as const },
            })),
            annotations: Object.entries(mediaNazionale2023).map(([, val], i) => ({
              xref: "paper" as const,
              yref: "y" as const,
              x: 1,
              y: val,
              xanchor: "left" as const,
              text: `${val}%`,
              showarrow: false,
              font: { size: 9, color: coloriMacro[i] },
            })),
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      <p>
        Il <strong>Sud</strong> denuncia più della media nazionale per reati
        contro la proprietà (52.6% vs 44.7%), reati violenti (58.6% vs 41.6%) e
        reati contro i veicoli (50.6% vs 41.3%). Sono il{" "}
        <strong>Nord-est</strong> e le <strong>Isole</strong> a denunciare meno
        per quasi tutte le categorie. Il <strong>Centro</strong> ha la
        propensione più alta per i reati violenti (65.2%).
      </p>

      <CollapsibleSection
        title="Come cambia la propensione per territorio nel tempo (9 grafici)"
        description="Confronto propensione alla denuncia per macro-area tra 2015-2016 e 2022-2023"
      >

        <p className="text-muted-foreground">
          Confronto tra le edizioni 2015-2016 e 2022-2023 per tutti i singoli
          reati disponibili. I valori con asterisco (*) hanno un elevato
          margine di incertezza statistica (errore campionario &gt;35% nel
          report ISTAT) e vanno interpretati con cautela.
        </p>

        {reatiStorico.map((reato) => (
          <div key={reato} className="space-y-2">
            <h4 className="text-sm font-semibold">{reato}</h4>
            <ChartFullscreenWrapper ariaDescription={`Grafico confronto propensione alla denuncia per ${reato} tra 2015-2016 e 2022-2023 per macro-area`}>
              <Plot
                data={[
                  {
                    name: "2015-2016",
                    x: macroaree,
                    y: storico2016[reato],
                    type: "bar",
                    marker: { color: "#b0c4de" },
                    text: fmtAst(storico2016[reato], asterischi2016[reato]),
                    textposition: "outside" as const,
                    hovertemplate: "<b>%{x}</b><br>%{fullData.name}: %{y:.1f}%<extra></extra>",
                  },
                  {
                    name: "2022-2023",
                    x: macroaree,
                    y: storico2023[reato],
                    type: "bar",
                    marker: { color: COLORS.primary },
                    text: fmtAst(storico2023[reato], asterischi2023[reato]),
                    textposition: "outside" as const,
                    hovertemplate: "<b>%{x}</b><br>%{fullData.name}: %{y:.1f}%<extra></extra>",
                  },
                ]}
                layout={{
                  barmode: "group",
                  xaxis: { ...AXIS_FIXED },
                  yaxis: { ...AXIS_FIXED,
                    title: { text: "% denunciato" },
                    range: [0, 105],
                  },
                  height: 280,
                  legend: { orientation: "h" as const, y: -0.28 },
                  margin: { t: 10, l: 50, r: 20, b: 60 },
                  dragmode: false,
                  plot_bgcolor: "white",
                  paper_bgcolor: "white",
                  separators: PLOTLY_IT_SEPARATORS,
                }}
                config={PLOTLY_CONFIG}
                useResizeHandler
                className="w-full"
              />
            </ChartFullscreenWrapper>
          </div>
        ))}

        <p>
          I cambiamenti pi&ugrave; marcati riguardano i{" "}
          <strong>reati violenti al Centro-Sud</strong>: le aggressioni denunciate
          al Sud passano da 9.2% a 55.3% (+46 punti), al Centro da 17.0% a 69.0%
          (+52 punti). Le rapine al Sud passano da 40.0% a 74.7% (+35 punti).
          Al contrario, gli scippi denunciati calano drasticamente al{" "}
          <strong>Nord-ovest</strong> (da 71.7% a 33.9%) e al{" "}
          <strong>Nord-est</strong> (da 64.4% a 39.2%). I borseggi aumentano
          ovunque tranne che alle Isole. I furti di veicoli crescono fortemente al{" "}
          <strong>Sud</strong> (da 49.2% a 65.7%) e alle{" "}
          <strong>Isole</strong> (da 24.7% a 55.9%). I furti di oggetti dai
          veicoli aumentano al Nord ma calano alle Isole.
        </p>
      </CollapsibleSection>

      <p className="text-xs text-muted-foreground">
        Fonti:{" "}
        <a
          href={URL_REPORT_2019}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ISTAT Reati contro la persona 2015-2016 (Prospetto 6)
        </a>
        ,{" "}
        <a
          href={URL_REATI_2023}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ISTAT Sicurezza dei Cittadini 2022-2023 (Tavola 6)
        </a>
        ,{" "}
        <a
          href={URL_REPORT_2025}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ISTAT Report Reati 2025 (PDF)
        </a>
        ,{" "}
        <a
          href={URL_VIOLENZA_2025}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ISTAT Violenza contro le donne 2025
        </a>
        . Violenza da partner non ha confronto storico diretto (fonte diversa).
        Furti auto/moto stabili a ~95-98% in entrambe le edizioni.
      </p>
    </div>
  );
}
