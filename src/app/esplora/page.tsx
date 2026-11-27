import Link from "next/link";

const SEZIONI = [
  {
    href: "/analisi-territoriale",
    titolo: "Territori",
    descrizione:
      "Mappa interattiva e trend della criminalit\u00e0 per regione e provincia. Confronta tassi, classifica territori, esplora le differenze locali.",
  },
  {
    href: "/reati-allarme-sociale",
    titolo: "Reati di Allarme Sociale",
    descrizione:
      "Trend nazionali e regionali di omicidi, violenze sessuali, rapine e altri reati gravi, con dettaglio per territorio.",
  },
  {
    href: "/persone-denunciate",
    titolo: "Persone Denunciate",
    descrizione:
      "Autori e vittime di reato in Italia per nazionalit\u00e0, genere ed et\u00e0, dal 2007 a oggi.",
  },
];

export default function Esplora() {
  return (
    <main className="space-y-6 sm:space-y-10">
      <div className="space-y-2">
        <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
          Esplora i dati
        </h1>
        <p className="text-muted-foreground">
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
