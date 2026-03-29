import Link from "next/link";

const SEZIONI = [
  {
    href: "/analisi-territoriale",
    titolo: "Analisi Territoriale",
    descrizione:
      "Mappa interattiva e trend della criminalit\u00e0 per regione e provincia. Confronta tassi, classifica territori, esplora le differenze locali.",
  },
  {
    href: "/reati-allarme-sociale",
    titolo: "Reati di Allarme Sociale",
    descrizione:
      "Omicidi, violenze sessuali, rapine e altri reati gravi: trend nazionali e regionali, con dettaglio per territorio.",
  },
  {
    href: "/persone-denunciate",
    titolo: "Persone Denunciate",
    descrizione:
      "Chi sono gli autori e le vittime di reato in Italia: profilo per nazionalit\u00e0, genere ed et\u00e0, dal 2007 a oggi.",
  },
];

export default function Esplora() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold">
          Esplora i dati
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Tre prospettive per esplorare i dati ISTAT sulla criminalit&agrave; in
          Italia. Ogni sezione offre grafici interattivi, filtri per territorio e
          periodo, e tabelle scaricabili.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SEZIONI.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group block rounded-lg border p-5 transition-colors hover:border-primary hover:bg-muted/50"
          >
            <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
              {s.titolo}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {s.descrizione}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
