import { ANNO_ULTIMO } from "@/lib/config";

// Struttura del sito: da qui escono mappa, briciole e sitemap
export interface Pagina {
  titolo: string;
  href: string;
}

export interface Gruppo {
  titolo: string;
  pagine: Pagina[];
}

export const MAPPA: (Pagina | Gruppo)[] = [
  { titolo: "Home", href: "/" },
  { titolo: "Territori", href: "/analisi-territoriale" },
  { titolo: "Reati di allarme sociale", href: "/reati-allarme-sociale" },
  { titolo: "Persone denunciate", href: "/persone-denunciate" },
  { titolo: `Report ${ANNO_ULTIMO}`, href: `/report/${ANNO_ULTIMO}` },
  {
    titolo: "Capire i dati",
    pagine: [
      { titolo: "Guida alla lettura", href: "/guida" },
      { titolo: "Metodologia", href: "/metodologia" },
      { titolo: "Analisi statistiche", href: "/insights" },
      { titolo: "Dati e codice", href: "/dati-e-codice" },
    ],
  },
];

// Indirizzi gia' pubblicati che restano online senza stare nella mappa
export const FUORI_MAPPA: Pagina[] = [{ titolo: "Esplora i dati", href: "/esplora" }];

export function isGruppo(voce: Pagina | Gruppo): voce is Gruppo {
  return "pagine" in voce;
}

/** Percorso dalla home alla pagina: gruppo (se c'e') e pagina; vuoto per la home. */
export function briciole(pathname: string): string[] {
  for (const voce of MAPPA) {
    if (isGruppo(voce)) {
      const pagina = voce.pagine.find((p) => p.href === pathname);
      if (pagina) return [voce.titolo, pagina.titolo];
    } else if (voce.href === pathname && pathname !== "/") {
      return [voce.titolo];
    }
  }
  const fuori = FUORI_MAPPA.find((p) => p.href === pathname);
  if (fuori) return [fuori.titolo];
  const report = pathname.match(/^\/report\/(\d{4})$/);
  return report ? [`Report ${report[1]}`] : [];
}

/** Tutti gli indirizzi del sito noti alla struttura (i report degli anni passati li aggiunge la sitemap). */
export function indirizzi(): string[] {
  return [
    ...MAPPA.flatMap((voce) => (isGruppo(voce) ? voce.pagine.map((p) => p.href) : [voce.href])),
    ...FUORI_MAPPA.map((p) => p.href),
  ];
}
