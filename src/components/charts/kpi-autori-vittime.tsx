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

/** Calcola variazione triennale: media(2020-2022) vs media(2017-2019).
 *  Periodi diversi da varTriennale globale (2014-2016 vs 2021-2023)
 *  perche' i dati autori AUTVITTPS finiscono al 2022. */
function varTriennaleAutori(data: TrendRecord[]): number | null {
  const recente = data.filter((d) => d.anno >= 2020 && d.anno <= 2022);
  const precedente = data.filter((d) => d.anno >= 2017 && d.anno <= 2019);
  if (recente.length < 2 || precedente.length < 2) return null;
  const mr = recente.reduce((s, d) => s + d.totale, 0) / recente.length;
  const mp = precedente.reduce((s, d) => s + d.totale, 0) / precedente.length;
  if (mp === 0) return null;
  return ((mr - mp) / mp) * 100;
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
    const varTot = varTriennaleAutori(trendTot);

    const items: { label: string; value: string; color?: string; subtitle?: string }[] = [
      {
        label: `Totale autori ${ultimo.anno}`,
        value: fmtNum(ultimo.totale),
      },
      {
        label: `Stranieri ${ultimo.anno}`,
        value: fmtPct(ultimo.pct_stranieri),
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
              subtitle: "media '17-'19 vs '20-'22 (denunciati, non condannati)",
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
