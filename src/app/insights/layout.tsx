import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { fmtNum } from "@/lib/format";
import insightsData from "@/data/insights.json";
import insightsMeta from "@/data/insights_meta.json";

export const metadata: Metadata = pageMetadata(
  "Insights",
  `Analisi statistica dei trend della criminalità in Italia: ${insightsData.length} insight scelti fra ${fmtNum(insightsMeta.combinazioni_analizzate)} combinazioni, con test statistici e correzione per i confronti multipli.`,
  "/insights",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
