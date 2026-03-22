export function Footer() {
  return (
    <footer className="border-t bg-muted/50 mt-12">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground space-y-1">
        <p>
          Progetto indipendente, non affiliato a istituzioni pubbliche. Dati
          elaborati da fonti ISTAT.
        </p>
        <p>
          <a
            href="https://github.com/AlbGri/osservatorio-criminalita-next"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Codice su GitHub
          </a>{" "}
          | Licenza AGPL-3.0
        </p>
      </div>
    </footer>
  );
}
