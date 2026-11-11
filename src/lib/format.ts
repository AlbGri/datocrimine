/** Formattazione numeri in formato italiano (virgola decimali, punto migliaia). */

/** Numero generico: 1234.5 → "1.234,5" */
export function fmtNum(value: number, decimals: number = 0): string {
  // "always": in it-IT i numeri a 4 cifre resterebbero senza punto ("3858")
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: "always",
  });
}

/** Numero per i CSV, per Excel in italiano: 1234.5 → "1234,5" (senza punto delle migliaia) */
export function csvNum(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

/** Percentuale: 12.3 → "12,3%" */
export function fmtPct(value: number, decimals: number = 1): string {
  return `${fmtNum(value, decimals)}%`;
}

/** Numero con segno: +12.3 → "+12,3", -5.1 → "-5,1" */
export function fmtSigned(value: number, decimals: number = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${fmtNum(value, decimals)}`;
}

/** Percentuale con segno: +12.3 → "+12,3%", -5.1 → "−5,1%" */
export function fmtPctSigned(value: number, decimals: number = 1): string {
  return `${fmtSigned(value, decimals)}%`;
}

/** Data: "2026-03-17" → "17 marzo 2026" */
export function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Separatori Plotly per formato italiano.
 * Primo carattere = separatore decimale, secondo = separatore migliaia.
 * Da aggiungere nel layout di ogni grafico Plotly.
 */
export const PLOTLY_IT_SEPARATORS = ",.";
