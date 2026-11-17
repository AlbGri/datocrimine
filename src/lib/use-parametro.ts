"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { slug } from "@/lib/format";

// L'indirizzo con cui si e' aperta la pagina: le scelte successive lo riscrivono, ma un grafico
// non deve cambiare perche' un altro ha scritto lo stesso parametro
let apertura = { pagina: "", ricerca: "" };
function ricercaDiApertura() {
  if (apertura.pagina !== window.location.pathname) {
    apertura = { pagina: window.location.pathname, ricerca: window.location.search };
  }
  return apertura.ricerca;
}

/**
 * Filtro scritto nell'indirizzo (?reato=rapine-in-abitazione): un link o un ricaricamento
 * riaprono la stessa vista. Nell'HTML statico vale il valore iniziale.
 */
export function useParametro(
  nome: string,
  opzioni: readonly string[],
  iniziale: string = opzioni[0],
): [string, (valore: string) => void] {
  const ricerca = useSyncExternalStore(() => () => {}, ricercaDiApertura, () => null);
  const daIndirizzo = ricerca === null ? null : new URLSearchParams(ricerca).get(nome);
  const [scelto, setScelto] = useState<string | null>(null);
  const valore =
    (scelto !== null && opzioni.includes(scelto) ? scelto : null) ??
    opzioni.find((o) => slug(o) === daIndirizzo) ??
    (opzioni.includes(iniziale) || opzioni.length === 0 ? iniziale : opzioni[0]);

  const imposta = useCallback(
    (nuovo: string) => {
      setScelto(nuovo);
      const parametri = new URLSearchParams(window.location.search);
      parametri.set(nome, slug(nuovo));
      window.history.replaceState(null, "", `?${parametri}${window.location.hash}`);
    },
    [nome],
  );
  return [valore, imposta];
}

export interface ReatoOpzione {
  codice: string;
  nome: string;
}

/**
 * Reato scelto dentro un grafico, nell'indirizzo come ?reato=furti: un link apre lo stesso reato
 * in tutti i grafici che lo hanno. Si parte dal totale, o dal reato predefinito se manca (vittime).
 */
export function useReatoScelto(reati: ReatoOpzione[], predefinito: string) {
  const nomi = reati.map((r) => r.nome);
  const iniziale =
    reati.find((r) => r.codice === "TOT") ?? reati.find((r) => r.codice === predefinito) ?? reati[0];
  const [nome, setNome] = useParametro("reato", nomi, iniziale?.nome ?? "");
  const reato = reati.find((r) => r.nome === nome) ?? iniziale;
  const imposta = (codice: string) => setNome(reati.find((r) => r.codice === codice)?.nome ?? "");
  return { codice: reato?.codice ?? "", nome: reato?.nome ?? "", imposta };
}
