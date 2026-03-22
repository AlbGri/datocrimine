import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/metodologia", label: "Metodologia" },
  { href: "/guida", label: "Guida alla Lettura" },
  { href: "/dati-e-codice", label: "Dati e Codice" },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/50 mt-12">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground space-y-3">
        <nav className="flex justify-center gap-4 flex-wrap" aria-label="Link di approfondimento">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1">
          <p>
            Progetto indipendente, non affiliato a istituzioni pubbliche. Dati
            elaborati da fonti ISTAT.
          </p>
          <p>
            <a
              href="https://github.com/AlbGri/datocrimine"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Codice su GitHub
            </a>{" "}
            | Licenza AGPL-3.0
          </p>
        </div>
      </div>
    </footer>
  );
}
