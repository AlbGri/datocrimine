"use client";

import { useState, useMemo, useCallback } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { fmtNum, fmtPct } from "@/lib/format";
import { VICTIM_DEFAULT } from "@/lib/config";
import { useDatiGrafico, useSceltaGrafico } from "@/components/charts/grafico";
import { useParametro, useReatoScelto } from "@/lib/use-parametro";
import { CHI, type DataType } from "@/lib/persone";
import { IntestazioneOrdinabile } from "@/components/ui/intestazione-ordinabile";

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
  dataType: DataType;
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
  const [sortKey, setSortKey] = useState<SortKey>("provincia");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const reatiDisponibili = useMemo(() => {
    if (!data) return [];
    const info = new Map<string, string>();
    for (const r of data) {
      if (r.data_type === dataType && !info.has(r.codice_reato)) info.set(r.codice_reato, r.reato);
    }
    return Array.from(info, ([codice, nome]) => ({ codice, nome })).sort((a, b) => {
      if (a.codice === "TOT") return -1;
      if (b.codice === "TOT") return 1;
      return a.nome.localeCompare(b.nome, "it");
    });
  }, [data, dataType]);

  // VICTIM non ha TOT
  const reato = useReatoScelto(reatiDisponibili, VICTIM_DEFAULT);
  const effectiveReato = reato.codice;

  // Anni del reato scelto: il totale per provincia esiste solo per il primo anno
  const anniDisponibili = useMemo(() => {
    if (!data) return [];
    const set = new Set<number>();
    for (const r of data) {
      if (r.data_type === dataType && r.codice_reato === effectiveReato) set.add(r.anno);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [data, dataType, effectiveReato]);
  const anniTesto = anniDisponibili.map(String);
  const [annoTesto, setAnno] = useParametro("anno", anniTesto, anniTesto[anniTesto.length - 1]);
  const effectiveAnno = Number(annoTesto);

  const regioni = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const r of data) {
      if (r.data_type === dataType) set.add(r.regione);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [data, dataType]);

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

  useSceltaGrafico(`${reato.nome}, ${CHI[dataType].titolo} per provincia, ${effectiveAnno}`, {
    reato: reato.nome,
    anno: effectiveAnno,
  });
  const righeCsv = useCallback(() => [
    ["Provincia", "Regione", "Totale", "Stranieri", "% Stranieri", "Minori", "% Minori"],
    ...righe.map((r) => [
      r.provincia,
      r.regione,
      r.totale,
      r.stranieri,
      Number(r.pct_stranieri.toFixed(1)),
      r.minori,
      r.pct_minori != null ? Number(r.pct_minori.toFixed(1)) : "",
    ]),
  ], [righe]);
  useDatiGrafico(righeCsv);

  if (loading)
    return <div className="h-64 animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

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
            onChange={(e) => reato.imposta(e.target.value)}
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
          <label htmlFor="regione-prov-select" className="block text-sm font-medium mb-1">
            Filtra per regione
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
              onChange={(e) => setAnno(e.target.value)}
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
      </div>

      <div className="overflow-x-auto max-h-[250px] overflow-y-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted sticky top-0">
              <IntestazioneOrdinabile attiva={sortKey === "provincia"} verso={sortDir} onOrdina={() => handleSort("provincia")}>
                Provincia
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "regione"} verso={sortDir} onOrdina={() => handleSort("regione")}>
                Regione
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "totale"} verso={sortDir} onOrdina={() => handleSort("totale")} destra>
                Totale
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "stranieri"} verso={sortDir} onOrdina={() => handleSort("stranieri")} destra>
                Stranieri
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "pct_stranieri"} verso={sortDir} onOrdina={() => handleSort("pct_stranieri")} destra>
                % Stranieri
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "minori"} verso={sortDir} onOrdina={() => handleSort("minori")} destra>
                Minori
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "pct_minori"} verso={sortDir} onOrdina={() => handleSort("pct_minori")} destra>
                % Minori
              </IntestazioneOrdinabile>
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
                  {fmtNum(r.totale)}
                </td>
                <td className="py-2 px-3 text-right">
                  {fmtNum(r.stranieri)}
                </td>
                <td className="py-2 px-3 text-right">
                  {fmtPct(r.pct_stranieri)}
                </td>
                <td className="py-2 px-3 text-right">
                  {fmtNum(r.minori)}
                </td>
                <td className="py-2 px-3 text-right">
                  {r.pct_minori !== null ? fmtPct(r.pct_minori) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
