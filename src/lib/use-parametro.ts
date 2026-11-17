"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { slug } from "@/lib/format";

/**
 * Filtro di pagina scritto nell'indirizzo (?reato=rapine-in-abitazione): un link o un
 * ricaricamento riaprono la stessa vista. Nell'HTML statico vale il valore iniziale.
 */
export function useParametro(
  nome: string,
  opzioni: readonly string[],
  iniziale: string = opzioni[0],
): [string, (valore: string) => void] {
  const daIndirizzo = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get(nome),
    () => null,
  );
  const [scelto, setScelto] = useState<string | null>(null);
  const valore =
    (scelto !== null && opzioni.includes(scelto) ? scelto : null) ??
    opzioni.find((o) => slug(o) === daIndirizzo) ??
    (opzioni.includes(iniziale) ? iniziale : opzioni[0]);

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
