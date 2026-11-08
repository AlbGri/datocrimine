"use client";

import { useFetchData } from "@/lib/use-fetch-data";
import { Card, CardContent } from "@/components/ui/card";
import { fmtNum, fmtPct, fmtPctSigned } from "@/lib/format";

interface TrendRecord {
  data_type: "OFFEND" | "VICTIM";
  codice_reato: string;
  reato: string;
  anno: number;
  totale: number;
  stranieri: number;
  minori: number;
  pct_stranieri: number;
  pct_minori: number | null;
}

interface ReatiRecord {
  data_type: "OFFEND" | "VICTIM";
  codice_reato: string;
  reato: string;
  totale: number;
  stranieri: number;
  minori: number;
  pct_stranieri: number;
  pct_minori: number | null;
}

// Il totale autori finisce al 2022: il confronto e' con l'ultimo anno prima del COVID,
// non con una media che conterrebbe il 2020 e il 2021
const ANNO_PRE_COVID = 2019;

function varDaPreCovid(data: TrendRecord[], ultimo: TrendRecord): number | null {
  const base = data.find((d) => d.anno === ANNO_PRE_COVID);
  if (!base || base.totale === 0 || ultimo.anno <= ANNO_PRE_COVID) return null;
  return ((ultimo.totale - base.totale) / base.totale) * 100;
}

interface KpiProps {
  dataType: "OFFEND" | "VICTIM";
}

export function KpiAutoriVittime({ dataType }: KpiProps) {
  const { data: trend, loading: loadingTrend } = useFetchData<TrendRecord[]>(
    "/data/autori_vittime_trend.json"
  );
  const { data: reati, loading: loadingReati } = useFetchData<ReatiRecord[]>(
    "/data/autori_vittime_reati.json"
  );

  const loading = loadingTrend || loadingReati;

  if (loading)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[60px] sm:h-[72px] animate-pulse bg-muted rounded" />
        ))}
      </div>
    );

  // Filtra trend TOT OFFEND (come prima della ristrutturazione)
  const trendTot = trend?.filter(
    (r) => r.data_type === "OFFEND" && r.codice_reato === "TOT"
  );

  if (dataType === "OFFEND" && trendTot && trendTot.length > 0) {
    const ultimo = trendTot[trendTot.length - 1];
    const varTot = varDaPreCovid(trendTot, ultimo);

    const items: { label: string; value: string; color?: string; subtitle?: string }[] = [
      {
        label: `Totale autori ${ultimo.anno}`,
        value: fmtNum(ultimo.totale),
      },
      {
        label: `Stranieri ${ultimo.anno}`,
        value: fmtPct(ultimo.pct_stranieri),
        subtitle: `era ${fmtPct(trendTot[0].pct_stranieri)} nel ${trendTot[0].anno}; denunciati, compresi i non residenti`,
      },
      ...(ultimo.pct_minori !== null
        ? [
            {
              label: `Minori ${ultimo.anno}`,
              value: fmtPct(ultimo.pct_minori),
            },
          ]
        : []),
      ...(varTot !== null
        ? [
            {
              label: "Variazione totale autori",
              value: fmtPctSigned(varTot),
              color: varTot < 0 ? "text-green-600" : "text-red-600",
              subtitle: `${ultimo.anno} rispetto al ${ANNO_PRE_COVID}, ultimo anno prima del COVID (denunciati, non condannati)`,
            },
          ]
        : []),
    ];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {items.map((item) => (
          <Card key={item.label}>
            <CardContent className="py-0 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">{item.label}</p>
              <p className={`text-xl sm:text-2xl font-bold ${item.color ?? ""}`}>
                {item.value}
              </p>
              {item.subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">{item.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // VICTIM: no TOT, mostra conteggio reati disponibili
  if (dataType === "VICTIM" && reati) {
    const victimReati = reati.filter((r) => r.data_type === "VICTIM");
    const nReati = victimReati.length;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <Card>
          <CardContent className="py-0 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">Tipologie di reato (2022)</p>
            <p className="text-xl sm:text-2xl font-bold">{nReati}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              totale non disponibile: una vittima pu&ograve; subire pi&ugrave; reati
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
