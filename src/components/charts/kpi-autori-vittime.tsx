"use client";

import { useFetchData } from "@/lib/use-fetch-data";
import { Card, CardContent } from "@/components/ui/card";
import { fmtNum, fmtPct, fmtPctSigned } from "@/lib/format";
import { isVoceAutonoma } from "@/lib/config";

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
  pct_femmine: number | null;
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
  const { data: trend, loading } = useFetchData<TrendRecord[]>(
    "/data/autori_vittime_trend.json"
  );

  if (loading)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[60px] sm:h-[72px] animate-pulse bg-muted rounded" />
        ))}
      </div>
    );

  const items = trend ? (dataType === "OFFEND" ? riquadriAutori(trend) : riquadriVittime(trend)) : [];
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="py-0 px-2 sm:px-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">{item.label}</p>
            <p className="text-xl sm:text-2xl font-bold">{item.value}</p>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface Riquadro {
  label: string;
  value: string;
  subtitle?: string;
}

function riquadriAutori(trend: TrendRecord[]): Riquadro[] {
  const trendTot = trend.filter((r) => r.data_type === "OFFEND" && r.codice_reato === "TOT");
  if (!trendTot.length) return [];
  const ultimo = trendTot[trendTot.length - 1];
  const varTot = varDaPreCovid(trendTot, ultimo);

  return [
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
      ? [{ label: `Minori ${ultimo.anno}`, value: fmtPct(ultimo.pct_minori) }]
      : []),
    ...(varTot !== null
      ? [
          {
            label: "Variazione totale autori",
            value: fmtPctSigned(varTot),
            subtitle: `${ultimo.anno} rispetto al ${ANNO_PRE_COVID}, ultimo anno prima del COVID (denunciati, non condannati)`,
          },
        ]
      : []),
  ];
}

// Per le vittime l'ISTAT non da' un totale: i quattro reati con piu' vittime nell'ultimo anno,
// senza le sottovoci gia' contate nella voce madre (furti con destrezza dentro i furti)
function riquadriVittime(trend: TrendRecord[]): Riquadro[] {
  const vittime = trend.filter((r) => r.data_type === "VICTIM" && isVoceAutonoma(r.codice_reato));
  if (!vittime.length) return [];
  const anno = Math.max(...vittime.map((r) => r.anno));

  return vittime
    .filter((r) => r.anno === anno)
    .sort((a, b) => b.totale - a.totale)
    .slice(0, 4)
    .map((r) => ({
      label: `${r.reato} ${anno}`,
      value: fmtNum(r.totale),
      subtitle: r.pct_femmine !== null ? `vittime, ${fmtPct(r.pct_femmine)} donne` : "vittime",
    }));
}
