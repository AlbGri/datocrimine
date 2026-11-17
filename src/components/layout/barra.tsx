"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { briciole } from "@/lib/sito";
import { DatiAggiornati } from "@/components/layout/dati-aggiornati";

export function Barra() {
  const passi = briciole(usePathname());
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-baseline gap-x-3.5 gap-y-0.5 border-b bg-card px-4 py-2">
      <Link href="/" className="font-serif text-[1.3rem] leading-[1.1] font-bold">
        DatoCrimine
      </Link>
      {passi.length > 0 && (
        <nav aria-label="Briciole" className="text-[0.9rem] text-muted-foreground">
          <Link href="/" className="underline">
            Home
          </Link>
          {passi.map((passo) => (
            <Fragment key={passo}> › {passo}</Fragment>
          ))}
        </nav>
      )}
      <DatiAggiornati className="ml-auto text-[0.9rem] text-muted-foreground max-[760px]:hidden" />
    </header>
  );
}
