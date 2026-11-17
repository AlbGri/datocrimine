/** "In questa pagina": link alle sezioni, utili su telefono dove le pagine aperte sono lunghe */
export function IndicePagina({ sezioni }: { sezioni: { id: string; titolo: string }[] }) {
  return (
    <nav aria-label="In questa pagina" className="text-sm">
      <span className="text-muted-foreground">In questa pagina: </span>
      {sezioni.map((s, i) => (
        <span key={s.id}>
          {i > 0 && <span className="text-muted-foreground"> · </span>}
          <a href={`#${s.id}`} className="rimando">
            {s.titolo}
          </a>
        </span>
      ))}
    </nav>
  );
}
