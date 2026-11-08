import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Reati di Allarme Sociale",
  "Trend e analisi di omicidi, violenze sessuali, rapine in abitazione e altri reati gravi in Italia. Dati ISTAT 2014-2024.",
  "/reati-allarme-sociale",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
