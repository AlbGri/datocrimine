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
  /** 3 dentro una pagina che ha gia' i suoi titoli di sezione (il report) */
  livello?: 2 | 3;
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
  livello = 2,
  immagine = true,
  children,
}: GraficoProps) {
  const corpo = useRef<HTMLDivElement>(null);
  const [visibile, setVisibile] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [righe, setRighe] = useState<(() => Righe) | null>(null);
  const [scelta, setScelta] = useState<Scelta | null>(null);
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

  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div>
        {livello === 2 ? (
          <h2 className="text-xl font-semibold text-primary sm:text-2xl">{titolo}</h2>
        ) : (
          <h3 className="text-lg font-semibold text-primary">{titolo}</h3>
        )}
        {sottotitolo && <p className="mt-1 text-sm text-muted-foreground">{sottotitolo}</p>}
      </div>
      <RegistroGrafico.Provider value={registro}>
        <div ref={corpo} style={visibile ? undefined : { minHeight: altezza }}>
          {visibile && children}
        </div>
      </RegistroGrafico.Provider>
      {nota && <p className="text-sm">{nota}</p>}
      <AzioniGrafico
        corpo={corpo}
        ancora={id}
        titolo={titolo}
        sottotitolo={sottotitolo}
        nota={nota}
        fonte={fonte}
        parametri={parametri}
        immagine={immagine}
        righe={righe}
      />
    </section>
  );
}

interface AzioniProps {
  /** Il blocco che contiene il grafico disegnato */
  corpo: React.RefObject<HTMLDivElement | null>;
  /** Ancora a cui porta il link */
  ancora: string;
  titolo: string;
  sottotitolo?: string;
  nota?: string | null;
  fonte: Fonte;
  parametri?: Parametri;
  immagine?: boolean;
  /** Assente: niente "Scarica dati"; null: le righe del grafico disegnato */
  righe?: (() => Righe) | null;
}

/** Fonte e pulsanti sotto un grafico: anche dove il titolo e' gia' altrove (le schede di Insights) */
export function AzioniGrafico({
  corpo,
  ancora,
  titolo,
  sottotitolo,
  nota = null,
  fonte,
  parametri = {},
  immagine = true,
  righe,
}: AzioniProps) {
  const [avviso, setAvviso] = useState("");
  const figura = () => corpo.current?.querySelector<Figura>(".js-plotly-plot") ?? null;
  const nomeFile = slug(titolo);

  const scaricaImmagine = async () => {
    const f = figura();
    if (!f) return;
    const piede = [
      `Fonte: ${FONTI[fonte]}.`,
      `Elaborazione DatoCrimine, ${SITE_URL.replace("https://", "")}${window.location.pathname}`,
    ];
    scarica(`${nomeFile}.png`, await immagineDaFigura(f, { titolo, sottotitolo, nota, piede }));
  };

  const copiaLink = async () => {
    const query = new URLSearchParams(
      Object.entries(parametri).map(([k, v]) => [k, slug(String(v))]),
    ).toString();
    const link = `${SITE_URL}${window.location.pathname}${query ? `?${query}` : ""}#${ancora}`;
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
    <>
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
        {righe !== undefined && (
          <Pulsante onClick={scaricaDati} className="inline-flex items-center gap-1.5">
            <FileDown className="size-4" aria-hidden="true" />
            Scarica dati
          </Pulsante>
        )}
      </div>
      <p aria-live="polite" className="break-all text-sm empty:hidden">
        {avviso}
      </p>
    </>
  );
}
