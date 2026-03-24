"use client";

import { useState } from "react";
import { KpiAutoriVittime } from "@/components/charts/kpi-autori-vittime";
import { ChartProfiloNazionale } from "@/components/charts/chart-profilo-nazionale";
import { ChartAutoriVsVittime } from "@/components/charts/chart-autori-vs-vittime";
import { ChartAutoriTrend } from "@/components/charts/chart-autori-trend";
import { ChartAutoriRankingRegioni } from "@/components/charts/chart-autori-ranking-regioni";
import { ChartProfiloTerritorio } from "@/components/charts/chart-profilo-territorio";
import { ChartAutoriTrendRegione } from "@/components/charts/chart-autori-trend-regione";
import { ChartAutoriTabellaProvince } from "@/components/charts/chart-autori-tabella-province";
import { ChartProfiloProvincia } from "@/components/charts/chart-profilo-provincia";
import { ChartAutoriTrendProvincia } from "@/components/charts/chart-autori-trend-provincia";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

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

      {dataType === "VICTIM" && (
        <Alert>
          <AlertDescription className="block">
            <strong>Nota:</strong> per le vittime il dato aggregato (totale per tutti i reati)
            non &egrave; disponibile. Le analisi sono basate sui singoli reati.
            Una stessa vittima pu&ograve; comparire in pi&ugrave; tipologie.
          </AlertDescription>
        </Alert>
      )}

      {/* === BLOCCO NAZIONALE === */}

      {/* 1. KPI */}
      <KpiAutoriVittime dataType={dataType} />

      <hr />

      {/* 2. Trend Nazionale */}
      <CollapsibleSection
        title="Trend Nazionale"
        description="Andamento temporale di autori denunciati e vittime per reato"
        defaultOpen
      >
        <ChartAutoriTrend dataType={dataType} />
      </CollapsibleSection>

      <hr />

      {/* 3. Profilo Criminale Nazionale */}
      <CollapsibleSection
        title="Profilo Criminale Nazionale"
        description="Composizione per tipo di reato: quota stranieri, maschi, femmine e minori"
      >
        <ChartProfiloNazionale dataType={dataType} />
      </CollapsibleSection>

      <hr />

      {/* 4. Confronto Autori vs Vittime */}
      <CollapsibleSection
        title="Confronto Autori vs Vittime per Reato"
        description="Rapporto tra autori denunciati e vittime per tipologia di reato"
      >
        <ChartAutoriVsVittime />
      </CollapsibleSection>

      <hr />

      {/* === BLOCCO REGIONALE === */}

      {/* 5. Ranking Regionale */}
      <CollapsibleSection
        title="Ranking Regionale"
        description="Classifica regioni per numero di denunciati o vittime"
      >
        <ChartAutoriRankingRegioni dataType={dataType} />
      </CollapsibleSection>

      <hr />

      {/* 6. Trend Regionale */}
      <CollapsibleSection
        title="Trend Regionale"
        description="Andamento temporale per singola regione"
      >
        <ChartAutoriTrendRegione dataType={dataType} />
      </CollapsibleSection>

      <hr />

      {/* 7. Profilo Criminale per Regione */}
      <CollapsibleSection
        title="Profilo Criminale per Regione"
        description="Distribuzione dei reati per regione rispetto alla media nazionale"
      >
        <ChartProfiloTerritorio dataType={dataType} />
      </CollapsibleSection>

      <hr />

      {/* === BLOCCO PROVINCIALE === */}

      {/* 8. Dati Provinciali */}
      <CollapsibleSection
        title="Dati Provinciali"
        description="Tabella con dati per provincia e variazioni temporali"
      >
        <ChartAutoriTabellaProvince dataType={dataType} />
      </CollapsibleSection>

      <hr />

      {/* 9. Trend Provinciale */}
      <CollapsibleSection
        title="Trend Provinciale"
        description="Andamento temporale per singola provincia"
      >
        <ChartAutoriTrendProvincia dataType={dataType} />
      </CollapsibleSection>

      <hr />

      {/* 10. Profilo Criminale per Provincia */}
      <CollapsibleSection
        title="Profilo Criminale per Provincia"
        description="Distribuzione dei reati per provincia rispetto alla media nazionale (dal 2022)"
      >
        <ChartProfiloProvincia dataType={dataType} />
      </CollapsibleSection>

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
