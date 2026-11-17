"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FileDown, ImageDown, Link2 } from "lucide-react";
import { Pulsante } from "@/components/ui/pulsante";
import { FONTI, type Fonte } from "@/lib/config";
import { slug } from "@/lib/format";
import { SITE_URL } from "@/lib/metadata";
import {
  immagineDaFigura,
  righeDaFigura,
  scarica,
  scaricaCsv,
  type Figura,
  type Righe,
} from "./esporta-grafico";

type Parametri = Record<string, string | number>;

interface Scelta {
  titolo: string;
  parametri: Parametri;
}

interface Registro {
  nota: (testo: string | null) => void;
  dati: (righe: (() => Righe) | null) => void;
  scelta: (scelta: Scelta | null) => void;
}

const RegistroGrafico = createContext<Registro | null>(null);

/** La riga calcolata sotto il grafico (es. la variazione triennale), che entra anche nell'immagine */
export function useNotaGrafico(testo: string | null) {
  const registro = useContext(RegistroGrafico);
  useEffect(() => {
    registro?.nota(testo);
    return () => registro?.nota(null);
  }, [registro, testo]);
}

/** Le righe di "Scarica dati" quando non bastano quelle del grafico (le tabelle) */
export function useDatiGrafico(righe: () => Righe) {
  const registro = useContext(RegistroGrafico);
  useEffect(() => {
    registro?.dati(righe);
    return () => registro?.dati(null);
  }, [registro, righe]);
}

/**
 * Per i grafici con selettori propri (reato, anno): il titolo con le scelte fatte, che sostituisce
 * quello della pagina, e i parametri che il link aggiunge a quelli di pagina
 */
export function useSceltaGrafico(titolo: string, parametri: Parametri) {
  const registro = useContext(RegistroGrafico);
  const chiave = JSON.stringify(parametri);
  useEffect(() => {
    registro?.scelta({ titolo, parametri: JSON.parse(chiave) });
    return () => registro?.scelta(null);
  }, [registro, titolo, chiave]);
}

interface GraficoProps {
  /** Ancora della sezione, usata dal link */
  id: string;
  /** Titolo nell'HTML statico; un grafico con selettori propri lo sostituisce (useSceltaGrafico) */
  titolo: string;
  sottotitolo?: string;
  fonte: Fonte;
  /** I filtri di pagina che definiscono questo grafico, scritti nel link */
  parametri?: Parametri;
  /** Altezza del segnaposto prima che il grafico entri nello schermo */
  altezza: number;
  /** Falso per le tabelle, che non hanno un'immagine da scaricare */
  immagine?: boolean;
  children: React.ReactNode;
}

/** Contenitore di ogni grafico e tabella: titolo, fonte, scarica immagine, copia link, scarica dati */
export function Grafico({
  id,
  titolo: titoloPagina,
  sottotitolo,
  fonte,
  parametri: parametriPagina,
  altezza,
  immagine = true,
  children,
}: GraficoProps) {
  const corpo = useRef<HTMLDivElement>(null);
  const [visibile, setVisibile] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [righe, setRighe] = useState<(() => Righe) | null>(null);
  const [scelta, setScelta] = useState<Scelta | null>(null);
  const [avviso, setAvviso] = useState("");
  const registro = useMemo<Registro>(
    () => ({ nota: setNota, dati: (r) => setRighe(() => r), scelta: setScelta }),
    [],
  );
  const titolo = scelta?.titolo ?? titoloPagina;
  const parametri = { ...parametriPagina, ...scelta?.parametri };

  // Dati e grafico solo quando la sezione si avvicina allo schermo: le pagine sono aperte e lunghe
  useEffect(() => {
    const el = corpo.current;
    if (!el) return;
    const osservatore = new IntersectionObserver(
      ([voce]) => {
        if (voce.isIntersecting) {
          setVisibile(true);
          osservatore.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    osservatore.observe(el);
    return () => osservatore.disconnect();
  }, []);

  const figura = () => corpo.current?.querySelector<Figura>(".js-plotly-plot") ?? null;
  const indirizzo = () => {
    const query = new URLSearchParams(
      Object.entries(parametri).map(([k, v]) => [k, slug(String(v))]),
    ).toString();
    return `${SITE_URL}${window.location.pathname}${query ? `?${query}` : ""}#${id}`;
  };
  const nomeFile = slug(titolo);

  const scaricaImmagine = async () => {
    const f = figura();
    if (!f) return;
    const piede = `Fonte: ${FONTI[fonte]}.<br>Elaborazione DatoCrimine, ${SITE_URL.replace("https://", "")}${window.location.pathname}`;
    scarica(`${nomeFile}.png`, await immagineDaFigura(f, { titolo, sottotitolo, nota, piede }));
  };

  const copiaLink = async () => {
    const link = indirizzo();
    try {
      await navigator.clipboard.writeText(link);
      setAvviso("Link copiato");
    } catch {
      setAvviso(`Copia questo link: ${link}`);
    }
  };

  const scaricaDati = () => {
    const f = figura();
    const dati = righe ? righe() : f ? righeDaFigura(f) : null;
    if (dati) scaricaCsv(`${nomeFile}.csv`, dati);
  };

  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-primary sm:text-2xl">{titolo}</h2>
        {sottotitolo && <p className="mt-1 text-sm text-muted-foreground">{sottotitolo}</p>}
      </div>
      <RegistroGrafico.Provider value={registro}>
        <div ref={corpo} style={visibile ? undefined : { minHeight: altezza }}>
          {visibile && children}
        </div>
      </RegistroGrafico.Provider>
      {nota && <p className="text-sm">{nota}</p>}
      <p className="text-sm text-muted-foreground">Fonte: {FONTI[fonte]}. Elaborazione DatoCrimine.</p>
      <div className="flex flex-wrap gap-2">
        {immagine && (
          <Pulsante onClick={scaricaImmagine} className="inline-flex items-center gap-1.5">
            <ImageDown className="size-4" aria-hidden="true" />
            Scarica immagine
          </Pulsante>
        )}
        <Pulsante onClick={copiaLink} className="inline-flex items-center gap-1.5">
          <Link2 className="size-4" aria-hidden="true" />
          Copia link
        </Pulsante>
        <Pulsante onClick={scaricaDati} className="inline-flex items-center gap-1.5">
          <FileDown className="size-4" aria-hidden="true" />
          Scarica dati
        </Pulsante>
      </div>
      <p aria-live="polite" className="break-all text-sm empty:hidden">
        {avviso}
      </p>
    </section>
  );
}
