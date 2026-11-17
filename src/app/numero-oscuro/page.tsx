import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { ChartNumeroOscuro } from "@/components/charts/chart-numero-oscuro";

export const metadata: Metadata = pageMetadata(
  "Il numero oscuro",
  "Quanti reati vengono denunciati: propensione alla denuncia per tipo di reato e territorio, dalle indagini ISTAT sulla sicurezza dei cittadini.",
  "/numero-oscuro",
);

export default function NumeroOscuro() {
  return (
    <main className="space-y-6">
      <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
        Il numero oscuro
      </h1>
      <p>
        I dati di questo sito contano i delitti denunciati, ma molti reati non arrivano mai a una
        denuncia, e la quota cambia molto da un reato all&apos;altro. Qui quella quota per tipo di
        reato, nel tempo e per territorio.
      </p>
      <ChartNumeroOscuro />
    </main>
  );
}
