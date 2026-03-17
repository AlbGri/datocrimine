"use client";

import { useState, useMemo, useCallback } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { varTriennale, TRIENNALE_LABEL } from "@/lib/config";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReatoAllarme {
  REF_AREA: string;
  Territorio: string;
  Anno: number;
  Reato: string;
  Delitti: number;
  Regione: string;
  Popolazione: number;
  Tasso_per_100k: number;
}

interface Props {
  anno: number;
  reato: string;
}

type SortKey = "Territorio" | "Regione" | "Tasso_per_100k" | "variazione" | "Delitti" | "Popolazione";
type SortDir = "asc" | "desc";

export function ChartAllarmeTabellaProvince({ anno, reato }: Props) {
  const { data, loading, error } = useFetchData<ReatoAllarme[]>(
    "/data/reati_allarme_sociale_province.json"
  );
  const [regioneSelezionata, setRegioneSelezionata] = useState("Tutte le regioni");
  const [sortKey, setSortKey] = useState<SortKey>("Tasso_per_100k");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const dataReato = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => d.Reato === reato);
  }, [data, reato]);

  const regioni = useMemo(() => {
    const set = new Set(dataReato.map((d) => d.Regione));
    return Array.from(set).sort();
  }, [dataReato]);

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "Territorio" || key === "Regione" ? "asc" : "desc");
    }
  }, [sortKey]);

  const righe = useMemo(() => {
    if (!dataReato.length) return [];

    const dataAnno = dataReato.filter((d) => d.Anno === anno);

    // Mappa REF_AREA -> serie storica per variazione triennale
    const seriePerProvincia = new Map<string, { anno: number; tasso: number }[]>();
    for (const d of dataReato) {
      const arr = seriePerProvincia.get(d.REF_AREA) ?? [];
      arr.push({ anno: d.Anno, tasso: d.Tasso_per_100k });
      seriePerProvincia.set(d.REF_AREA, arr);
    }

    // Variazione triennale per regione (per controtendenza)
    const varPerRegione = new Map<string, number | null>();
    const regioniUniche = [...new Set(dataReato.map((d) => d.Regione))];
    for (const reg of regioniUniche) {
      const regData = dataReato.filter((d) => d.Regione === reg);
      const anniReg = [...new Set(regData.map((d) => d.Anno))];
      const tassiPerAnno = anniReg.map((a) => {
        const rows = regData.filter((d) => d.Anno === a);
        const totDel = rows.reduce((s, d) => s + d.Delitti, 0);
        const totPop = rows.reduce((s, d) => s + d.Popolazione, 0);
        return { anno: a, tasso: totPop > 0 ? (totDel / totPop) * 100_000 : 0 };
      });
      varPerRegione.set(reg, varTriennale(tassiPerAnno));
    }

    let filtrate = dataAnno;
    if (regioneSelezionata !== "Tutte le regioni") {
      filtrate = dataAnno.filter((d) => d.Regione === regioneSelezionata);
    }

    const mapped = filtrate.map((d) => {
      const serie = seriePerProvincia.get(d.REF_AREA) ?? [];
      const varNum = varTriennale(serie);
      const varRegNum = varPerRegione.get(d.Regione) ?? null;
      const controtendenza =
        varNum !== null && varRegNum !== null &&
        Math.sign(varNum) !== Math.sign(varRegNum) &&
        Math.abs(varNum) > 5;
      return { ...d, varNum, variazione: varNum != null ? varNum.toFixed(1) : "-", controtendenza };
    });

    return mapped.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "Territorio":
          return dir * a.Territorio.localeCompare(b.Territorio);
        case "Regione":
          return dir * a.Regione.localeCompare(b.Regione);
        case "Tasso_per_100k":
          return dir * (a.Tasso_per_100k - b.Tasso_per_100k);
        case "variazione":
          return dir * ((a.varNum ?? -Infinity) - (b.varNum ?? -Infinity));
        case "Delitti":
          return dir * (a.Delitti - b.Delitti);
        case "Popolazione":
          return dir * (a.Popolazione - b.Popolazione);
        default:
          return 0;
      }
    });
  }, [dataReato, anno, regioneSelezionata, sortKey, sortDir]);

  if (loading) return <div className="h-64 animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-muted-foreground/40 ml-1">&#8693;</span>;
    return sortDir === "asc"
      ? <span className="ml-1">&#9650;</span>
      : <span className="ml-1">&#9660;</span>;
  };

  const thClass = "py-2 px-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="block">
          <strong>Reati rari: cautela necessaria.</strong> Per reati come omicidi
          o sequestri, province piccole possono avere 0-2 casi/anno. Una singola
          unit&agrave; di differenza causa variazioni percentuali enormi. Confrontare
          sempre i valori assoluti e i trend pluriennali.
        </AlertDescription>
      </Alert>

      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label
            htmlFor="regione-allarme-select"
            className="block text-sm font-medium mb-1"
          >
            Filtra per regione
          </label>
          <select
            id="regione-allarme-select"
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
      </div>

      <div className="overflow-x-auto max-h-[250px] overflow-y-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted sticky top-0">
              <th className={`text-left ${thClass}`} onClick={() => handleSort("Territorio")}>
                Provincia{sortIcon("Territorio")}
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort("Regione")}>
                Regione{sortIcon("Regione")}
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("Tasso_per_100k")}>
                Tasso {anno}{sortIcon("Tasso_per_100k")}
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("variazione")} title="Media 2014-2016 vs 2022-2024">
                {TRIENNALE_LABEL}{sortIcon("variazione")}
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("Delitti")}>
                Delitti {anno}{sortIcon("Delitti")}
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("Popolazione")}>
                Popolazione{sortIcon("Popolazione")}
              </th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.REF_AREA} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3">{r.Territorio}</td>
                <td className="py-2 px-3 text-muted-foreground">{r.Regione}</td>
                <td className="py-2 px-3 text-right">
                  {r.Tasso_per_100k.toFixed(2)}
                </td>
                <td
                  className={`py-2 px-3 text-right ${
                    r.variazione !== "-" && parseFloat(r.variazione) < 0
                      ? "text-green-600"
                      : r.variazione !== "-" && parseFloat(r.variazione) > 0
                        ? "text-red-600"
                        : ""
                  }`}
                  title={r.controtendenza ? "Controtendenza rispetto alla regione" : undefined}
                >
                  {r.variazione !== "-" ? `${r.variazione}%` : "-"}
                  {r.controtendenza && <span className="ml-1" aria-label="controtendenza">&#9888;</span>}
                </td>
                <td className="py-2 px-3 text-right">
                  {r.Delitti.toLocaleString("it-IT")}
                </td>
                <td className="py-2 px-3 text-right">
                  {r.Popolazione.toLocaleString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
