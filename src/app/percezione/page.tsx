import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { PERIODO_DELITTI } from "@/lib/config";
import { ChartPercezioneVsDati } from "@/components/charts/chart-percezione-vs-dati";
import { Grafico } from "@/components/charts/grafico";

export const metadata: Metadata = pageMetadata(
  "Percezione della sicurezza",
  `Percezione del rischio di criminalità delle famiglie italiane (ISTAT) a confronto con i delitti denunciati, ${PERIODO_DELITTI}.`,
  "/percezione",
);

export default function Percezione() {
  return (
    <main className="space-y-6">
      <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
        Percezione della sicurezza
      </h1>
      <p>
        Quota di famiglie che vedono un rischio di criminalità molto o abbastanza alto nella zona
        in cui abitano (indagine ISTAT Multiscopo), accanto al tasso dei delitti denunciati. La
        percezione risponde anche ad altro, come copertura dei media, degrado e fiducia nelle
        istituzioni. Il salto fra 2014 e 2015 è probabilmente un cambio di metodo
        dell&apos;indagine: dettagli in{" "}
        <Link href="/metodologia" className="rimando">
          Metodologia
        </Link>
        .
      </p>
      <Grafico
        id="percezione"
        titolo={`Percezione del rischio di criminalità e delitti denunciati, Italia, ${PERIODO_DELITTI}`}
        sottotitolo="Quota di famiglie che vedono un rischio alto nella zona (asse di sinistra) e delitti ogni 1.000 abitanti (asse di destra)"
        fonte="percezione"
        altezza={560}
      >
        <ChartPercezioneVsDati />
      </Grafico>
    </main>
  );
}
