"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { InsightChartConfig } from "@/components/charts/insight-mini-chart";

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

const INSIGHTS: Insight[] = [
  // --- TREND STRUTTURALI ---
  {
    id: "rapine-banca",
    title: "Rapine in banca: un reato in via di estinzione",
    category: "trend",
    dimensions: [],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Gli autori denunciati per rapine in banca sono passati da 2.893 a 367, con un calo quasi ininterrotto nel tempo. La digitalizzazione dei servizi bancari e il rafforzamento delle misure di sicurezza fisiche hanno reso questo reato sempre meno praticabile.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "OFFEND", code: "BANKROB", xField: "anno", yField: "totale", label: "Autori denunciati", color: "#8B4513" },
      ],
    },
  },
  {
    id: "stalking",
    title: "Stalking: emersione costante del fenomeno",
    category: "trend",
    dimensions: [],
    tests: ["mann-kendall"],
    period: "2009-2024",
    body: "Le vittime di atti persecutori (stalking) sono passate da circa 5.000 a oltre 18.800 (+278%), con una crescita quasi costante anno dopo anno. L\u2019introduzione del reato nel 2009 (art. 612-bis c.p.) e le successive campagne di sensibilizzazione hanno progressivamente ridotto il numero oscuro, portando pi\u00f9 vittime a denunciare.",
    caveat:
      "L\u2019aumento delle denunce \u00e8 un indicatore di emersione, non necessariamente di aumento del fenomeno reale.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "CP612BIS", xField: "anno", yField: "totale", label: "Vittime", color: "#d62728" },
      ],
    },
  },
  {
    id: "truffe",
    title: "Truffe e frodi informatiche: il reato del decennio",
    category: "trend",
    dimensions: [],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Le vittime di truffe e frodi informatiche sono pi\u00f9 che raddoppiate: da 109.000 a 236.000, con una crescita graduale lungo l\u2019intero periodo. Gli autori denunciati sono passati da 46.000 a 73.000. Il fenomeno \u00e8 uniforme su tutto il territorio: in 64 regioni-reato su 88 analizzate, il trend regionale \u00e8 significativamente crescente.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "SWINCYB", xField: "anno", yField: "totale", label: "Vittime", color: "#ff7f0e" },
        { dataType: "OFFEND", code: "SWINCYB", xField: "anno", yField: "totale", label: "Autori", color: "#ff7f0e", dash: "dash" },
      ],
    },
  },
  {
    id: "omicidi",
    title: "Omicidi volontari in calo strutturale",
    category: "trend",
    dimensions: [],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Gli autori denunciati per omicidio volontario sono scesi da 1.199 a 771 (-36%), le vittime da 631 a 328 (-48%), con un calo graduale lungo l\u2019intero periodo. Il calo include gli omicidi di tipo mafioso, passati da 476 a 130 autori denunciati. Il trend \u00e8 coerente con la tendenza europea di lungo periodo.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "INTENHOM", xField: "anno", yField: "totale", label: "Vittime", color: "#d62728" },
        { dataType: "OFFEND", code: "INTENHOM", xField: "anno", yField: "totale", label: "Autori", color: "#d62728", dash: "dash" },
      ],
    },
  },
  {
    id: "sequestri",
    title: "Sequestri di persona dimezzati",
    category: "trend",
    dimensions: [],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Autori denunciati passati da 2.355 a 1.185, vittime da 2.095 a 737. Il calo \u00e8 presente in circa 3 anni su 4, un reato che ha perso progressivamente attrattivit\u00e0 criminale.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "KIDNAPP", xField: "anno", yField: "totale", label: "Vittime", color: "#17becf" },
        { dataType: "OFFEND", code: "KIDNAPP", xField: "anno", yField: "totale", label: "Autori", color: "#17becf", dash: "dash" },
      ],
    },
  },
  {
    id: "usura",
    title: "Usura: le denunce crollano, ma il sommerso resta",
    category: "trend",
    dimensions: [],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Gli autori denunciati per usura sono passati da 1.392 a 495, le vittime da 298 a 106. Un calo graduale lungo l\u2019intero periodo, che va letto con cautela.",
    caveat:
      "L\u2019usura \u00e8 per sua natura un reato con alta cifra oscura: il rapporto di dipendenza tra vittima e usuraio rende la denuncia rara. Il calo delle denunce non implica un calo del fenomeno.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "OFFEND", code: "USURY", xField: "anno", yField: "totale", label: "Autori", color: "#9467bd" },
        { dataType: "VICTIM", code: "USURY", xField: "anno", yField: "totale", label: "Vittime", color: "#9467bd", dash: "dash" },
      ],
    },
  },
  {
    id: "estorsioni",
    title: "Estorsioni: pi\u00f9 vittime, meno stranieri coinvolti",
    category: "trend",
    dimensions: ["stranieri"],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Le vittime di estorsione sono aumentate del 70%, da 6.704 a 11.433, con una crescita graduale nel tempo. Contemporaneamente, la percentuale di vittime straniere \u00e8 scesa dal 16,4% all\u20198,8% con andamento altrettanto costante. L\u2019estorsione colpisce in misura crescente cittadini italiani.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "EXTORT", xField: "anno", yField: "totale", label: "Vittime", color: "#2E86AB" },
        { dataType: "VICTIM", code: "EXTORT", xField: "anno", yField: "pct_stranieri", label: "% stranieri", color: "#E63946", yaxis: "y2" },
      ],
      yAxisLabel: "Vittime",
      y2AxisLabel: "% stranieri",
    },
  },
  // --- COMPOSIZIONE DEMOGRAFICA ---
  {
    id: "rapine-stranieri",
    title: "Rapine: la quota di autori stranieri raddoppia",
    category: "demografica",
    dimensions: ["stranieri"],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "La percentuale di autori stranieri denunciati per rapine \u00e8 passata dal 35,5% al 52,4% (+16,9 punti percentuali), con un aumento graduale lungo l\u2019intero periodo. Il trend \u00e8 coerente su tutte le tipologie: rapine in strada (47% \u2192 60%), in esercizi commerciali (36% \u2192 50%). Anche tra le vittime di rapina, la quota di stranieri \u00e8 salita dal 14% al 26%, con un aumento quasi costante anno dopo anno.",
    caveat:
      "Il dato riflette le denunce, non necessariamente la criminalit\u00e0 reale. Fattori come la maggiore visibilit\u00e0 e le pratiche di controllo differenziate possono influenzare la composizione degli autori denunciati.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "OFFEND", code: "ROBBER", xField: "anno", yField: "pct_stranieri", label: "% stranieri (autori)", color: "#E63946" },
      ],
      yAxisLabel: "%",
    },
  },
  {
    id: "furti-destrezza",
    title: "Furti con destrezza: ribaltamento di genere tra le vittime",
    category: "demografica",
    dimensions: ["genere", "stranieri"],
    tests: ["mann-kendall"],
    period: "2008-2024",
    body: "La percentuale di vittime donne di furti con destrezza (borseggi) \u00e8 scesa dall\u201981% al 54%, quella degli uomini \u00e8 salita dal 19% al 46%. \u00c8 la tendenza pi\u00f9 regolare dell\u2019intero dataset: in oltre 9 anni su 10 il valore si muove nella stessa direzione. Contemporaneamente, la quota di autori stranieri \u00e8 salita dal 34% al 61%.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "PICKTHEF", xField: "anno", yField: "pct_femmine", label: "% donne", color: "#e377c2" },
        { dataType: "VICTIM", code: "PICKTHEF", xField: "anno", yField: "pct_maschi", label: "% uomini", color: "#2E86AB" },
      ],
      yAxisLabel: "%",
    },
  },
  {
    id: "cybercrimine-genere",
    title: "Cybercrimine: convergenza di genere",
    category: "demografica",
    dimensions: ["genere"],
    tests: ["mann-kendall"],
    period: "2008-2024",
    body: "Tra le vittime di delitti informatici, le donne sono passate dal 34% al 49,6%, sfiorando la parit\u00e0 con gli uomini. Per truffe e frodi informatiche le vittime donne sono cresciute dal 34,5% al 43,4%, con un aumento quasi costante nel tempo. Il cybercrimine diventa progressivamente trasversale al genere.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "CYBERCRIM", xField: "anno", yField: "pct_femmine", label: "% donne (delitti inform.)", color: "#ff7f0e" },
        { dataType: "VICTIM", code: "SWINCYB", xField: "anno", yField: "pct_femmine", label: "% donne (truffe)", color: "#ff7f0e", dash: "dash" },
      ],
      yAxisLabel: "%",
    },
  },
  {
    id: "omicidi-donne",
    title: "Omicidi: la quota di vittime donne cresce",
    category: "demografica",
    dimensions: ["genere"],
    tests: ["mann-kendall"],
    period: "2008-2024",
    body: "Le vittime donne di omicidio volontario sono passate dal 24% al 34,5% del totale, con un aumento graduale nel tempo. Non perch\u00e9 i femminicidi aumentino, ma perch\u00e9 calano di pi\u00f9 gli omicidi con vittime maschili, in particolare quelli legati alla criminalit\u00e0 organizzata.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "INTENHOM", xField: "anno", yField: "pct_femmine", label: "% vittime donne", color: "#e377c2" },
      ],
      yAxisLabel: "%",
    },
  },
  {
    id: "violenze-sessuali-straniere",
    title:
      "Violenze sessuali: il tasso sale, la quota di vittime straniere scende",
    category: "demografica",
    dimensions: ["stranieri"],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Il tasso di violenze sessuali denunciate \u00e8 aumentato da 7,0 a 11,6 per 100.000 abitanti, con una crescita graduale lungo l\u2019intero periodo. Contemporaneamente, la percentuale di vittime straniere \u00e8 scesa dal 31% al 22,5% (-8,5 punti percentuali).",
    caveat:
      "L\u2019aumento delle denunce riflette principalmente campagne di sensibilizzazione (es. #MeToo) e maggiore fiducia nelle istituzioni. \u00c8 un segnale positivo di emersione del sommerso, non necessariamente di aumento del fenomeno.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "VICTIM", code: "RAPE", xField: "anno", yField: "pct_stranieri", label: "% vittime straniere", color: "#E63946" },
      ],
      yAxisLabel: "%",
    },
  },
  {
    id: "incendi-dolosi",
    title: "Incendi dolosi: pi\u00f9 autori e pi\u00f9 stranieri",
    category: "demografica",
    dimensions: ["stranieri"],
    tests: ["mann-kendall"],
    period: "2007-2024",
    body: "Gli autori denunciati per incendi dolosi sono aumentati di 607 unit\u00e0, e la percentuale di autori stranieri \u00e8 salita dal 17,4% al 34% (+16,6 punti percentuali). Entrambi i trend sono graduali lungo l\u2019intero periodo.",
    chart: {
      file: "autori_vittime_trend.json",
      series: [
        { dataType: "OFFEND", code: "ARSON", xField: "anno", yField: "totale", label: "Autori", color: "#d62728" },
        { dataType: "OFFEND", code: "ARSON", xField: "anno", yField: "pct_stranieri", label: "% stranieri", color: "#E63946", yaxis: "y2" },
      ],
      yAxisLabel: "Autori",
      y2AxisLabel: "% stranieri",
    },
  },
  // --- ANOMALIE E DIVERGENZE ---
  {
    id: "percezione",
    title: "Percezione e realt\u00e0: trend simili, nesso incerto",
    category: "anomalie",
    dimensions: [],
    tests: ["spearman"],
    period: "2014-2024",
    body: "Dal 2015 al 2020 entrambe le serie calano; dal 2021 entrambe risalgono. La correlazione sui livelli \u00e8 positiva e significativa (Spearman), ma con soli 11 punti e un possibile cambio metodologico nel 2015 va interpretata con cautela. La somiglianza dei trend potrebbe riflettere fattori comuni (COVID, ciclo mediatico) pi\u00f9 che un nesso diretto tra criminalit\u00e0 reale e percezione.",
    caveat:
      "La percezione di insicurezza \u00e8 influenzata dalla copertura mediatica, dal clima politico e da fattori locali che i dati aggregati non catturano. Il salto 2014-2015 potrebbe riflettere un cambio metodologico ISTAT.",
    chart: {
      file: "percezione_vs_dati.json",
      series: [
        { xField: "Anno", yField: "Tasso_per_1000", label: "Tasso delitti per 1.000", color: "#2E86AB" },
        { xField: "Anno", yField: "Percezione_pct", label: "Percezione insicurezza %", color: "#E63946", yaxis: "y2" },
      ],
      yAxisLabel: "Tasso per 1.000",
      y2AxisLabel: "Percezione %",
    },
  },
  {
    id: "violenze-divergenza",
    title: "Violenze sessuali: divergenza regionale crescente",
    category: "anomalie",
    dimensions: ["territoriale"],
    tests: ["divergenza"],
    period: "2007-2024",
    body: "La dispersione dei tassi di violenze sessuali tra regioni aumenta significativamente nel tempo, sia per gli autori sia per le vittime. Il fenomeno non \u00e8 uniforme sul territorio: alcune regioni mostrano aumenti marcati, altre stagnazione. Questo pu\u00f2 riflettere differenze nella propensione alla denuncia pi\u00f9 che nella diffusione del reato.",
  },
  {
    id: "reati-fisici-digitali",
    title: "Reati fisici e digitali: due velocit\u00e0 investigative",
    category: "anomalie",
    dimensions: [],
    tests: ["rapporto-av"],
    period: "2007-2024",
    body: "Per i reati fisici, il rapporto tra autori identificati e vittime migliora costantemente: nelle rapine passa da 0,45 a 1,05 (oggi si identifica pi\u00f9 di un autore per ogni vittima), nelle rapine in esercizi commerciali da 0,64 a 1,87. Per i reati digitali accade l\u2019opposto: nei delitti informatici il rapporto crolla da 0,29 a 0,08 (un autore ogni 12 vittime), nelle truffe da 0,43 a 0,31. Le vittime digitali crescono molto pi\u00f9 velocemente della capacit\u00e0 di identificare gli autori.",
  },
  // --- CONFRONTI TRA CATEGORIE ---
  {
    id: "informatici-patrimoniali",
    title: "Reati informatici vs patrimoniali: il sorpasso tra le vittime",
    category: "categorie",
    dimensions: [],
    tests: ["confronto-categorie"],
    period: "2007-2024",
    body: "La differenza nel numero di vittime tra reati patrimoniali e informatici si riduce significativamente nel tempo: le vittime di reati informatici crescono molto pi\u00f9 velocemente di quelle dei reati patrimoniali tradizionali (cambio: -1.018.000 nella differenza). Le truffe online stanno erodendo la predominanza dei furti fisici.",
  },
  {
    id: "violenti-patrimoniali",
    title: "Reati violenti vs patrimoniali: le vittime divergono",
    category: "categorie",
    dimensions: [],
    tests: ["confronto-categorie"],
    period: "2007-2024",
    body: "La differenza nel numero di vittime tra reati violenti e patrimoniali cresce significativamente (+900.000): i reati patrimoniali calano pi\u00f9 di quelli violenti. Il profilo complessivo della criminalit\u00e0 denunciata si sta spostando: meno reati contro il patrimonio, tenuta dei reati contro la persona.",
  },
  {
    id: "stranieri-categorie",
    title: "Autori stranieri: pi\u00f9 concentrati nei reati violenti",
    category: "categorie",
    dimensions: ["stranieri"],
    tests: ["confronto-categorie"],
    period: "2007-2024",
    body: "La differenza nella percentuale di autori stranieri tra reati violenti e informatici \u00e8 in crescita (+9,2 punti percentuali): la quota di stranieri aumenta pi\u00f9 nei reati violenti che in quelli informatici, dove anzi diminuisce (dal 37% al 20%).",
    caveat:
      "La composizione degli autori denunciati riflette anche pratiche di controllo differenziate e differente visibilit\u00e0 dei reati, non solo la reale distribuzione della criminalit\u00e0.",
  },
  // --- CONFRONTI TERRITORIALI ---
  {
    id: "rapine-nord-sud",
    title: "Rapine: il gap Nord-Sud si inverte",
    category: "territoriali",
    dimensions: ["territoriale"],
    tests: ["confronto-territoriale"],
    period: "2007-2024",
    body: "Il tasso di rapine (vittime) al Nord cresce rispetto al Sud in modo costante, con la differenza che aumenta in circa 3 anni su 4. Sia nel confronto Nord vs Sud (+63 per 100k) sia Centro vs Sud (+61 per 100k). Il tradizionale divario con il Mezzogiorno si sta riducendo o invertendo per questo tipo di reato.",
  },
  {
    id: "truffe-nord",
    title: "Truffe informatiche: il Nord corre di pi\u00f9",
    category: "territoriali",
    dimensions: ["territoriale"],
    tests: ["confronto-territoriale"],
    period: "2007-2024",
    body: "Il tasso di truffe e frodi informatiche (vittime) al Nord cresce pi\u00f9 che al Sud (+118 per 100k nella differenza). Anche per gli autori, il divario Nord-Sud aumenta (+85 per 100k), con la differenza che cresce in 2 anni su 3. La digitalizzazione pi\u00f9 avanzata espone a maggiore vittimizzazione informatica.",
  },
  {
    id: "violenze-nord",
    title: "Violenze sessuali: il Nord supera il Sud",
    category: "territoriali",
    dimensions: ["territoriale"],
    tests: ["confronto-territoriale"],
    period: "2007-2024",
    body: "Il tasso di autori denunciati per violenze sessuali al Nord cresce significativamente rispetto al Sud (+2,3 per 100k) e al Centro (+1,8 per 100k). Il divario si amplia anche per le vittime.",
    caveat:
      "Questa divergenza potrebbe riflettere una maggiore propensione alla denuncia al Nord pi\u00f9 che una reale differenza nei tassi di violenza. Il numero oscuro delle violenze sessuali \u00e8 molto alto e varia per territorio.",
  },
  {
    id: "stupefacenti-stranieri",
    title: "Autori stranieri per stupefacenti: divario Nord-Sud crescente",
    category: "territoriali",
    dimensions: ["stranieri", "territoriale"],
    tests: ["confronto-territoriale"],
    period: "2007-2024",
    body: "La differenza nella percentuale di autori stranieri per stupefacenti tra Nord e Sud cresce di circa 10 punti percentuali, con un aumento presente in 2 anni su 3. Al Nord la quota di autori stranieri per droga aumenta molto pi\u00f9 che al Sud, coerentemente con la diversa composizione demografica dei territori.",
  },
];

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
            <strong>2.209 combinazioni</strong> di reato, dimensione
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
            al 5%, separatamente per ogni tipo di analisi. Tutti gli insight
            presentati in questa pagina hanno superato questa correzione.
          </p>

          <p>Sono state inoltre escluse dall&apos;analisi:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Combinazioni con meno di 50 persone/anno (numeri troppo piccoli
              per essere affidabili)
            </li>
            <li>Serie con meno di 5 anni di dati disponibili</li>
            <li>
              Variazioni inferiori a 3 punti percentuali sull&apos;intero
              periodo
            </li>
          </ul>

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
        {insight.caveat && <Caveat>{insight.caveat}</Caveat>}
      </div>
      {insight.chart && (
        <div className="pt-1">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            <span
              className="inline-block transition-transform duration-200"
              style={{ transform: showChart ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              &#9654;
            </span>
            {showChart ? "Nascondi grafico" : "Mostra il grafico"}
          </button>
          {showChart && (
            <div className="mt-2">
              <Suspense
                fallback={
                  <div className="h-[300px] animate-pulse bg-muted rounded" />
                }
              >
                <InsightMiniChart config={insight.chart} />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground italic border-l-2 border-amber-300 pl-3 mt-2">
      {children}
    </p>
  );
}
