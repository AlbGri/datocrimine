import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esplora i Dati",
  description:
    "Esplora i dati sulla criminalit\u00e0 in Italia: analisi territoriale, reati di allarme sociale, profilo autori e vittime. Dati ISTAT.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
