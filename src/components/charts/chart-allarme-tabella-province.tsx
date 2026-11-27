"use client";

import { TriangleAlert } from "@/components/icone";
import { useState, useMemo, useCallback } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { varTriennale, TRIENNALE_LABEL, TRIENNIO_TITOLO } from "@/lib/config";
import { IntestazioneOrdinabile } from "@/components/ui/intestazione-ordinabile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fmtNum } from "@/lib/format";
import { useDatiGrafico } from "@/components/charts/grafico";

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
  const [sortKey, setSortKey] = useState<SortKey>("Territorio");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const dataReato = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => d.Reato === reato);
  }, [data, reato]);

  const regioni = useMemo(() => {
    const set = new Set(dataReato.map((d) => d.Regione));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
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
      return { ...d, varNum, variazione: varNum != null ? fmtNum(varNum, 1) : "-", controtendenza };
    });

    return mapped.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "Territorio":
          return dir * a.Territorio.localeCompare(b.Territorio, "it");
        case "Regione":
          return dir * a.Regione.localeCompare(b.Regione, "it");
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

  const righeCsv = useCallback(() => [
    ["Provincia", "Regione", `Tasso ${anno}`, `${TRIENNALE_LABEL} (%)`, `Delitti ${anno}`, "Popolazione"],
    ...righe.map((r) => [
      r.Territorio,
      r.Regione,
      Number(r.Tasso_per_100k.toFixed(2)),
      r.varNum != null ? Number(r.varNum.toFixed(1)) : "",
      r.Delitti,
      r.Popolazione,
    ]),
  ], [righe, anno]);
  useDatiGrafico(righeCsv);

  if (loading) return <div className="h-64 animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="block">
          Per reati come omicidi o sequestri, le province piccole possono avere 0-2
          casi l&apos;anno, e un solo caso in pi&ugrave; o in meno causa variazioni
          percentuali enormi. Conviene confrontare sempre i valori assoluti e
          l&apos;andamento di pi&ugrave; anni.
        </AlertDescription>
      </Alert>

      <div>
          <label htmlFor="regione-allarme-select" className="block text-sm font-medium mb-1">
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

      <div className="overflow-x-auto max-h-[250px] overflow-y-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted sticky top-0">
              <IntestazioneOrdinabile attiva={sortKey === "Territorio"} verso={sortDir} onOrdina={() => handleSort("Territorio")}>
                Provincia
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "Regione"} verso={sortDir} onOrdina={() => handleSort("Regione")}>
                Regione
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "Tasso_per_100k"} verso={sortDir} onOrdina={() => handleSort("Tasso_per_100k")} destra>
                Tasso {anno}
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "variazione"} verso={sortDir} onOrdina={() => handleSort("variazione")} destra title={TRIENNIO_TITOLO}>
                {TRIENNALE_LABEL}
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "Delitti"} verso={sortDir} onOrdina={() => handleSort("Delitti")} destra>
                Delitti {anno}
              </IntestazioneOrdinabile>
              <IntestazioneOrdinabile attiva={sortKey === "Popolazione"} verso={sortDir} onOrdina={() => handleSort("Popolazione")} destra>
                Popolazione
              </IntestazioneOrdinabile>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.REF_AREA} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3">{r.Territorio}</td>
                <td className="py-2 px-3 text-muted-foreground">{r.Regione}</td>
                <td className="py-2 px-3 text-right">
                  {fmtNum(r.Tasso_per_100k, 2)}
                </td>
                <td
                  className="py-2 px-3 text-right"
                  title={r.controtendenza ? "Controtendenza rispetto alla regione" : undefined}
                >
                  {r.variazione !== "-" ? `${r.variazione}%` : "-"}
                  {r.controtendenza && <TriangleAlert className="ml-1 inline size-3.5 align-[-2px]" role="img" aria-label="controtendenza" />}
                </td>
                <td className="py-2 px-3 text-right">
                  {fmtNum(r.Delitti)}
                </td>
                <td className="py-2 px-3 text-right">
                  {fmtNum(r.Popolazione)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {righe.some((r) => r.controtendenza) && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <TriangleAlert className="size-3.5" />
          Controtendenza rispetto alla regione
        </p>
      )}
    </div>
  );
}
