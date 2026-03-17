import { KpiSummary } from "@/components/charts/kpi-summary";
import { ChartTrendNazionale } from "@/components/charts/chart-trend-nazionale";
import { ChartPercezioneVsDati } from "@/components/charts/chart-percezione-vs-dati";
import { ChartNumeroOscuro } from "@/components/charts/chart-numero-oscuro";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
      <KpiSummary />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Trend Delitti Denunciati in Italia (2014-2024)
        </h2>
        <ChartTrendNazionale />
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Percezione della Sicurezza vs Delitti Denunciati (2014-2024)
        </h2>
        <ChartPercezioneVsDati />
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Il Numero Oscuro: Cosa Non Vediamo
        </h2>
        <ChartNumeroOscuro />
      </section>
    </main>
  );
}
