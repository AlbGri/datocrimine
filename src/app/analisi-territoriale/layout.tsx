import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Analisi Territoriale",
  "Mappa interattiva e trend della criminalit\u00e0 per regione e provincia in Italia. Dati ISTAT 2014-2024.",
  "/analisi-territoriale",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
