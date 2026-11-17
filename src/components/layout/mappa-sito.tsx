"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MAPPA, isGruppo, type Pagina } from "@/lib/sito";

// Linea della metropolitana: la riga verticale sta sul <li>, il pallino sul link
const FERMATA =
  "relative pl-5 before:absolute before:left-[5px] before:top-0 before:bottom-0 before:w-0.5 before:bg-border last:before:bottom-auto last:before:h-3.5";
const VOCE =
  "block cursor-pointer list-none rounded-[4px] px-1.5 py-1 hover:bg-secondary before:absolute before:rounded-full before:border-2 before:border-muted-foreground before:bg-background aria-[current=page]:font-bold aria-[current=page]:before:border-foreground aria-[current=page]:before:bg-evidenza [&::-webkit-details-marker]:hidden";
const PALLINO = "before:left-0 before:top-2 before:size-3";
const PALLINO_PICCOLO = "before:left-0.5 before:top-2.5 before:size-2";

export function MappaSito() {
  const pathname = usePathname();
  const [aperta, setAperta] = useState(false);

  const voce = (pagina: Pagina, pallino: string) => {
    const corrente = pagina.href === pathname;
    return (
      <Link
        href={pagina.href}
        aria-current={corrente ? "page" : undefined}
        className={`${VOCE} ${pallino}`}
        onClick={() => setAperta(false)}
      >
        {pagina.titolo}
        {corrente && <span className="ml-2 text-xs font-normal whitespace-nowrap text-muted-foreground">sei qui</span>}
      </Link>
    );
  };

  return (
    <>
      <nav
        id="mappa"
        aria-label="Mappa del sito"
        className={`sticky top-[58px] max-h-[calc(100vh-70px)] overflow-auto text-[0.92rem] max-[760px]:fixed max-[760px]:inset-x-0 max-[760px]:top-auto max-[760px]:bottom-0 max-[760px]:z-40 max-[760px]:max-h-[72vh] max-[760px]:rounded-t-xl max-[760px]:border-t-2 max-[760px]:border-foreground max-[760px]:bg-card max-[760px]:px-4 max-[760px]:pt-3 max-[760px]:pb-[70px] ${aperta ? "" : "max-[760px]:invisible"}`}
      >
        <h2 className="mb-1.5 text-[1.05rem] font-medium text-muted-foreground">Mappa del sito</h2>
        <ul>
          {MAPPA.map((v) =>
            isGruppo(v) ? (
              <li key={v.titolo} className={FERMATA}>
                <details
                  className="group"
                  open={v.pagine.some((p) => p.href === pathname) || undefined}
                >
                  <summary
                    className={`${VOCE} ${PALLINO} after:float-right after:text-muted-foreground after:content-['+'] group-open:after:content-['−']`}
                  >
                    {v.titolo}
                  </summary>
                  <ul>
                    {v.pagine.map((p) => (
                      <li key={p.href} className={FERMATA}>
                        {voce(p, PALLINO_PICCOLO)}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ) : (
              <li key={v.href} className={`${FERMATA} first:before:top-3.5`}>
                {voce(v, PALLINO)}
              </li>
            ),
          )}
        </ul>
      </nav>
      <button
        type="button"
        aria-controls="mappa"
        aria-expanded={aperta}
        onClick={() => setAperta(!aperta)}
        className="fixed right-3.5 bottom-3.5 z-50 cursor-pointer rounded-full border border-foreground bg-evidenza px-3 py-2 text-[0.9rem] leading-tight font-bold text-su-evidenza min-[761px]:hidden"
      >
        {aperta ? "Chiudi" : "Mappa"}
      </button>
    </>
  );
}
