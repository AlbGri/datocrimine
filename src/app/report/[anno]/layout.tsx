import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criminalit\u00e0 in Italia 2024: i dati ISTAT",
  description:
    "Report annuale sulla criminalit\u00e0 in Italia: cosa \u00e8 cambiato nel 2024, variazioni per reato e territorio, confronto con gli anni precedenti. Dati ISTAT.",
  openGraph: {
    title: "Criminalit\u00e0 in Italia 2024: i dati ISTAT",
    description:
      "Report annuale sulla criminalit\u00e0 in Italia: variazioni 2024 per reato e territorio. Dati ufficiali ISTAT.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
