import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { PERIODO_AUTORI } from "@/lib/config";

export const metadata: Metadata = pageMetadata(
  "Persone Denunciate",
  `Profilo demografico di autori e vittime di reato in Italia: nazionalit\u00e0, genere, et\u00e0. Dati ISTAT ${PERIODO_AUTORI}.`,
  "/persone-denunciate",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
