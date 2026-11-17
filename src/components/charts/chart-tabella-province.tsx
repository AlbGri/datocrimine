"use client";

import { useState, useMemo, useCallback } from "react";
import { useFetchData } from "@/lib/use-fetch-data";
import { varTriennale, TRIENNALE_LABEL, TRIENNIO_TITOLO } from "@/lib/config";
import { IntestazioneOrdinabile } from "@/components/ui/intestazione-ordinabile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fmtNum } from "@/lib/format";
import { useDatiGrafico } from "@/components/charts/grafico";
import { NotaIngiurie } from "@/components/charts/nota-ingiurie";

interface DelittiProvincia {
  REF_AREA: string;
  Territorio: string;
  Anno: number;
  Delitti: number;
  Regione: string;
  Popolazione: number;
  Tasso_per_1000: number;
}

interface Props {
  anno: number;
}

type SortKey = "Territorio" | "Regione" | "Tasso_per_1000" | "variazione" | "Delitti" | "Popolazione";
type SortDir = "asc" | "desc";

export function ChartTabellaProvince({ anno }: Props) {
  const { data, loading, error } = useFetchData<DelittiProvincia[]>(
    "/data/delitti_province.json"
  );
  const [regioneSelezionata, setRegioneSelezionata] = useState("Tutte le regioni");
  const [sortKey, setSortKey] = useState<SortKey>("Tasso_per_1000");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const regioni = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.map((d) => d.Regione));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [data]);

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "Territorio" || key === "Regione" ? "asc" : "desc");
    }
  }, [sortKey]);

  const righe = useMemo(() => {
    if (!data) return [];

    const dataAnno = data.filter((d) => d.Anno === anno);

    // Mappa REF_AREA -> serie storica per calcolo variazione triennale
    const seriePerProvincia = new Map<string, { anno: number; tasso: number }[]>();
    for (const d of data) {
      const arr = seriePerProvincia.get(d.REF_AREA) ?? [];
      arr.push({ anno: d.Anno, tasso: d.Tasso_per_1000 });
      seriePerProvincia.set(d.REF_AREA, arr);
    }

    // Variazione triennale per regione (per controtendenza)
    const varPerRegione = new Map<string, number | null>();
    const regioniUniche = [...new Set(data.map((d) => d.Regione))];
    for (const reg of regioniUniche) {
      const regData = data.filter((d) => d.Regione === reg);
      const anniReg = [...new Set(regData.map((d) => d.Anno))];
      const tassiPerAnno = anniReg.map((a) => {
        const rows = regData.filter((d) => d.Anno === a);
        const totDel = rows.reduce((s, d) => s + d.Delitti, 0);
        const totPop = rows.reduce((s, d) => s + d.Popolazione, 0);
        return { anno: a, tasso: totPop > 0 ? (totDel / totPop) * 1000 : 0 };
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
          return dir * a.Territorio.localeCompare(b.Territorio);
        case "Regione":
          return dir * a.Regione.localeCompare(b.Regione);
        case "Tasso_per_1000":
          return dir * (a.Tasso_per_1000 - b.Tasso_per_1000);
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
  }, [data, anno, regioneSelezionata, sortKey, sortDir]);

  const righeCsv = useCallback(() => [
    ["Provincia", "Regione", `Tasso ${anno}`, `${TRIENNALE_LABEL} (%)`, `Delitti ${anno}`, "Popolazione"],
    ...righe.map((r) => [
      r.Territorio,
      r.Regione,
      Number(r.Tasso_per_1000.toFixed(1)),
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
          <strong>Dati provinciali: limiti importanti.</strong> Province con meno
          di 150.000 abitanti possono mostrare variabilit&agrave; elevata anno su anno
          per effetto statistico (pochi eventi = alta variazione percentuale).
          Guardare trend pluriennali, non singoli anni.
        </AlertDescription>
      </Alert>

      <div>
        <label htmlFor="tabella-regione-select" className="block text-sm font-medium mb-1">
          Filtra per regione
        </label>
        <select
          id="tabella-regione-select"
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
              <IntestazioneOrdinabile attiva={sortKey === "Tasso_per_1000"} verso={sortDir} onOrdina={() => handleSort("Tasso_per_1000")} destra>
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
                  {fmtNum(r.Tasso_per_1000, 1)}
                </td>
                <td
                  className="py-2 px-3 text-right"
                  title={r.controtendenza ? "Controtendenza rispetto alla regione" : undefined}
                >
                  {r.variazione !== "-" ? `${r.variazione}%` : "-"}
                  {r.controtendenza && <span className="ml-1" role="img" aria-label="controtendenza">&#9888;</span>}
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
        <p className="text-sm text-muted-foreground">&#9888; Controtendenza rispetto alla regione</p>
      )}
      <NotaIngiurie />
    </div>
  );
}
