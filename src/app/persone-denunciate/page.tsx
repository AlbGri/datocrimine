"use client";

import { useState } from "react";
import { KpiAutoriVittime } from "@/components/charts/kpi-autori-vittime";
import { ChartAutoriTrend } from "@/components/charts/chart-autori-trend";
import { ChartAutoriRankingRegioni } from "@/components/charts/chart-autori-ranking-regioni";
import { ChartAutoriTrendRegione } from "@/components/charts/chart-autori-trend-regione";
import { ChartAutoriStranieriReato } from "@/components/charts/chart-autori-stranieri-reato";
import { ChartAutoriMinoriReato } from "@/components/charts/chart-autori-minori-reato";
import { ChartAutoriTabellaProvince } from "@/components/charts/chart-autori-tabella-province";
import { ChartAutoriTrendProvincia } from "@/components/charts/chart-autori-trend-provincia";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DataType = "OFFEND" | "VICTIM";

const DATA_TYPE_LABELS: Record<DataType, string> = {
  OFFEND: "Autori",
  VICTIM: "Vittime",
};

export default function PersoneDenunciate() {
  const [dataType, setDataType] = useState<DataType>("OFFEND");

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
      {/* Header + Toggle */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold">
          Persone Denunciate
        </h1>
        <p className="mt-2 text-muted-foreground">
          Autori denunciati/arrestati e vittime di delitto per cittadinanza,
          et&agrave; e tipo di reato. Fonte: ISTAT DCCV_AUTVITTPS (2007-2024 per singoli
          reati, 2007-2022 per il totale).
        </p>
        <div className="mt-4 flex gap-2">
          {(["OFFEND", "VICTIM"] as DataType[]).map((dt) => (
            <button
              key={dt}
              onClick={() => setDataType(dt)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                dataType === dt
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {DATA_TYPE_LABELS[dt]}
            </button>
          ))}
        </div>
      </div>

      {/* 1. KPI */}
      <KpiAutoriVittime dataType={dataType} />

      <hr />

      {/* 2. Trend Nazionale */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Trend Nazionale
        </h2>
        <ChartAutoriTrend dataType={dataType} />
      </section>

      <hr />

      {/* 3. Ranking Regionale */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Ranking Regionale
        </h2>
        <ChartAutoriRankingRegioni dataType={dataType} />
      </section>

      <hr />

      {/* 4. Trend Regionale */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Trend Regionale
        </h2>
        <ChartAutoriTrendRegione dataType={dataType} />
      </section>

      <hr />

      {/* 5. % Stranieri per Reato */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Stranieri per Tipo di Reato (2022)
        </h2>
        <Alert>
          <AlertDescription className="block">
            <strong>Nota:</strong> la quota di stranieri tra {dataType === "OFFEND" ? "gli autori denunciati" : "le vittime"} varia
            molto in base al tipo di reato. I dati si riferiscono a persone denunciate/arrestate,
            non a condanne definitive.
          </AlertDescription>
        </Alert>
        <ChartAutoriStranieriReato dataType={dataType} />
      </section>

      <hr />

      {/* 6. % Minori per Reato */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Minori per Tipo di Reato (2022)
        </h2>
        <ChartAutoriMinoriReato dataType={dataType} />
      </section>

      <hr />

      {/* 7. Dati Provinciali */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Dati Provinciali
        </h2>
        <ChartAutoriTabellaProvince dataType={dataType} />
      </section>

      <hr />

      {/* 8. Trend Provinciale */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Trend Provinciale
        </h2>
        <ChartAutoriTrendProvincia dataType={dataType} />
      </section>

      <hr />

      {/* Nota metodologica */}
      <Alert>
        <AlertDescription className="block">
          <strong>Nota metodologica:</strong> i dati riguardano persone denunciate o
          arrestate dalle forze dell&apos;ordine, non condannate. Una stessa persona
          pu&ograve; comparire pi&ugrave; volte se coinvolta in pi&ugrave; procedimenti.
          Il dato provinciale &egrave; disponibile solo dal 2022.
          Per approfondimenti si rimanda alla{" "}
          <Link href="/metodologia" className="underline">nota metodologica</Link>.
        </AlertDescription>
      </Alert>
    </main>
  );
}
