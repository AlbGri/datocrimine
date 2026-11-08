import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Analisi statistica dei trend della criminalit\u00e0 in Italia: 21 insight curati da 4.537 combinazioni con 9 test statistici.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
