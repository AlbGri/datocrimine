import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { PERIODO_DELITTI } from "@/lib/config";

export const metadata: Metadata = pageMetadata(
  "Analisi Territoriale",
  `Mappa interattiva e trend della criminalit\u00e0 per regione e provincia in Italia. Dati ISTAT ${PERIODO_DELITTI}.`,
  "/analisi-territoriale",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
