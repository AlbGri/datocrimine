import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Insights",
  "Analisi statistica dei trend della criminalit\u00e0 in Italia: 21 insight curati da 4.537 combinazioni con 9 test statistici.",
  "/insights",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
