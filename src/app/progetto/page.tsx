import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Chi c'è dietro",
  "Chi cura DatoCrimine, perché è nato e come segnalare un errore nei dati o nei testi.",
  "/progetto",
);

const TITOLO_SEZIONE = "text-xl sm:text-2xl font-semibold text-primary";

export default function Progetto() {
  return (
    <main className="space-y-8">
      <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
        Chi c&apos;è dietro
      </h1>

      <section className="space-y-3">
        <h2 className={TITOLO_SEZIONE}>Chi fa questo sito</h2>
        <p>
          DatoCrimine è curato da Alberto Grippaldi, a titolo personale. Non è legato a enti
          pubblici, partiti, giornali o associazioni, e non ha finanziamenti né pubblicità.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={TITOLO_SEZIONE}>Perché</h2>
        <p>
          Il dibattito pubblico sulla sicurezza si basa spesso su percezioni e titoli di giornale
          più che sui dati. Il sito mette a disposizione di tutti i numeri ufficiali ISTAT, con il
          metodo dichiarato e il codice aperto, perché chiunque possa controllarli.
        </p>
      </section>

      <section id="segnalazioni" className="space-y-3">
        <h2 className={TITOLO_SEZIONE}>Come segnalare un errore</h2>
        <p>
          Se trovi un errore nei dati, nei calcoli o nei testi, scrivi a{" "}
          <a
            href="mailto:datocrimine@albgri.com?subject=Segnalazione%20DatoCrimine"
            className="rimando"
          >
            datocrimine@albgri.com
          </a>{" "}
          oppure apri una{" "}
          <a
            href="https://github.com/AlbGri/datocrimine/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="rimando"
          >
            segnalazione pubblica su GitHub
          </a>{" "}
          (serve un account). Ogni segnalazione viene letta e valutata.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={TITOLO_SEZIONE}>Codice e dati</h2>
        <p>
          Il codice è{" "}
          <a
            href="https://github.com/AlbGri/datocrimine"
            target="_blank"
            rel="noopener noreferrer"
            className="rimando"
          >
            pubblico su GitHub
          </a>{" "}
          con licenza AGPL-3.0. I dati sono di ISTAT; licenze e file scaricabili sono in{" "}
          <Link href="/dati-e-codice" className="rimando">
            Dati e codice
          </Link>
          , e come si contano le visite è spiegato in{" "}
          <Link href="/metodologia" className="rimando">
            Metodologia
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
