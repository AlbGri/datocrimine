"use client";

import { useState } from "react";
import { ChartAllarmeTrendNazionale } from "@/components/charts/chart-allarme-trend-nazionale";
import { ChartAllarmeRankingRegioni } from "@/components/charts/chart-allarme-ranking-regioni";
import { ChartAllarmeTrendRegione } from "@/components/charts/chart-allarme-trend-regione";
import { ChartAllarmeTabellaProvince } from "@/components/charts/chart-allarme-tabella-province";
import { ChartAllarmeTrendProvincia } from "@/components/charts/chart-allarme-trend-provincia";

import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useFetchData } from "@/lib/use-fetch-data";
import { fmtPct } from "@/lib/format";

const REATI = [
  "Atti sessuali con minorenne",
  "Omicidi volontari consumati",
  "Rapine in abitazione",
  "Sequestri di persona",
  "Tentati omicidi",
  "Violenze sessuali",
];

const ANNI = Array.from({ length: 11 }, (_, i) => 2014 + i);

type DelittiAnno = { Anno: number; Delitti: number };

// Quota dei reati di allarme sociale sul totale dei delitti, nell'ultimo anno
function quotaSulTotale(allarme: DelittiAnno[], italia: DelittiAnno[]) {
  const ultimo = italia.reduce((a, b) => (b.Anno > a.Anno ? b : a));
  const somma = allarme
    .filter((d) => d.Anno === ultimo.Anno)
    .reduce((tot, d) => tot + d.Delitti, 0);
  return { anno: ultimo.Anno, pct: (somma / ultimo.Delitti) * 100 };
}

export default function ReatiAllarmeSociale() {
  const [reato, setReato] = useState(REATI[0]);
  const [anno, setAnno] = useState(2024);
  const { data: allarme } = useFetchData<DelittiAnno[]>("/data/reati_allarme_sociale.json");
  const { data: italia } = useFetchData<DelittiAnno[]>("/data/delitti_italia.json");
  const quota = allarme && italia ? quotaSulTotale(allarme, italia) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold">
          Reati di Allarme Sociale
        </h1>
        <p className="mt-2 text-muted-foreground">
          Focus su reati rari ma ad alto impatto: sono una piccola parte dei
          delitti denunciati
          {quota && ` (${fmtPct(quota.pct, 2)} nel ${quota.anno})`} ma dominano
          la percezione pubblica e la copertura mediatica. Tutti i dati si riferiscono a delitti denunciati alle forze
          dell&apos;ordine, non alla criminalit&agrave; reale.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <label
            htmlFor="reato-select"
            className="block text-sm font-medium mb-1"
          >
            Tipo di reato
          </label>
          <select
            id="reato-select"
            value={reato}
            onChange={(e) => setReato(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {REATI.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium mb-1">
            Anno
          </legend>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Selezione anno">
            {ANNI.map((a) => (
              <button
                key={a}
                onClick={() => setAnno(a)}
                aria-pressed={anno === a}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  anno === a
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <hr />

      <CollapsibleSection
        title={`Trend Nazionale: ${reato} (2014-2024)`}
        description="Andamento temporale del reato selezionato a livello nazionale"
        defaultOpen
      >
        <ChartAllarmeTrendNazionale reatoSelezionato={reato} />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title={`Ranking Regioni: ${reato} (${anno})`}
        description="Classifica regioni per tasso del reato selezionato"
      >
        <ChartAllarmeRankingRegioni anno={anno} reato={reato} />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title={`Trend Regionale: ${reato} (2014-2024)`}
        description="Andamento temporale per singola regione"
      >
        <ChartAllarmeTrendRegione reato={reato} />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title={`Dati Provinciali: ${reato} (${anno})`}
        description="Tabella con dati per provincia"
      >
        <ChartAllarmeTabellaProvince anno={anno} reato={reato} />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title={`Trend Provinciale: ${reato} (2014-2024)`}
        description="Andamento temporale per singola provincia"
      >
        <ChartAllarmeTrendProvincia reato={reato} />
      </CollapsibleSection>

      <hr />

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <strong>Nota metodologica:</strong> tutti i tassi sono calcolati sui
          delitti denunciati e sulla popolazione residente. Per reati rari (es.
          omicidi in regioni piccole), poche unit&agrave; di differenza possono
          causare variazioni percentuali significative. Confrontare sempre i
          valori assoluti.
      </div>
    </main>
  );
}
