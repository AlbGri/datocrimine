import { useMemo, useSyncExternalStore } from "react";
import type { Layout } from "plotly.js";
import { COLORE_BARRA, COLORE_BORDO, COLORS, SCALA_DIV, SCALA_SEQ, SERIE } from "@/lib/config";

/** Lanciato sul documento a ogni cambio di tema, scelto o del sistema: i grafici si ridisegnano */
export const EVENTO_TEMA = "cambiotema";

function temaScuro(): boolean {
  const scelto = document.documentElement.dataset.tema;
  return scelto ? scelto === "scuro" : matchMedia("(prefers-color-scheme: dark)").matches;
}

function iscrivi(avvisa: () => void) {
  document.addEventListener(EVENTO_TEMA, avvisa);
  return () => document.removeEventListener(EVENTO_TEMA, avvisa);
}

/** Vero se il tema in uso e' lo scuro; nell'HTML costruito e' sempre falso */
export function useTemaScuro(): boolean {
  return useSyncExternalStore(iscrivi, temaScuro, () => false);
}

/** Con un tema scelto a mano la barra del telefono prende quel colore, non quello del sistema */
export function aggiornaColoreBarra() {
  const scelto = document.documentElement.dataset.tema as keyof typeof COLORE_BARRA | undefined;
  if (!scelto) return;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => (meta.content = COLORE_BARRA[scelto]));
}

/** Colori dei grafici per nome della variabile di globals.css */
type Colori = Record<string, string>;

// I colori chiari di config.ts fanno da nome della voce: nello scuro diventano quelli della stessa variabile
export const COLORI_CHIARI: Colori = {
  ...Object.fromEntries(SERIE.map((c, i) => [`--s${i + 1}`, c])),
  ...Object.fromEntries(SCALA_SEQ.map((c, i) => [`--seq${i + 1}`, c])),
  ...Object.fromEntries(SCALA_DIV.map((c, i) => [`--div${i + 1}`, c])),
  "--altro": COLORS.altro,
  "--foreground": COLORS.testoScuro,
  "--muted-foreground": COLORS.grigioTesto,
  "--border": COLORE_BORDO,
  "--card": COLORS.superficie,
};

export function leggiColori(): Colori {
  const stile = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    Object.entries(COLORI_CHIARI).map(([nome, chiaro]) => [nome, stile.getPropertyValue(nome).trim() || chiaro]),
  );
}

/** I colori del tema corrente, riletti a ogni cambio di tema */
export function useColori(): Colori {
  const scuro = useTemaScuro();
  return useMemo(() => (scuro ? leggiColori() : COLORI_CHIARI), [scuro]);
}

function sostituisci(valore: unknown, mappa: Map<string, string>): unknown {
  if (typeof valore === "string") {
    if (!valore.startsWith("#")) return valore;
    // Le prime sette cifre sono il colore, le eventuali due dopo la trasparenza
    const nuovo = mappa.get(valore.slice(0, 7).toLowerCase());
    return nuovo ? nuovo + valore.slice(7) : valore;
  }
  if (!valore || typeof valore !== "object" || ArrayBuffer.isView(valore)) return valore;
  if (Array.isArray(valore)) {
    // Le serie di numeri restano com'erano; una scala di colori e' fatta di coppie [numero, colore]
    return valore.every((v) => typeof v === "number") ? valore : valore.map((v) => sostituisci(v, mappa));
  }
  return Object.fromEntries(
    Object.entries(valore).map(([k, v]) => [k, k === "geojson" ? v : sostituisci(v, mappa)]),
  );
}

/** Dati o layout di un grafico con i colori di un tema al posto di quelli dell'altro */
export function traduciColori<T>(valore: T, da: Colori, a: Colori): T {
  const mappa = new Map(
    Object.keys(da)
      .filter((nome) => da[nome] !== a[nome])
      .map((nome) => [da[nome].toLowerCase(), a[nome]]),
  );
  return mappa.size ? (sostituisci(valore, mappa) as T) : valore;
}

/** Modello Plotly dello stile comune: testi in colore secondario, griglia nel colore del bordo */
export function modelloGrafici(c: Colori): Layout["template"] {
  const asse = { gridcolor: c["--border"], linecolor: c["--border"], zerolinecolor: c["--muted-foreground"] };
  return {
    layout: {
      font: { color: c["--muted-foreground"] },
      xaxis: asse,
      yaxis: asse,
      hoverlabel: { bgcolor: c["--card"], bordercolor: c["--foreground"], font: { color: c["--foreground"] } },
    },
  };
}
