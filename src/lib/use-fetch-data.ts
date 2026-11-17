"use client";

import { useState, useEffect } from "react";

// Una richiesta per file per pagina: piu' grafici sullo stesso JSON lo scaricano e lo leggono una volta
const richieste = new Map<string, Promise<unknown>>();

function carica(url: string): Promise<unknown> {
  let richiesta = richieste.get(url);
  if (!richiesta) {
    richiesta = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
    // Un errore non resta in memoria: la prossima apertura riprova
    richiesta.catch(() => richieste.delete(url));
    richieste.set(url, richiesta);
  }
  return richiesta;
}

export function useFetchData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    carica(url)
      .then((json) => {
        if (!cancelled) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}
