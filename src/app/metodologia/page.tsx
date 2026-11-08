"use client";

import { useState, useEffect, ReactNode } from "react";
import ReactMarkdown from "react-markdown";

type P = { children?: ReactNode };

const components = {
  h1: ({ children }: P) => (
    <h1 className="text-2xl sm:text-4xl font-bold mt-8 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: P) => (
    <h2 className="text-xl sm:text-2xl font-semibold text-primary mt-8">{children}</h2>
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
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:no-underline"
    >
      {children}
    </a>
  ),
  strong: ({ children }: P) => <strong className="font-bold">{children}</strong>,
  hr: () => <hr className="my-6" />,
  blockquote: ({ children }: P) => (
    <blockquote className="border-l-4 border-muted pl-4 italic mt-2">
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

export default function Metodologia() {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/methodology.md")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(setContent)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
        <p className="text-destructive">Errore nel caricamento: {error}</p>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
        <p className="text-muted-foreground">Caricamento...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
      <article className="space-y-0">
        <ReactMarkdown components={components}>{content}</ReactMarkdown>
      </article>
    </main>
  );
}
