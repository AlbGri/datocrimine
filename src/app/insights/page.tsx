"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { InsightChartConfig } from "@/components/charts/insight-mini-chart";
import insightsData from "@/data/insights.json";
import insightsMeta from "@/data/insights_meta.json";
import { fmtNum } from "@/lib/format";

const InsightMiniChart = lazy(
  () =>
    import("@/components/charts/insight-mini-chart").then((m) => ({
      default: m.InsightMiniChart,
    }))
);

/* ================================================================
   Tipi
   ================================================================ */

type Category =
  | "trend"
  | "demografica"
  | "anomalie"
  | "categorie"
  | "territoriali";

type Dimension = "genere" | "stranieri" | "territoriale";

type TestType =
  | "mann-kendall"
  | "spearman"
  | "divergenza"
  | "confronto-categorie"
  | "confronto-territoriale"
  | "rapporto-av";

type Insight = {
  id: string;
  title: string;
  category: Category;
  dimensions: Dimension[];
  tests: TestType[];
  period: string;
  body: string;
  caveat?: string;
  chart?: InsightChartConfig;
  /** Dettaglio espandibile sotto il grafico (es. composizione categorie aggregate) */
  chartInfo?: string;
  /** Nota sulla composizione di genere delle vittime (es. "Il 90% delle vittime sono donne") */
  genderNote?: string;
};

/* ================================================================
   Metadata
   ================================================================ */

const CATEGORY_ORDER: Category[] = [
  "trend",
  "demografica",
  "anomalie",
  "categorie",
  "territoriali",
];

const CATEGORIES: Record<Category, { label: string; description: string }> = {
  trend: {
    label: "Trend strutturali",
    description:
      "Fenomeni di lungo periodo con direzione costante negli ultimi 10-17 anni",
  },
  demografica: {
    label: "Composizione demografica",
    description: "Come cambia il profilo di autori e vittime nel tempo",
  },
  anomalie: {
    label: "Anomalie e divergenze",
    description:
      "Pattern inattesi, divergenze territoriali e confronti tra fenomeni",
  },
  categorie: {
    label: "Confronti tra categorie",
    description:
      "Come si muovono le macro-categorie (violenti, patrimoniali, informatici) l\u2019una rispetto all\u2019altra",
  },
  territoriali: {
    label: "Confronti territoriali",
    description:
      "Come divergono Nord, Centro e Sud nel tempo per reati e dimensioni demografiche",
  },
};

const DIMENSION_OPTIONS: { value: Dimension; label: string }[] = [
  { value: "genere", label: "Genere" },
  { value: "stranieri", label: "Stranieri" },
  { value: "territoriale", label: "Territoriale" },
];

const TESTS: Record<
  TestType,
  { label: string; anchor: string; className: string }
