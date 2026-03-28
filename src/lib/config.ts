export const COLORS = {
  primary: "#2E86AB",
  secondary: "#E63946",

  furti: "#1f77b4",
  violenze: "#d62728",
  truffe: "#ff7f0e",
  rapine: "#8B4513",
  droga: "#9467bd",
  altro: "#7f7f7f",

  omicidi: "#d62728",
  tentati_omicidi: "#ff7f0e",
  violenze_sessuali: "#8B008B",
  atti_minori: "#e377c2",
  rapine_abitazione: "#bcbd22",
  sequestri: "#17becf",

  // Demografici
  stranieri: "#E63946",
  maschi: "#2563eb",
  femmine: "#db2777",
  minori: "#7c3aed",

  // Strutturali
  mediaNazionale: "#dc2626",
  grigioMedia: "#999999",
  grigioAltro: "#9ca3af",
} as const;

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
  { value: "tasso", label: "Tasso per 100k ab.", color: COLORS.maschi },
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
  color: "rgba(200, 200, 200, 0.2)",
  label: "COVID-19",
} as const;

export const CHART_HEIGHT = 450;
export const CHART_HEIGHT_SMALL = 400;
export const CHART_HEIGHT_MAP = 550;

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

export const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  scrollZoom: false,
  responsive: true,
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

/** Proprietà base per tutti gli assi: disabilita zoom/pan/editing range */
export const AXIS_FIXED = { fixedrange: true } as const;

/** Asse x per anni: interi, no separatore migliaia, dtick condizionale (1 desktop, 2 mobile) */
export function getAxisYear(isMobile: boolean) {
  return { ...AXIS_FIXED, tickformat: "d", dtick: isMobile ? 2 : 1 };
}

/** Variazione % media triennale: media(2022-2024) vs media(2014-2016).
 *  Piu robusto del confronto puntuale perche smussa outlier annuali. */
export function varTriennale(
  values: { anno: number; tasso: number }[]
): number | null {
  const primi = values.filter((v) => v.anno >= 2014 && v.anno <= 2016);
  const ultimi = values.filter((v) => v.anno >= 2022 && v.anno <= 2024);
  if (primi.length < 2 || ultimi.length < 2) return null;
  const mp = primi.reduce((s, v) => s + v.tasso, 0) / primi.length;
  const mu = ultimi.reduce((s, v) => s + v.tasso, 0) / ultimi.length;
  if (mp === 0) return null;
  return ((mu - mp) / mp) * 100;
}

export const TRIENNALE_LABEL = "Var. triennale";
export const TRIENNALE_PERIODI = "'14-'16 vs '22-'24";

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
