import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Persone Denunciate",
  "Profilo demografico di autori e vittime di reato in Italia: nazionalit\u00e0, genere, et\u00e0. Dati ISTAT 2007-2024.",
  "/persone-denunciate",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
