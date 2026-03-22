import Link from "next/link";
import { KpiSummary } from "@/components/charts/kpi-summary";
import { ChartTrendNazionale } from "@/components/charts/chart-trend-nazionale";
import { ChartPercezioneVsDati } from "@/components/charts/chart-percezione-vs-dati";
import { ChartNumeroOscuro } from "@/components/charts/chart-numero-oscuro";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
      <Link
        href="/report/2024"
        className="block rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-5 transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Nuovo</p>
            <p className="text-lg sm:text-xl font-semibold mt-0.5">
              Report 2024: cosa dicono i dati
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Variazioni, tendenze e mappa regionale dell&apos;anno appena
              trascorso.
            </p>
          </div>
          <span className="text-primary text-xl shrink-0" aria-hidden="true">
            &rarr;
          </span>
        </div>
      </Link>

      <KpiSummary />

      <hr />

      <CollapsibleSection
        title="Trend Delitti Denunciati in Italia (2014-2024)"
        description="Andamento dei delitti denunciati per tipologia di reato"
        defaultOpen
      >
        <ChartTrendNazionale />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title="Percezione della Sicurezza vs Delitti Denunciati (2014-2024)"
        description="Confronto tra percezione di insicurezza e dati reali sulle denunce"
      >
        <ChartPercezioneVsDati />
      </CollapsibleSection>

      <hr />

      <CollapsibleSection
        title="Il Numero Oscuro: Cosa Non Vediamo"
        description="Propensione alla denuncia per tipo di reato e territorio"
      >
        <ChartNumeroOscuro />
      </CollapsibleSection>
    </main>
  );
}
