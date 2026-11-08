"use client";

import { useState } from "react";
import { COLORS, CHART_HEIGHT_SMALL, PLOTLY_CONFIG, AXIS_FIXED } from "@/lib/config";
import { PLOTLY_IT_SEPARATORS, fmtPct, fmtSigned } from "@/lib/format";
import propensione from "@/data/propensione_denuncia.json";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Plot } from "@/components/charts/plot";

const URL_REPORT_2025 =
  "https://www.istat.it/wp-content/uploads/2025/06/Report_REATI-CONTRO-LA-PERSONA-E-LA-PROPRIETA_VITTIME-ED-EVENTI.pdf";
const { fonti, righe } = propensione;

type Area = "Italia" | "Nord-ovest" | "Nord-est" | "Centro" | "Sud" | "Isole";
type Edizione = "2015-2016" | "2022-2023" | "2025";

function riga(reato: string, area: Area, edizione: Edizione) {
  const r = righe.find((d) => d.reato === reato && d.area === area && d.edizione === edizione);
  if (!r) throw new Error(`propensione_denuncia.json: manca ${reato}, ${area}, ${edizione}`);
  return r;
}
const pct = (reato: string, area: Area, edizione: Edizione) => riga(reato, area, edizione).pct;
// Testo: "40,6%"
const p = (reato: string, area: Area, edizione: Edizione) => fmtPct(pct(reato, area, edizione));
// Testo: "+46" punti fra le due edizioni dell'indagine
const punti = (reato: string, area: Area) =>
  fmtSigned(pct(reato, area, "2022-2023") - pct(reato, area, "2015-2016"), 0);

// Quota denunciata a livello nazionale, edizione piu' recente per ogni reato
const quotaNazionale: [string, Edizione][] = [
  ["Violenza da partner", "2025"],
  ["Frodi/truffe", "2022-2023"],
  ["Aggressioni", "2022-2023"],
  ["Scippi", "2022-2023"],
  ["Furti auto/moto", "2022-2023"],
];
const categorie = quotaNazionale.map(([reato]) => reato);
// Il grafico mostra valori interi: con i decimali 100 - v darebbe 31,799999...
const pctDenunciati = quotaNazionale.map(([reato, ed]) => Math.round(pct(reato, "Italia", ed)));
const pctNonDenunciati = pctDenunciati.map((v) => 100 - v);

const catConfronto = ["Frodi/truffe", "Aggressioni", "Scippi"];
const pct2016 = catConfronto.map((r) => pct(r, "Italia", "2015-2016"));
const pct2023 = catConfronto.map((r) => pct(r, "Italia", "2022-2023"));

const macroaree: Area[] = ["Nord-ovest", "Nord-est", "Centro", "Sud", "Isole"];
const categorieMacro = ["Reati proprietà individuale", "Reati violenti", "Reati abitazione", "Reati veicoli"];
const macroCat2023 = Object.fromEntries(
  categorieMacro.map((cat) => [cat, macroaree.map((a) => pct(cat, a, "2022-2023"))]),
);
const mediaNazionale2023 = Object.fromEntries(
  categorieMacro.map((cat) => [cat, pct(cat, "Italia", "2022-2023")]),
);
const coloriMacro = [COLORS.primary, COLORS.secondary, COLORS.truffe, COLORS.droga];

// Confronto storico per macroarea, tutti i singoli reati
const reatiStorico = [
  "Scippi", "Borseggi", "Rapine", "Furti oggetti personali",
  "Aggressioni", "Minacce",
  "Furti abitazione", "Furti veicoli", "Furti oggetti dai veicoli",
];
const perArea = <T,>(edizione: Edizione, campo: (r: ReturnType<typeof riga>) => T) =>
  Object.fromEntries(reatiStorico.map((r) => [r, macroaree.map((a) => campo(riga(r, a, edizione)))]));
const storico2016 = perArea("2015-2016", (r) => r.pct);
const storico2023 = perArea("2022-2023", (r) => r.pct);
// Asterisco (*) = errore campionario >35% nel report ISTAT
const asterischi2016 = perArea("2015-2016", (r) => r.errore_alto === true);
const asterischi2023 = perArea("2022-2023", (r) => r.errore_alto === true);

