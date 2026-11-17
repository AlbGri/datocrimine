import gerarchiaReati from "../../public/data/reati_gerarchia.json";
import datiMeta from "@/data/dati_meta.json";
import { fmtPctSigned } from "@/lib/format";

// I sottotipi ISTAT (es. furti con destrezza) sono gia' contati nel padre (furti):
// nei confronti fra reati si mostra solo il padre
const SOTTOTIPI_REATO = new Set<string>(Object.values(gerarchiaReati).flat());
export const isVoceAutonoma = (codice: string) =>
  codice !== "TOT" && !SOTTOTIPI_REATO.has(codice);

/** Serie dei grafici dello stile comune, in ordine fisso (albgri-stile, STILE_COMUNE.md sez. 7):
 *  blu petrolio, ruggine, viola, verde bosco, prugna, turchese, ocra, mattone */
export const SERIE = [
  "#1d85b0", "#c06325", "#5e3d9e", "#317a45", "#912e6e", "#009f98", "#9d6d1c", "#843b3e",
] as const;
const [S1, S2, S3, S4, S5, S6, S7] = SERIE;

// Il colore segue la voce, non la posizione: la stessa voce ha lo stesso colore in ogni grafico
export const COLORS = {
  primary: S1,
  secondary: S2,

  furti: S1,
  truffe: S2,
  violenze: S3,
  rapine: S4,
  droga: S5,
  ingiurie: S6,
  altro: "#8a8796",

  omicidi: S1,
  tentati_omicidi: S2,
  violenze_sessuali: S3,
  rapine_abitazione: S4,
  atti_minori: S5,
  sequestri: S6,

  nord: S1,
  centro: S2,
  sud: S3,

  // Persone denunciate
  tasso: S1,
  stranieri: S6,
  maschi: S3,
  femmine: S7,
  minori: S4,

  // Strutturali, dai neutri dello stile comune
  mediaNazionale: "#26242b",
  grigioAltro: "#8a8796",
  grigioTesto: "#625f69",
  testoScuro: "#26242b",
} as const;

/** Scale delle mappe dello stile comune (sez. 7, "Scale delle mappe"), tema chiaro.
 *  Sequenziale dal valore basso all'alto; divergente blu sotto lo zero, ruggine sopra */
export const SCALA_SEQ = ["#d2edfc", "#8fcae9", "#45a4d0", "#097ca6", "#015473"] as const;
export const SCALA_DIV = [
  "#026083", "#3294c0", "#90c6e3", "#e4e6ec", "#e4b196", "#be7449", "#814622",
] as const;
/** Bordo delle regioni nelle mappe (--border): il passo piu' chiaro non si confonde col fondo */
export const COLORE_BORDO = "#caccd7";

// Confini delle classi, uguali per tutti gli anni cosi' gli anni restano confrontabili
export const CLASSI_TASSO_REGIONI = [30, 35, 40, 45] as const;
export const CLASSI_VARIAZIONE_PCT = [-10, -5, -2, 2, 5, 10] as const;

/** Indice della classe di un valore: 0 sotto il primo confine, confini.length dall'ultimo in su. */
export const classeDi = (valore: number, confini: readonly number[]) =>
  confini.filter((c) => valore >= c).length;

/** Scala a gradini per una coropleta Plotly: z e' l'indice della classe e la legenda
 *  scrive i confini fra un gradino e l'altro. */
export function scalaAGradini(
  colori: readonly string[],
  confini: readonly number[],
  etichetta: (confine: number) => string,
) {
  const n = colori.length;
  return {
    colorscale: colori.flatMap((c, i) => [[i / n, c], [(i + 1) / n, c]]),
    zmin: -0.5,
    zmax: n - 0.5,
    colorbar: {
      tickvals: confini.map((_, i) => i + 0.5),
      ticktext: confini.map(etichetta),
      outlinecolor: COLORE_BORDO,
    },
  };
}

export const COLORI_ALLARME: Record<string, string> = {
  "Omicidi volontari consumati": COLORS.omicidi,
  "Tentati omicidi": COLORS.tentati_omicidi,
  "Violenze sessuali": COLORS.violenze_sessuali,
  "Atti sessuali con minorenne": COLORS.atti_minori,
  "Rapine in abitazione": COLORS.rapine_abitazione,
  "Sequestri di persona": COLORS.sequestri,
};

export type MetricaProfilo = "tasso" | "pct_stranieri" | "pct_maschi" | "pct_femmine" | "pct_minori";