> = {
  "mann-kendall": {
    label: "Mann-Kendall",
    anchor: "test-mann-kendall",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  spearman: {
    label: "Spearman",
    anchor: "test-spearman",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  },
  divergenza: {
    label: "Divergenza regionale",
    anchor: "test-divergenza",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  "confronto-categorie": {
    label: "Confronto categorie",
    anchor: "test-confronto-categorie",
    className: "bg-teal-100 text-teal-800 hover:bg-teal-200",
  },
  "confronto-territoriale": {
    label: "Confronto territoriale",
    anchor: "test-confronto-territoriale",
    className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  },
  "rapporto-av": {
    label: "Rapporto A/V",
    anchor: "test-rapporto-av",
    className: "bg-rose-100 text-rose-800 hover:bg-rose-200",
  },
};

/* ================================================================
   Dati insight
   ================================================================ */

const INSIGHTS = insightsData as Insight[];

/* ================================================================
   Pagina
   ================================================================ */

export default function Insights() {
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [dimensionFilter, setDimensionFilter] = useState<Dimension | null>(
    null
  );

  const filtered = useMemo(() => {
    return INSIGHTS.filter((i) => {
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (dimensionFilter && !i.dimensions.includes(dimensionFilter))
        return false;
      return true;
    });
  }, [categoryFilter, dimensionFilter]);

  // Ordina per categoria (stesso ordine della vista raggruppata)
  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) -
        CATEGORY_ORDER.indexOf(b.category)
    );
  }, [filtered]);

  const hasFilter = categoryFilter !== null || dimensionFilter !== null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-4xl font-bold">Insights</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
          <p>
            <strong>Sezione sperimentale.</strong> Gli insight sono estratti
            tramite analisi statistica automatizzata sui dati ISTAT e curati con
            l&apos;assistenza di intelligenza artificiale. I risultati
            evidenziano correlazioni e trend statisticamente significativi, ma{" "}
            <strong>non implicano causalit&agrave;</strong>.
          </p>
          <p>
            I dati riflettono le denunce alle forze dell&apos;ordine, non i
            crimini reali. Variazioni nei numeri possono dipendere da
            cambiamenti nella propensione alla denuncia, nelle norme o nelle
            pratiche investigative. Interpretare con cautela.
          </p>
        </div>
      </div>

      {/* Filtri */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Categoria
          </span>
          <FilterPill
            active={categoryFilter === null}
            onClick={() => setCategoryFilter(null)}
          >
            Tutte
          </FilterPill>
          {CATEGORY_ORDER.map((cat) => (
            <FilterPill
              key={cat}
              active={categoryFilter === cat}
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? null : cat)
              }
            >
              {CATEGORIES[cat].label}
            </FilterPill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Dimensione
          </span>
          <FilterPill
            active={dimensionFilter === null}
            onClick={() => setDimensionFilter(null)}
          >
            Tutte
          </FilterPill>
          {DIMENSION_OPTIONS.map((d) => (
            <FilterPill
              key={d.value}
              active={dimensionFilter === d.value}
              onClick={() =>
                setDimensionFilter(
                  dimensionFilter === d.value ? null : d.value
                )
              }
            >
              {d.label}
            </FilterPill>
          ))}
        </div>

        {hasFilter && (
          <p className="text-sm text-muted-foreground">
            {sorted.length} insight su {INSIGHTS.length}
          </p>
        )}
      </div>

      {/* Insight */}
      {hasFilter ? (
        <div className="space-y-4">
          {sorted.map((insight) => (
            <InsightCard key={insight.id} insight={insight} showCategory />
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nessun insight corrisponde ai filtri selezionati.
            </p>
          )}
        </div>
      ) : (
        CATEGORY_ORDER.map((cat, i) => {
          const items = INSIGHTS.filter((ins) => ins.category === cat);
          return (
            <CollapsibleSection
              key={cat}
              title={CATEGORIES[cat].label}
              description={CATEGORIES[cat].description}
              defaultOpen={i === 0}
            >
              <div className="space-y-6">
                {items.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </CollapsibleSection>
          );
        })
      )}

      {/* Nota metodologica */}
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-semibold text-primary">
          Nota metodologica
        </h2>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>
            Gli insight sono stati estratti analizzando sistematicamente{" "}
            <strong>{fmtNum(insightsMeta.combinazioni_analizzate)} combinazioni</strong> di reato, dimensione
            demografica, territorio e periodo temporale. Ogni insight riporta un
            badge con il tipo di analisi statistica che lo supporta. Su queste
            combinazioni sono stati applicati i seguenti test:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li id="test-mann-kendall">
              <strong>
                <a
                  href="https://en.wikipedia.org/wiki/Mann%E2%80%93Kendall_trend_test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Test di Mann-Kendall
                </a>
              </strong>
              : verifica se una serie temporale ha una tendenza costante nel
              tempo (crescente o decrescente), anche in presenza di oscillazioni
              occasionali. Analizza l&apos;intera serie, non solo il primo e
              l&apos;ultimo punto
            </li>
            <li>
              <strong>
                <a
                  href="https://en.wikipedia.org/wiki/Theil%E2%80%93Sen_estimator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Stimatore Theil-Sen
                </a>
              </strong>
              : stima la velocit&agrave; del cambiamento calcolando la pendenza
              mediana tra tutte le coppie di punti, ignorando i valori estremi
            </li>
            <li>
              <strong>Anomalia dell&apos;ultimo anno</strong>: misura quanto il
              valore pi&ugrave; recente si discosta dalla media storica della
              serie. Identifica picchi o crolli insoliti nell&apos;ultimo anno
              disponibile
            </li>
            <li>
              <strong>Stabilit&agrave; della serie</strong>: misura quanto i
              valori oscillano attorno alla media. Serie stabili in cui compare
              un cambio improvviso sono pi&ugrave; significative
            </li>
            <li id="test-divergenza">
              <strong>Divergenza tra regioni</strong>: misura quanto i valori
              delle 20 regioni differiscono tra loro per ogni anno. Se la
              differenza cresce nel tempo, il fenomeno diventa meno uniforme sul
              territorio
            </li>
            <li id="test-spearman">
              <strong>
                <a
                  href="https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Correlazione di Spearman
                </a>
              </strong>
              : misura la correlazione tra le variazioni anno-su-anno di reati
              diversi (non tra le serie grezze, per evitare correlazioni spurie
              dovute a trend comuni). Valori prossimi a +1 indicano reati che si
              muovono insieme, a -1 reati con andamenti opposti
            </li>
            <li id="test-confronto-categorie">
              <strong>Confronto trend tra categorie</strong>: confronta
              l&apos;evoluzione di macro-categorie di reati (violenti,
              patrimoniali, informatici, droga) calcolando il trend della
              differenza tra le serie aggregate. Identifica se un fenomeno
              &egrave; specifico di una categoria o generalizzato
            </li>
            <li id="test-confronto-territoriale">
              <strong>Confronti territoriali Nord/Centro/Sud</strong>: calcola
              la media per ripartizione (Nord, Centro, Sud e Isole) per ogni
              reato e dimensione, poi analizza il trend della differenza tra
              ripartizioni. Rileva convergenze o divergenze territoriali
            </li>
            <li id="test-rapporto-av">
              <strong>Rapporto autori/vittime</strong>: per ogni reato, calcola
              come evolve il rapporto tra autori identificati e vittime nel
              tempo. Un rapporto in calo indica che le vittime crescono
              pi&ugrave; velocemente degli autori identificati
            </li>
          </ul>

          <p>
            Per isolare l&apos;effetto della pandemia, i test di trend vengono
            eseguiti escludendo gli anni 2020 e 2021 come risultato primario,
            confrontando poi con la serie completa. Quando i due risultati
            divergono, l&apos;insight viene segnalato come sensibile al COVID.
          </p>

          <p>
            Analizzando migliaia di combinazioni contemporaneamente, alcuni
            risultati apparirebbero significativi per puro caso. Per filtrare
            questi falsi positivi &egrave; stata applicata la correzione{" "}
            <strong>
              <a
                href="https://en.wikipedia.org/wiki/False_discovery_rate#Benjamini%E2%80%93Hochberg_procedure"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Benjamini-Hochberg (FDR)
              </a>
            </strong>{" "}
            al 5%, separatamente per ogni tipo di analisi. La correzione tiene
            conto di tutte le combinazioni analizzate, anche di quelle scartate
            dopo perch&eacute; l&apos;effetto era troppo piccolo. Tutti gli insight
            di questa pagina hanno superato questa correzione, tranne quello
            di contesto sul totale degli autori stranieri, che descrive una
            quota stabile.
          </p>

          <p>Sono state inoltre escluse dall&apos;analisi:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Combinazioni con meno di 50 persone/anno (numeri troppo piccoli
              per essere affidabili)
            </li>
            <li>Serie con meno di 5 anni di dati disponibili</li>
          </ul>
          <p>
            Dopo la correzione sono stati scartati i risultati con un effetto
            troppo piccolo per essere rilevanti: variazioni sotto i 3 punti
            percentuali, correlazioni fra reati sotto 0,7.
          </p>

          <p>
            Ogni candidato &egrave; stato poi valutato manualmente per escludere
            artefatti (cambiamenti normativi, effetto COVID, limiti dei dati
            ISTAT) e per contestualizzare i risultati. Dei candidati
            statisticamente significativi dopo correzione FDR, sono stati
            selezionati quelli pi&ugrave; rappresentativi per ciascuna delle 5
            categorie, privilegiando: effect size rilevante,
            interpretabilit&agrave; per un pubblico non tecnico, e
            diversit&agrave; tematica. La selezione &egrave; editoriale, non
            automatica.
          </p>

          <p>
            Codice sorgente dell&apos;analisi:{" "}
            <a
              href="https://github.com/AlbGri/datocrimine/blob/main/scripts/generate_insights.py"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              scripts/generate_insights.py
            </a>
            . Report completo con tutti i candidati statisticamente
            significativi (non solo quelli selezionati per questa pagina):{" "}
            <a
              href="https://github.com/AlbGri/datocrimine/blob/main/docs/insights_report.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              insights_report.md
            </a>
          </p>
        </div>
      </section>

      {/* Link al Report */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        <Link
          href="/report/2024"
          className="flex items-center justify-between gap-4 hover:underline"
        >
          <span>
            <strong>Report 2024</strong> &mdash; variazioni, tendenze e mappa
            regionale dei delitti denunciati.
          </span>
          <span className="text-primary text-xl shrink-0" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>
    </main>
  );
}

/* ================================================================
   Componenti locali
   ================================================================ */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function TestBadge({ test }: { test: TestType }) {
  const meta = TESTS[test];
  return (
    <button
      onClick={() => {
        const el = document.getElementById(meta.anchor);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
      className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${meta.className}`}
      title={`Vai alla spiegazione: ${meta.label}`}
    >
      {meta.label}
    </button>
  );
}

function InsightCard({
  insight,
  showCategory = false,
}: {
  insight: Insight;
  showCategory?: boolean;
}) {
  const [showChart, setShowChart] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div id={insight.id} className="rounded-lg border p-4 space-y-2 scroll-mt-20">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-base">{insight.title}</h3>
        <div className="flex gap-2 shrink-0 items-center flex-wrap justify-end">
          {showCategory && (
            <span className="text-xs text-muted-foreground">
              {CATEGORIES[insight.category].label}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {insight.period}
          </span>
          {insight.tests.map((test) => (
            <TestBadge key={test} test={test} />
          ))}
        </div>
      </div>
      <div className="text-sm space-y-2">
        <p>{insight.body}</p>
        {insight.genderNote && <GenderNote>{insight.genderNote}</GenderNote>}
        {insight.caveat && <Caveat>{insight.caveat}</Caveat>}
      </div>
      {insight.chart && (
        <div className="pt-1">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            <ChevronRight
              className={`size-3.5 transition-transform duration-200 ${showChart ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
            {showChart ? "Nascondi grafico" : "Mostra il grafico"}
          </button>
          {showChart && (
            <div className="mt-2">
              <Suspense
                fallback={
                  <div className="h-[300px] animate-pulse bg-muted rounded" />
                }
              >
                <InsightMiniChart config={insight.chart} ariaLabel={`Grafico: ${insight.title}`} />
              </Suspense>
              {insight.chartInfo && (
                <div className="mt-1">
                  <button
                    onClick={() => setShowInfo((v) => !v)}
                    className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
                    aria-expanded={showInfo}
                  >
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current text-[10px] font-medium">i</span>
                    <span>{showInfo ? "Nascondi dettaglio" : "Cosa include ogni categoria?"}</span>
                  </button>
                  {showInfo && (
                    <p className="text-xs text-muted-foreground mt-1 pl-5">
                      {insight.chartInfo}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GenderNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground border-l-2 border-pink-400 pl-3 mt-2">
      {children}
    </p>
  );
}

function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground italic border-l-2 border-amber-300 pl-3 mt-2">
      {children}
    </p>
  );
}
