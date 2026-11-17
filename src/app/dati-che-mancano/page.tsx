import type { Metadata } from "next";
import { PaginaMarkdown } from "@/components/pagina-markdown";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Dati che mancano",
  "Quali dati sulla criminalità l'Italia raccoglie di rado o non pubblica, a confronto con altri paesi. Opinione di chi cura DatoCrimine, con le fonti dei fatti.",
  "/dati-che-mancano",
);

export default function DatiCheMancano() {
  return <PaginaMarkdown src="/data/dati-che-mancano.md" />;
}