export const METRICHE_PROFILO: { value: MetricaProfilo; label: string; color: string }[] = [
  { value: "tasso", label: "Tasso per 100k ab.", color: COLORS.tasso },
  { value: "pct_stranieri", label: "% stranieri", color: COLORS.stranieri },
  { value: "pct_maschi", label: "% maschi", color: COLORS.maschi },
  { value: "pct_femmine", label: "% femmine", color: COLORS.femmine },
  { value: "pct_minori", label: "% minori", color: COLORS.minori },
];

export const BREAKDOWN_LINES = [
  { key: "pct_stranieri" as const, label: "% stranieri", color: COLORS.stranieri },
  { key: "pct_maschi" as const, label: "% maschi", color: COLORS.maschi },
  { key: "pct_femmine" as const, label: "% femmine", color: COLORS.femmine },
  { key: "pct_minori" as const, label: "% minori", color: COLORS.minori },
];

export const COVID_PERIOD = {
  start: 2019.8,
  end: 2021.2,
  color: "rgba(202, 204, 215, 0.35)",
  label: "COVID-19",
} as const;

export const CHART_HEIGHT = 450;
export const CHART_HEIGHT_SMALL = 400;
export const CHART_HEIGHT_MAP = 550;
export const CHART_HEIGHT_RANKING = 550;
export const CHART_HEIGHT_RANKING_MOBILE = 500;
export const CHART_HEIGHT_MINI = 300;

/** Soglia minima casi per calcoli percentuali affidabili */
export const MIN_CASI = 30;
/** Numero di reati nel ranking top N */
export const TOP_N = 10;
/** Codice reato default per VICTIM (serie lunga, alto volume) */
export const VICTIM_DEFAULT = "CULPINJU";

export const NUTS_TO_ISTAT: Record<string, number> = {
  ITC1: 1,
  ITC2: 2,
  ITC3: 7,
  ITC4: 3,
  ITD12: 4,
  ITD3: 5,
  ITD4: 6,
  ITD5: 8,
  ITE1: 9,
  ITE2: 10,
  ITE3: 11,
  ITE4: 12,
  ITF1: 13,
  ITF2: 14,
  ITF3: 15,
  ITF4: 16,
  ITF5: 17,
  ITF6: 18,
  ITG1: 19,
  ITG2: 20,
};

/** Font-size centralizzati per grafici Plotly */
export const PLOTLY_FONT = {
  axisTitle: 12,
  tick: 11,
  tickMobile: 9,
  legendFixed: 10,
  legendMobile: 9,
  legendMini: 11,
  annotationCovidMobile: 8,
  annotationMedia: 10,
  mapTitle: 18,
} as const;

/** Font annotation "Media nazionale" nei ranking */
export const MEDIA_ANNOTATION_FONT = {
  size: PLOTLY_FONT.annotationMedia,
  color: COLORS.mediaNazionale,
} as const;

export const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  scrollZoom: false,
  responsive: true,
  // Fondo cartografico servito dal sito, non da cdn.plot.ly (le mappe usano scope "europe")
  topojsonURL: "/topojson/",
  doubleClick: false,
  editable: false,
  edits: {
    axisTitleText: false,
    titleText: false,
    legendText: false,
    annotationText: false,
    annotationTail: false,
    annotationPosition: false,
    shapePosition: false,
    legendPosition: false,
  },
};

/** Fonti citate sotto ogni grafico e dentro l'immagine scaricata */
export const FONTI = {
  delitti: "ISTAT, delitti denunciati dalle forze di polizia all'autorità giudiziaria (DCCV_DELITTIPS)",
} as const;
export type Fonte = keyof typeof FONTI;

/** Layout legenda sotto il grafico, orizzontale, allineata a sinistra */
export const LEGEND_BOTTOM_LEFT = {
  x: 0, y: -0.2, xanchor: "left" as const, orientation: "h" as const,
  font: { size: PLOTLY_FONT.legendFixed },
};

/** Layout legenda per grafici multi-serie: sopra su desktop, sotto centrata su mobile */
export function getLegendMultiSeries(isMobile: boolean) {
  return isMobile
    ? { x: 0.5, y: -0.25, xanchor: "center" as const, yanchor: "top" as const, orientation: "h" as const, font: { size: PLOTLY_FONT.legendMobile } }
    : { x: 0.5, y: 1.08, xanchor: "center" as const, orientation: "h" as const };
}

