import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

type P = { children?: ReactNode };

function ancora(titolo: string): string {
  return titolo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function testo(nodo: ReactNode): string {
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(testo).join("");
  return "";
}

const components = {
  h1: ({ children }: P) => (
    <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em] mt-8 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: P) => (
    <h2 id={ancora(testo(children))} className="text-xl sm:text-2xl font-semibold text-primary mt-8 scroll-mt-20">
      {children}
    </h2>
  ),
  h3: ({ children }: P) => (
    <h3 className="text-lg font-semibold text-primary mt-6">{children}</h3>
  ),
  h4: ({ children }: P) => (
    <h4 className="font-semibold mt-4">{children}</h4>
  ),
  p: ({ children }: P) => <p className="mt-2">{children}</p>,
  ul: ({ children }: P) => (
    <ul className="list-disc pl-6 space-y-2 mt-2">{children}</ul>
  ),
  ol: ({ children }: P) => (
    <ol className="list-decimal pl-6 space-y-2 mt-2">{children}</ol>
  ),
  li: ({ children }: P) => <li>{children}</li>,
  // Le pagine del sito si aprono nella stessa scheda, le fonti esterne in una nuova
  a: ({ href, children }: { href?: string; children?: ReactNode }) =>
    href?.startsWith("/") ? (
      <Link href={href} className="rimando">
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" className="rimando">
        {children}
      </a>
    ),
  strong: ({ children }: P) => <strong className="font-bold">{children}</strong>,
  hr: () => <hr className="my-6" />,
  blockquote: ({ children }: P) => (
    <blockquote className="rounded-md border bg-muted px-4 py-3 italic mt-2 [&>p]:mt-0">
      {children}
    </blockquote>
  ),
  code: ({ children }: P) => (
    <code className="bg-muted px-1 rounded text-sm">{children}</code>
  ),
  pre: ({ children }: P) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm mt-2">
      {children}
    </pre>
  ),
};

/** Pagina di testo da un markdown di public/, letto in costruzione perche' il testo sia nell'HTML; con `indice` elenca in cima i titoli di secondo livello. */
export function PaginaMarkdown({ src, indice = false }: { src: string; indice?: boolean }) {
  const content = readFileSync(join(process.cwd(), "public", src), "utf-8");
  const [titolo, ...resto] = content.split("\n");
  const sezioni = content
    .split("\n")
    .filter((riga) => riga.startsWith("## "))
    .map((riga) => riga.slice(3).trim());

  return (
    <main>
      <article className="space-y-0">
        <ReactMarkdown components={components}>{titolo}</ReactMarkdown>
        {indice && (
          <nav aria-label="In questa pagina" className="mt-4">
            <p className="font-semibold">In questa pagina</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              {sezioni.map((s) => (
                <li key={s}>
                  <a href={`#${ancora(s)}`} className="rimando">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <ReactMarkdown components={components}>{resto.join("\n")}</ReactMarkdown>
      </article>
    </main>
  );
}
