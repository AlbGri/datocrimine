import type { Data, Layout, LayoutAxis } from "plotly.js";
import { COLORS } from "@/lib/config";
import { testo, titoli } from "@/lib/caratteri";
import { COLORI_CHIARI, leggiColori, modelloGrafici, traduciColori } from "@/lib/tema";

/** Il div che Plotly disegna: tiene dati e layout del grafico mostrato */
export interface Figura extends HTMLElement {
  data: Data[];
  layout: Partial<Layout>;
  _fullLayout?: { _size?: { l: number } };
}

export type Righe = (string | number)[][];

export function scarica(nome: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = nome;
  a.click();
}

/** CSV per Excel in italiano: punto e virgola, virgola decimale, BOM per gli accenti */
export function scaricaCsv(nome: string, righe: Righe) {
  const cella = (v: string | number) =>
    typeof v === "number" ? String(v).replace(".", ",") : `"${v.replace(/"/g, '""')}"`;
  const csv = righe.map((r) => r.map(cella).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  scarica(nome, url);
  URL.revokeObjectURL(url);
}

function titoloAsse(asse?: Partial<LayoutAxis>): string {
  const t = asse?.title;
  return (typeof t === "string" ? t : t?.text) ?? "";
}

type Traccia = {
  type?: string;
  name?: string;
  orientation?: "h" | "v";
  yaxis?: string;
  x?: (string | number)[];
  y?: (string | number)[];
  locations?: string[];
  text?: string[];
  z?: number[];
};

/** Le righe di cio' che il grafico mostra: una per punto, con la serie se ce n'e' piu' d'una */
export function righeDaFigura(figura: Figura): Righe {
  const tracce = figura.data as Traccia[];
  const { xaxis, yaxis } = figura.layout;
  const conSerie = tracce.length > 1;
  // Con due assi l'unita' cambia da serie a serie: la dice il nome della serie
  const dueAssi = tracce.some((t) => t.yaxis === "y2");
  const righe: Righe = [];
  let intestazione: string[] = [];
  for (const t of tracce) {
    if (t.type === "choropleth") {
      intestazione = ["Territorio", "Valore"];
      (t.locations ?? []).forEach((l, i) => righe.push([t.text?.[i] ?? l, t.z?.[i] ?? ""]));
      continue;
    }
    const orizzontale = t.orientation === "h";
    const voci = (orizzontale ? t.y : t.x) ?? [];
    const valori = (orizzontale ? t.x : t.y) ?? [];
    const nomeVoci =
      titoloAsse(orizzontale ? yaxis : xaxis) || (typeof voci[0] === "number" ? "Anno" : "Voce");
    intestazione = [nomeVoci, (!dueAssi && titoloAsse(orizzontale ? xaxis : yaxis)) || "Valore"];
    const serie = conSerie ? [t.name ?? ""] : [];
    voci.forEach((v, i) => righe.push([...serie, v, valori[i] ?? ""]));
  }
  return [conSerie ? ["Serie", ...intestazione] : intestazione, ...righe];
}

interface Testi {
  titolo: string;
  sottotitolo?: string;
  nota?: string | null;
  /** Righe in fondo all'immagine: fonte e indirizzo */
  piede: string[];
}

// L'immagine esce dal sito (stampa, chat): sempre nei colori del tema chiaro
const FONDO = COLORS.superficie;
const GIALLO = "#f6eb61"; // stile:consentito
const LATO = 24;

/** Le righe di un testo che stanno nella larghezza data, col carattere gia' impostato */
function aCapo(ctx: CanvasRenderingContext2D, testo: string, larghezza: number): string[] {
  const righe: string[] = [];
  let riga = "";
  for (const parola of testo.split(" ")) {
    const prova = riga ? `${riga} ${parola}` : parola;
    if (riga && ctx.measureText(prova).width > larghezza) {
      righe.push(riga);
      riga = parola;
    } else riga = prova;
  }
  return [...righe, riga];
}

/**
 * PNG da condividere: il grafico com'e', con titolo, nota, fonte e indirizzo dentro l'immagine.
 * I testi li scrive il canvas con i caratteri del sito: nell'immagine di Plotly i caratteri del
 * sito non arrivano e il titolo uscirebbe in un serif generico.
 */
export async function immagineDaFigura(figura: Figura, testi: Testi): Promise<string> {
  const { Plotly } = await import("./plotly-component");
  const larghezza = 1200;
  const utile = larghezza - 2 * LATO;
  const fontTitolo = `700 28px ${titoli.style.fontFamily}`;
  const fontTesto = `16px ${testo.style.fontFamily}`;
  const fontPiede = `13px ${testo.style.fontFamily}`;
  await Promise.all([fontTitolo, fontTesto].map((f) => document.fonts.load(f)));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = fontTitolo;
  const righeTitolo = aCapo(ctx, testi.titolo, utile);
  ctx.font = fontTesto;
  const righeSotto = [
    ...(testi.sottotitolo ? aCapo(ctx, testi.sottotitolo, utile).map((r) => [r, COLORS.grigioTesto]) : []),
    ...(testi.nota ? aCapo(ctx, testi.nota, utile).map((r) => [r, COLORS.testoScuro]) : []),
  ];
  ctx.font = fontPiede;
  const righePiede = testi.piede.flatMap((r) => aCapo(ctx, r, utile));
  const testa = LATO + righeTitolo.length * 36 + righeSotto.length * 22 + 8;
  const piede = 8 + righePiede.length * 18 + LATO;

  // Sotto l'asse: etichette, poi la legenda se sta sotto
  const margine = figura.layout.margin ?? {};
  const { legend, xaxis } = figura.layout;
  const sottoAsse = titoloAsse(xaxis) ? 75 : 50;
  const legendaSotto = figura.layout.showlegend !== false && (legend?.y ?? 1) < 0;
  const alto = margine.t ?? 20;
  const basso = sottoAsse + (legendaSotto ? 50 : 0);
  const altezza = Math.max(675 - testa - piede, (figura.layout.height ?? 450) + 50);
  const areaGrafico = altezza - alto - basso;

  // Il grafico mostrato ha i colori del tema in uso: tornano quelli chiari
  const attuali = leggiColori();
  const inChiaro = <T,>(valore: T) => traduciColori(valore, attuali, COLORI_CHIARI);
  const layout: Partial<Layout> = {
    ...inChiaro(figura.layout),
    template: modelloGrafici(COLORI_CHIARI),
    width: larghezza,
    height: altezza,
    paper_bgcolor: FONDO,
    plot_bgcolor: FONDO,
    margin: { ...margine, t: alto, b: basso },
    ...(legendaSotto && { legend: { ...legend, y: -sottoAsse / areaGrafico, yanchor: "top" } }),
  };
  const grafico = new Image();
  grafico.src = await Plotly.toImage(
    { data: inChiaro(figura.data), layout },
    { format: "png", width: larghezza, height: altezza },
  );
  await grafico.decode();

  canvas.width = larghezza;
  canvas.height = testa + altezza + piede;
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let y = LATO;
  ctx.font = fontTitolo;
  for (const riga of righeTitolo) {
    // Il tratto da evidenziatore sotto il titolo, come nei link del sito: la firma dell'immagine
    ctx.fillStyle = GIALLO;
    ctx.fillRect(LATO, y + 18, ctx.measureText(riga).width, 13);
    ctx.fillStyle = COLORS.testoScuro;
    ctx.fillText(riga, LATO, y + 27);
    y += 36;
  }
  ctx.font = fontTesto;
  for (const [riga, colore] of righeSotto) {
    ctx.fillStyle = colore;
    ctx.fillText(riga, LATO, y + 16);
    y += 22;
  }
  ctx.drawImage(grafico, 0, testa);
  y = testa + altezza + 8;
  ctx.font = fontPiede;
  ctx.fillStyle = COLORS.grigioTesto;
  for (const riga of righePiede) {
    ctx.fillText(riga, LATO, y + 13);
    y += 18;
  }
  return canvas.toDataURL("image/png");
}