/** Proprietà base per tutti gli assi: disabilita zoom/pan/editing range */
export const AXIS_FIXED = { fixedrange: true } as const;

/** Asse x per anni: interi, no separatore migliaia, dtick condizionale (1 desktop, 2 mobile) */
export function getAxisYear(isMobile: boolean) {
  return { ...AXIS_FIXED, tickformat: "d", dtick: isMobile ? 2 : 1 };
}

// Primo anno dei delitti scelto per qualita' delle serie; l'ultimo lo scrive generate_delittips.py
export const ANNO_PRIMO = 2014;
export const ANNO_ULTIMO: number = datiMeta.ultimo_anno;
export const ANNI_DELITTI = Array.from(
  { length: ANNO_ULTIMO - ANNO_PRIMO + 1 },
  (_, i) => ANNO_PRIMO + i,
);
export const PERIODO_DELITTI = `${ANNO_PRIMO}-${ANNO_ULTIMO}`;

// Persone denunciate: altra fonte ISTAT (AUTVITTPS), con un calendario suo
export const ANNO_PRIMO_AUTORI = 2007;
export const ANNO_ULTIMO_AUTORI = 2024;
export const PERIODO_AUTORI = `${ANNO_PRIMO_AUTORI}-${ANNO_ULTIMO_AUTORI}`;

export const TRIENNIO_INIZIALE = [ANNO_PRIMO, ANNO_PRIMO + 2] as const;
export const TRIENNIO_FINALE = [ANNO_ULTIMO - 2, ANNO_ULTIMO] as const;
export const TRIENNIO_TITOLO = `Media ${TRIENNIO_INIZIALE.join("-")} vs ${TRIENNIO_FINALE.join("-")}`;

/** Variazione % media triennale: media del triennio finale vs media del triennio iniziale.
 *  Piu robusto del confronto puntuale perche smussa outlier annuali. */
export function varTriennale(
  values: { anno: number; tasso: number }[],
  finale: readonly [number, number] = TRIENNIO_FINALE,
): number | null {
  const [i0, i1] = TRIENNIO_INIZIALE;
  const [f0, f1] = finale;
  const primi = values.filter((v) => v.anno >= i0 && v.anno <= i1);
  const ultimi = values.filter((v) => v.anno >= f0 && v.anno <= f1);
  if (primi.length < 2 || ultimi.length < 2) return null;
  const mp = primi.reduce((s, v) => s + v.tasso, 0) / primi.length;
  const mu = ultimi.reduce((s, v) => s + v.tasso, 0) / ultimi.length;
  if (mp === 0) return null;
  return ((mu - mp) / mp) * 100;
}

export const TRIENNALE_LABEL = "Var. triennale";
const anno2 = (anno: number) => `'${String(anno).slice(2)}`;
export const TRIENNALE_PERIODI = `${TRIENNIO_INIZIALE.map(anno2).join("-")} vs ${TRIENNIO_FINALE.map(anno2).join("-")}`;

/** Riga sotto un andamento, che entra anche nell'immagine scaricata */
export function notaTriennale(territorio: string, variazione: number | null): string | null {
  if (variazione === null) return null;
  return `${territorio}: ${fmtPctSigned(variazione)} dalla media ${TRIENNIO_INIZIALE.join("-")} alla media ${TRIENNIO_FINALE.join("-")}`;
}

export const COVID_SHAPES = [
  {
    type: "rect" as const,
    xref: "x" as const,
    yref: "paper" as const,
    x0: COVID_PERIOD.start,
    x1: COVID_PERIOD.end,
    y0: 0,
    y1: 1,
    fillcolor: COVID_PERIOD.color,
    line: { width: 0 },
    layer: "below" as const,
  },
];

export const COVID_ANNOTATIONS = [
  {
    x: (COVID_PERIOD.start + COVID_PERIOD.end) / 2,
    y: 1,
    xref: "x" as const,
    yref: "paper" as const,
    text: COVID_PERIOD.label,
    showarrow: false,
    font: { size: 9, color: "gray" },
  },
];

/** COVID annotations con font ridotto su mobile */
export function getCovidAnnotations(isMobile: boolean) {
  return isMobile
    ? COVID_ANNOTATIONS.map((a) => ({ ...a, y: 0.92, font: { ...a.font, size: PLOTLY_FONT.annotationCovidMobile } }))
    : COVID_ANNOTATIONS;
}
