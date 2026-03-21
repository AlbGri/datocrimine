"use client";

import { useState, useMemo, useCallback } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { useFilterSync, SyncButton } from "@/lib/filter-sync-context";

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

type SortKey =
  | "provincia"
  | "regione"
  | "totale"
  | "stranieri"
  | "pct_stranieri"
  | "minori"
  | "pct_minori";
type SortDir = "asc" | "desc";

export function ChartAutoriTabellaProvince({ dataType }: Props) {
  const { data, loading, error } = useFetchData<ProvinciaRecord[]>(
    "/data/autori_vittime_province.json"
  );
  const [regioneSelezionata, setRegioneSelezionata] = useState(
    "Tutte le regioni"
  );
  const setRegioneStable = useCallback((v: string) => setRegioneSelezionata(v), []);
  const [reatoSelezionato, setReatoSelezionato] = useState("TOT");
  const [annoSelezionato, setAnnoSelezionato] = useState(2022);
  const [sortKey, setSortKey] = useState<SortKey>("pct_stranieri");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Anni disponibili per reato e dataType selezionati
  const anniDisponibili = useMemo(() => {
    if (!data) return [2022];
    const set = new Set<number>();
    for (const r of data) {
      if (r.data_type === dataType) set.add(r.anno);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [data, dataType]);

  // Se anno selezionato non disponibile, usa il piu' recente
  const effectiveAnno = useMemo(() => {
    if (anniDisponibili.includes(annoSelezionato)) return annoSelezionato;
    return anniDisponibili[anniDisponibili.length - 1] ?? 2022;
  }, [annoSelezionato, anniDisponibili]);

  // Reset reato quando cambia dataType
  const effectiveReato = useMemo(() => {
    if (dataType === "OFFEND") return reatoSelezionato;
    // VICTIM non ha TOT: default al reato con piu' vittime totali
    if (reatoSelezionato === "TOT" && data) {
      const totPerReato = new Map<string, number>();
      for (const r of data) {
        if (r.data_type === "VICTIM" && r.anno === effectiveAnno) {
          totPerReato.set(
            r.codice_reato,
            (totPerReato.get(r.codice_reato) ?? 0) + r.totale
          );
        }
      }
      const sorted = [...totPerReato.entries()].sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] ?? reatoSelezionato;
    }
    return reatoSelezionato;
  }, [dataType, reatoSelezionato, data, effectiveAnno]);

  const reatiDisponibili = useMemo(() => {
    if (!data) return [];
    const info = new Map<string, { nome: string; totale: number }>();
    for (const r of data) {
      if (r.data_type === dataType && r.anno === effectiveAnno) {
        const prev = info.get(r.codice_reato);
        if (prev) {
          prev.totale += r.totale;
        } else {
          info.set(r.codice_reato, { nome: r.reato, totale: r.totale });
        }
      }
    }
    // TOT sempre primo, poi in ordine alfabetico
    const entries: [string, string][] = Array.from(info.entries()).map(
      ([codice, { nome }]) => [codice, nome]
    );
    return entries.sort((a, b) => {
      if (a[0] === "TOT") return -1;
      if (b[0] === "TOT") return 1;
      return a[1].localeCompare(b[1], "it");
    });
  }, [data, dataType, effectiveAnno]);

  const regioni = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const r of data) {
      if (r.data_type === dataType) set.add(r.regione);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [data, dataType]);

  const { handleSync } = useFilterSync("regione", regioneSelezionata, setRegioneStable);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(
          key === "provincia" || key === "regione" ? "asc" : "desc"
        );
      }
    },
    [sortKey]
  );

  const righe = useMemo(() => {
    if (!data) return [];

    let filtered = data.filter(
      (r) => r.data_type === dataType && r.codice_reato === effectiveReato && r.anno === effectiveAnno
    );

    if (regioneSelezionata !== "Tutte le regioni") {
      filtered = filtered.filter((r) => r.regione === regioneSelezionata);
    }

    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "provincia":
          return dir * a.provincia.localeCompare(b.provincia);
        case "regione":
          return dir * a.regione.localeCompare(b.regione);
        case "totale":
          return dir * (a.totale - b.totale);
        case "stranieri":
          return dir * (a.stranieri - b.stranieri);
        case "pct_stranieri":
          return dir * (a.pct_stranieri - b.pct_stranieri);
        case "minori":
          return dir * (a.minori - b.minori);
        case "pct_minori":
          return dir * ((a.pct_minori ?? -1) - (b.pct_minori ?? -1));
        default:
          return 0;
      }
    });
  }, [data, dataType, effectiveReato, effectiveAnno, regioneSelezionata, sortKey, sortDir]);

  if (loading)
    return <div className="h-64 animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const handleDownloadCsv = () => {
    const header = [
      "Provincia",
      "Regione",
      "Totale",
      "Stranieri",
      "% Stranieri",
      "Minori",
      "% Minori",
    ];
    const rows = righe.map((r) => [
      r.provincia,
      r.regione,
      r.totale,
      r.stranieri,
      r.pct_stranieri,
      r.minori,
      r.pct_minori ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `province_${dataType.toLowerCase()}_${effectiveReato}_${effectiveAnno}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key)
      return <span className="text-muted-foreground/40 ml-1">&#8693;</span>;
    return sortDir === "asc" ? (
      <span className="ml-1">&#9650;</span>
    ) : (
      <span className="ml-1">&#9660;</span>
    );
  };

  const thClass =
    "py-2 px-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label
            htmlFor="reato-prov-select"
            className="block text-sm font-medium mb-1"
          >
            Tipo di reato
          </label>
          <select
            id="reato-prov-select"
            value={effectiveReato}
            onChange={(e) => setReatoSelezionato(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {reatiDisponibili.map(([codice, nome]) => (
              <option key={codice} value={codice}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="regione-prov-select"
            className="text-sm font-medium mb-1 flex items-center"
          >
            Filtra per regione
            <SyncButton onClick={() => handleSync()} />
          </label>
          <select
            id="regione-prov-select"
            value={regioneSelezionata}
            onChange={(e) => setRegioneSelezionata(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option>Tutte le regioni</option>
            {regioni.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {anniDisponibili.length > 1 && (
          <div>
            <label
              htmlFor="anno-prov-select"
              className="block text-sm font-medium mb-1"
            >
              Anno
            </label>
            <select
              id="anno-prov-select"
              value={effectiveAnno}
              onChange={(e) => setAnnoSelezionato(Number(e.target.value))}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              {anniDisponibili.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={handleDownloadCsv}
          className="border rounded-md px-3 py-2 text-sm bg-background hover:bg-muted transition-colors"
        >
          Scarica CSV
        </button>
      </div>

      <div className="overflow-x-auto max-h-[250px] overflow-y-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted sticky top-0">
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("provincia")}
              >
                Provincia{sortIcon("provincia")}
              </th>
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("regione")}
              >
                Regione{sortIcon("regione")}
              </th>
              <th
                className={`text-right ${thClass}`}
                onClick={() => handleSort("totale")}
              >
                Totale{sortIcon("totale")}
              </th>
              <th
                className={`text-right ${thClass}`}
                onClick={() => handleSort("stranieri")}
              >
                Stranieri{sortIcon("stranieri")}
              </th>
              <th
                className={`text-right ${thClass}`}
                onClick={() => handleSort("pct_stranieri")}
              >
                % Stranieri{sortIcon("pct_stranieri")}
              </th>
              <th
                className={`text-right ${thClass}`}
                onClick={() => handleSort("minori")}
              >
                Minori{sortIcon("minori")}
              </th>
              <th
                className={`text-right ${thClass}`}
                onClick={() => handleSort("pct_minori")}
              >
                % Minori{sortIcon("pct_minori")}
              </th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr
                key={r.ref_area}
                className="border-b hover:bg-muted/30"
              >
                <td className="py-2 px-3">{r.provincia}</td>
                <td className="py-2 px-3 text-muted-foreground">
                  {r.regione}
                </td>
                <td className="py-2 px-3 text-right">
                  {r.totale.toLocaleString("it-IT")}
                </td>
                <td className="py-2 px-3 text-right">
                  {r.stranieri.toLocaleString("it-IT")}
                </td>
                <td className="py-2 px-3 text-right">
                  {r.pct_stranieri.toFixed(1)}%
                </td>
                <td className="py-2 px-3 text-right">
                  {r.minori.toLocaleString("it-IT")}
                </td>
                <td className="py-2 px-3 text-right">
                  {r.pct_minori !== null ? `${r.pct_minori.toFixed(1)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
