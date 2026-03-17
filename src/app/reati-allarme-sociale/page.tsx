"use client";

import { useState } from "react";
import { ChartAllarmeTrendNazionale } from "@/components/charts/chart-allarme-trend-nazionale";
import { ChartAllarmeRankingRegioni } from "@/components/charts/chart-allarme-ranking-regioni";
import { ChartAllarmeTrendRegione } from "@/components/charts/chart-allarme-trend-regione";
import { ChartAllarmeTabellaProvince } from "@/components/charts/chart-allarme-tabella-province";
import { ChartAllarmeTrendProvincia } from "@/components/charts/chart-allarme-trend-provincia";
import { Alert, AlertDescription } from "@/components/ui/alert";

const REATI = [
  "Omicidi volontari consumati",
  "Tentati omicidi",
  "Violenze sessuali",
  "Atti sessuali con minorenne",
  "Rapine in abitazione",
  "Sequestri di persona",
];

const ANNI = Array.from({ length: 11 }, (_, i) => 2014 + i);

export default function ReatiAllarmeSociale() {
  const [reato, setReato] = useState(REATI[0]);
  const [anno, setAnno] = useState(2024);

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold">
          Reati di Allarme Sociale
        </h1>
        <p className="mt-2 text-muted-foreground">
          Focus su reati rari ma ad alto impatto: rappresentano meno del 2% dei
          delitti totali ma dominano la percezione pubblica e la copertura
          mediatica. Tutti i dati si riferiscono a delitti denunciati alle forze
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

        <div>
          <span className="block text-sm font-medium mb-1">
            Anno
          </span>
          <div className="flex flex-wrap gap-1">
            {ANNI.map((a) => (
              <button
                key={a}
                onClick={() => setAnno(a)}
                className={`px-2.5 py-1.5 text-sm rounded-md transition-colors ${
                  anno === a
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Trend Nazionale: {reato} (2014-2024)
        </h2>
        <ChartAllarmeTrendNazionale reatoSelezionato={reato} />
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Ranking Regioni: {reato} ({anno})
        </h2>
        <ChartAllarmeRankingRegioni anno={anno} reato={reato} />
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Trend Regionale: {reato} (2014-2024)
        </h2>
        <ChartAllarmeTrendRegione reato={reato} />
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Dati Provinciali: {reato} ({anno})
        </h2>
        <ChartAllarmeTabellaProvince anno={anno} reato={reato} />
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Trend Provinciale: {reato} (2014-2024)
        </h2>
        <ChartAllarmeTrendProvincia reato={reato} />
      </section>

      <hr />

      <Alert>
        <AlertDescription className="block">
          <strong>Nota metodologica:</strong> tutti i tassi sono calcolati sui
          delitti denunciati e sulla popolazione residente. Per reati rari (es.
          omicidi in regioni piccole), poche unit&agrave; di differenza possono
          causare variazioni percentuali significative. Confrontare sempre i
          valori assoluti.
        </AlertDescription>
      </Alert>
    </main>
  );
}
