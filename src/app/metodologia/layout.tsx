import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Metodologia",
  "Fonti dati ISTAT, metodi di analisi statistica e limiti di DatoCrimine.",
  "/metodologia",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
