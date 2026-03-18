"use client";

import { useState, useMemo } from "react";
import { useFetchData } from "@/lib/use-fetch-data";

interface ProvinciaRecord {
  data_type: "OFFEND" | "VICTIM";
  ref_area: string;
  provincia: string;
  regione: string;
  codice_reato: string;
  reato: string;
  anno: number;
  totale: number;
  stranieri: number;
  minori: number;
  pct_stranieri: number;
  pct_minori: number | null;
}

interface Props {
  dataType: "OFFEND" | "VICTIM";
}

export function ChartAutoriTrendProvincia({ dataType }: Props) {
  const { data, loading, error } = useFetchData<ProvinciaRecord[]>(
    "/data/autori_vittime_province.json"
  );
  const [codiceReato, setCodiceReato] = useState("CULPINJU");
  const [regioneSelezionata, setRegioneSelezionata] = useState("");

  // Solo reati con dati multi-anno (escludi TOT che ha solo 2022)
  const reatiDisponibili = useMemo(() => {
    if (!data) return [];
    const info = new Map<string, { nome: string; anni: Set<number> }>();
    for (const r of data) {
      if (r.data_type === dataType) {
        const prev = info.get(r.codice_reato);
        if (prev) {
          prev.anni.add(r.anno);
        } else {
          info.set(r.codice_reato, { nome: r.reato, anni: new Set([r.anno]) });
        }
      }
    }
    // Solo reati con almeno 2 anni
    const entries = Array.from(info.entries())
      .filter(([, v]) => v.anni.size >= 2)
      .map(([codice, v]) => ({ codice, nome: v.nome }));
    return entries.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [data, dataType]);

  const effectiveReato = useMemo(() => {
    if (reatiDisponibili.some((r) => r.codice === codiceReato)) return codiceReato;
    return reatiDisponibili[0]?.codice ?? "CULPINJU";
  }, [codiceReato, reatiDisponibili]);

  const regioni = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const r of data) {
      if (r.data_type === dataType && r.codice_reato === effectiveReato) {
        set.add(r.regione);
      }
    }
    return Array.from(set).sort();
  }, [data, dataType, effectiveReato]);

  const effectiveRegione = useMemo(() => {
    if (regioni.includes(regioneSelezionata)) return regioneSelezionata;
    return regioni[0] ?? "";
  }, [regioneSelezionata, regioni]);

  // Anni disponibili per il reato selezionato
  const anniDisponibili = useMemo(() => {
    if (!data) return [];
    const set = new Set<number>();
    for (const r of data) {
      if (r.data_type === dataType && r.codice_reato === effectiveReato) {
        set.add(r.anno);
      }
    }
    return Array.from(set).sort();
  }, [data, dataType, effectiveReato]);

  // Dati filtrati per regione, raggruppati per provincia
  const tabellaData = useMemo(() => {
    if (!data || !effectiveRegione) return [];

    const filtered = data.filter(
      (r) =>
        r.data_type === dataType &&
        r.codice_reato === effectiveReato &&
        r.regione === effectiveRegione
    );

    // Raggruppa per provincia
    const byProv = new Map<string, { provincia: string; perAnno: Map<number, number> }>();
    for (const r of filtered) {
      const prev = byProv.get(r.ref_area);
      if (prev) {
        prev.perAnno.set(r.anno, r.totale);
      } else {
        byProv.set(r.ref_area, {
          provincia: r.provincia,
          perAnno: new Map([[r.anno, r.totale]]),
        });
      }
    }

    // Calcola variazione primo-ultimo anno
    return Array.from(byProv.values())
      .map((p) => {
        const primo = p.perAnno.get(anniDisponibili[0]);
        const ultimo = p.perAnno.get(anniDisponibili[anniDisponibili.length - 1]);
        const variazione =
          primo !== undefined && ultimo !== undefined && primo > 0
            ? ((ultimo - primo) / primo) * 100
            : null;
        return { ...p, variazione };
      })
      .sort((a, b) => a.provincia.localeCompare(b.provincia));
  }, [data, dataType, effectiveReato, effectiveRegione, anniDisponibili]);

  if (loading)
    return <div className="h-64 animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data || reatiDisponibili.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label htmlFor="trend-prov-reato" className="block text-sm font-medium mb-1">
            Tipo di reato
          </label>
          <select
            id="trend-prov-reato"
            value={effectiveReato}
            onChange={(e) => setCodiceReato(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {reatiDisponibili.map((r) => (
              <option key={r.codice} value={r.codice}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="trend-prov-regione" className="block text-sm font-medium mb-1">
            Regione
          </label>
          <select
            id="trend-prov-regione"
            value={effectiveRegione}
            onChange={(e) => setRegioneSelezionata(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {regioni.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[250px] overflow-y-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted sticky top-0">
              <th className="py-2 px-3 text-left font-semibold">Provincia</th>
              {anniDisponibili.map((a) => (
                <th key={a} className="py-2 px-3 text-right font-semibold">
                  {a}
                </th>
              ))}
              {anniDisponibili.length >= 2 && (
                <th className="py-2 px-3 text-right font-semibold">Var. %</th>
              )}
            </tr>
          </thead>
          <tbody>
            {tabellaData.map((p) => (
              <tr key={p.provincia} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3">{p.provincia}</td>
                {anniDisponibili.map((a) => (
                  <td key={a} className="py-2 px-3 text-right">
                    {p.perAnno.get(a)?.toLocaleString("it-IT") ?? "-"}
                  </td>
                ))}
                {anniDisponibili.length >= 2 && (
                  <td
                    className={`py-2 px-3 text-right font-medium ${
                      p.variazione === null
                        ? ""
                        : p.variazione < 0
                          ? "text-green-600"
                          : p.variazione > 0
                            ? "text-red-600"
                            : ""
                    }`}
                  >
                    {p.variazione !== null
                      ? `${p.variazione > 0 ? "+" : ""}${p.variazione.toFixed(1)}%`
                      : "-"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Il dato provinciale &egrave; disponibile solo dal 2022. Il totale per tutti i reati ha solo il 2022.
      </p>
    </div>
  );
}
