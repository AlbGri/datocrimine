/** Formattazione numeri in formato italiano (virgola decimali, punto migliaia). */

/** Numero generico: 1234.5 → "1.234,5" */
export function fmtNum(value: number, decimals: number = 0): string {
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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

/**
 * Separatori Plotly per formato italiano.
 * Primo carattere = separatore decimale, secondo = separatore migliaia.
 * Da aggiungere nel layout di ogni grafico Plotly.
 */
export const PLOTLY_IT_SEPARATORS = ",.";
