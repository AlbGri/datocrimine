"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Richiesta diretta a GoatCounter invece del loro count.js: niente script di terzi, e i filtri
// pubblicitari bloccano soprattutto quello
const CONTEGGIO = "https://datocrimine.goatcounter.com/count";

export function ContaVisite() {
  const pathname = usePathname();
  const primaPagina = useRef(true);

  useEffect(() => {
    // Le prove in locale non contano
    if (location.protocol !== "https:") return;
    // Dopo un cambio di pagina interno document.referrer resta quello d'arrivo: vale solo una volta
    const provenienza =
      primaPagina.current && !document.referrer.startsWith(location.origin)
        ? document.referrer
        : "";
    primaPagina.current = false;
    const query = new URLSearchParams({
      p: pathname,
      r: provenienza,
      s: [screen.width, screen.height, devicePixelRatio || 1].join(","),
      rnd: Math.random().toString(36).slice(2),
    });
    const url = `${CONTEGGIO}?${query}`;
    if (!navigator.sendBeacon?.(url)) new Image().src = url;
  }, [pathname]);

  return null;
}
