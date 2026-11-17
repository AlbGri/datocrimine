import Link from "next/link";
import { DatiAggiornati } from "@/components/layout/dati-aggiornati";

export function Piede() {
  return (
    <footer className="mt-4 border-t pt-2 text-[0.88rem] text-muted-foreground [&_a]:underline [&_a]:hover:text-foreground">
      <p>
        Progetto indipendente, non affiliato a istituzioni pubbliche. Dati elaborati da fonti
        ISTAT. Segnala un errore:{" "}
        <a href="mailto:datocrimine@albgri.com?subject=Segnalazione%20DatoCrimine">
          datocrimine@albgri.com
        </a>{" "}
        o{" "}
        <a href="https://github.com/AlbGri/datocrimine/issues" target="_blank" rel="noopener noreferrer">
          su GitHub
        </a>{" "}
        · <Link href="/progetto">Chi c&apos;è dietro</Link> ·{" "}
        <a href="https://github.com/AlbGri/datocrimine" target="_blank" rel="noopener noreferrer">
          Codice
        </a>{" "}
        · Licenza AGPL-3.0
      </p>
      <DatiAggiornati className="min-[761px]:hidden" />
    </footer>
  );
}
