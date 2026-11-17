import type { Data, Layout, LayoutAxis } from "plotly.js";

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
  piede: string;
}

/** PNG da condividere: il grafico com'e', con titolo, nota, fonte e indirizzo dentro l'immagine */
export async function immagineDaFigura(figura: Figura, testi: Testi): Promise<string> {
  const { Plotly } = await import("./plotly-component");
  const larghezza = 1200;
  const margine = figura.layout.margin ?? {};
  const sotto = [testi.sottotitolo, testi.nota].filter(Boolean).join("<br>");
  const testa = 70 + (sotto ? 22 * sotto.split("<br>").length : 0);
  // Sotto l'asse: etichette, poi la legenda se sta sotto, poi la fonte in fondo all'immagine
  const { legend, xaxis } = figura.layout;
  const sottoAsse = titoloAsse(xaxis) ? 75 : 50;
  const legendaSotto = figura.layout.showlegend !== false && (legend?.y ?? 1) < 0;
  const piede = 58;
  const alto = (margine.t ?? 20) + testa;
  const basso = sottoAsse + (legendaSotto ? 50 : 0) + piede;
  const altezza = Math.max(675, (figura.layout.height ?? 450) + testa + piede);
  const areaGrafico = altezza - alto - basso;
  // Margine sinistro effettivo: Plotly lo allarga per le etichette lunghe
  const sinistra = figura._fullLayout?._size?.l ?? margine.l ?? 50;

  const layout: Partial<Layout> = {
    ...figura.layout,
    width: larghezza,
    height: altezza,
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    margin: { ...margine, t: alto, b: basso },
    ...(legendaSotto && { legend: { ...legend, y: -sottoAsse / areaGrafico, yanchor: "top" } }),
    title: {
      text: `<b>${testi.titolo}</b>`,
      font: { size: 24 },
      x: 24 / larghezza,
      xanchor: "left",
      xref: "container",
      y: 1 - 24 / altezza,
      yanchor: "top",
      yref: "container",
      ...(sotto && { subtitle: { text: sotto, font: { size: 16 } } }),
    },
    annotations: [
      ...(figura.layout.annotations ?? []),
      {
        text: testi.piede,
        align: "left",
        showarrow: false,
        xref: "paper",
        yref: "paper",
        x: 0,
        xshift: 24 - sinistra,
        xanchor: "left",
        y: -(basso - 16) / areaGrafico,
        yanchor: "bottom",
        font: { size: 13, color: "#625f69" },
      },
    ],
  };
  return Plotly.toImage({ data: figura.data, layout }, { format: "png", width: larghezza, height: altezza });
}