const fmtAst = (vals: number[], ast: boolean[]) =>
  vals.map((v, i) => `${fmtPct(v)}${ast[i] ? "*" : ""}`);

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

      <ChartFullscreenWrapper ariaDescription={`Grafico numero oscuro: percentuale di reati denunciati vs non denunciati per tipologia. Violenza da partner denunciata solo nell'${fmtPct(pct("Violenza da partner", "Italia", "2025"), 0)} dei casi`}>
        <Plot
          data={[
            {
              name: "Denunciati (dati visibili)",
              y: categorie,
              x: pctDenunciati,
              orientation: "h" as const,
              type: "bar",
              marker: { color: COLORS.primary },
              text: pctDenunciati.map((v) => fmtPct(v, 0)),
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
              text: pctNonDenunciati.map((v) => fmtPct(v, 0)),
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
              text: pct2016.map((v) => fmtPct(v)),
              textposition: "outside" as const,
              hovertemplate: "<b>%{x}</b><br>%{fullData.name}: %{y:.1f}%<extra></extra>",
            },
            {
              name: "2022-2023",
              x: catConfronto,
              y: pct2023,
              type: "bar",
              marker: { color: COLORS.primary },
              text: pct2023.map((v) => fmtPct(v)),
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
        Le aggressioni denunciate sono <strong>raddoppiate</strong> (da {p("Aggressioni", "Italia", "2015-2016")} a {p("Aggressioni", "Italia", "2022-2023")}), probabilmente per maggiore fiducia nelle istituzioni e campagne
        di sensibilizzazione. Gli scippi denunciati sono invece{" "}
        <strong>calati</strong> (da {p("Scippi", "Italia", "2015-2016")} a {p("Scippi", "Italia", "2022-2023")}), forse per rassegnazione su
        reati percepiti come a basso recupero. Le frodi/truffe mostrano un{" "}
        <strong>lieve aumento</strong> (da {p("Frodi/truffe", "Italia", "2015-2016")} a {p("Frodi/truffe", "Italia", "2022-2023")}), probabilmente legato
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

      <ChartFullscreenWrapper ariaDescription="Grafico propensione alla denuncia per macro-area geografica e tipo di reato, 2022-2023. Il Sud denuncia più della media per reati violenti e contro la proprietà">
        <Plot
          data={[
            ...Object.entries(macroCat2023).map(([cat, vals], i) => ({
              name: cat,
              x: macroaree,
              y: vals,
              type: "bar" as const,
              marker: { color: coloriMacro[i] },
              text: vals.map((v) => fmtPct(v)),
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
              text: fmtPct(val),
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
        contro la proprietà ({p("Reati proprietà individuale", "Sud", "2022-2023")} vs{" "}
        {p("Reati proprietà individuale", "Italia", "2022-2023")}), reati violenti ({p("Reati violenti", "Sud", "2022-2023")} vs{" "}
        {p("Reati violenti", "Italia", "2022-2023")}) e reati contro i veicoli ({p("Reati veicoli", "Sud", "2022-2023")} vs{" "}
        {p("Reati veicoli", "Italia", "2022-2023")}). Sono il{" "}
        <strong>Nord-est</strong> e le <strong>Isole</strong> a denunciare meno
        per quasi tutte le categorie. Il <strong>Centro</strong> ha la
        propensione più alta per i reati violenti ({p("Reati violenti", "Centro", "2022-2023")}).
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
          al Sud passano da {p("Aggressioni", "Sud", "2015-2016")} a {p("Aggressioni", "Sud", "2022-2023")} ({punti("Aggressioni", "Sud")} punti), al Centro{" "}
          da {p("Aggressioni", "Centro", "2015-2016")} a {p("Aggressioni", "Centro", "2022-2023")} ({punti("Aggressioni", "Centro")} punti). Le rapine al Sud passano{" "}
          da {p("Rapine", "Sud", "2015-2016")} a {p("Rapine", "Sud", "2022-2023")} ({punti("Rapine", "Sud")} punti).
          Al contrario, gli scippi denunciati calano drasticamente al{" "}
          <strong>Nord-ovest</strong> (da {p("Scippi", "Nord-ovest", "2015-2016")} a {p("Scippi", "Nord-ovest", "2022-2023")}) e al{" "}
          <strong>Nord-est</strong> (da {p("Scippi", "Nord-est", "2015-2016")} a {p("Scippi", "Nord-est", "2022-2023")}). I borseggi aumentano
          ovunque tranne che alle Isole. I furti di veicoli crescono fortemente al{" "}
          <strong>Sud</strong> (da {p("Furti veicoli", "Sud", "2015-2016")} a {p("Furti veicoli", "Sud", "2022-2023")}) e alle{" "}
          <strong>Isole</strong> (da {p("Furti veicoli", "Isole", "2015-2016")} a {p("Furti veicoli", "Isole", "2022-2023")}). I furti di oggetti dai
          veicoli aumentano al Nord ma calano alle Isole.
        </p>
      </CollapsibleSection>

      <p className="text-xs text-muted-foreground">
        Fonti:{" "}
        <a
          href={fonti.sicurezza_2015_2016.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ISTAT Reati contro la persona 2015-2016 (Prospetto 6)
        </a>
        ,{" "}
        <a
          href={fonti.sicurezza_2022_2023.url}
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
          href={fonti.violenza_donne_2025.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ISTAT Violenza contro le donne 2025
        </a>
        . Violenza da partner non ha confronto storico diretto (fonte diversa).
        Furti auto/moto stabili in entrambe le edizioni.
      </p>
    </div>
  );
}
