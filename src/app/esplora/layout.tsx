import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Esplora i Dati",
  "Esplora i dati sulla criminalit\u00e0 in Italia: analisi territoriale, reati di allarme sociale, profilo autori e vittime. Dati ISTAT.",
  "/esplora",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
