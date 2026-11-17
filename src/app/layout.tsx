import type { Metadata } from "next";
import { Alegreya, Atkinson_Hyperlegible_Next } from "next/font/google";
import { Barra } from "@/components/layout/barra";
import { MappaSito } from "@/components/layout/mappa-sito";
import { Piede } from "@/components/layout/piede";
import { ContaVisite } from "@/components/layout/conta-visite";
import { FilterSyncProvider } from "@/lib/filter-sync-context";
import { SITE_NAME, SITE_URL } from "@/lib/metadata";
import { ANNO_PRIMO_AUTORI, ANNO_ULTIMO } from "@/lib/config";
import "./globals.css";

// Caratteri dello stile comune, serviti dal sito (nessuna richiesta a Google)
const testo = Atkinson_Hyperlegible_Next({
  variable: "--font-testo",
  subsets: ["latin"],
  fallback: ["Segoe UI", "Roboto", "sans-serif"],
});

const titoli = Alegreya({
  variable: "--font-titoli",
  subsets: ["latin"],
  fallback: ["Palatino", "Georgia", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: "Dati e analisi sulla criminalit\u00e0 in Italia con fonti ufficiali ISTAT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Dati e analisi interattive sulla criminalit\u00e0 in Italia con fonti ufficiali ISTAT",
    inLanguage: "it",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    dataset: {
      "@type": "Dataset",
      name: "Dati criminalit\u00e0 Italia ISTAT",
      description:
        "Delitti denunciati, autori e vittime per reato, territorio e anno. Fonti: ISTAT DCCV_DELITTIPS e DCCV_AUTVITTPS.",
      temporalCoverage: `${ANNO_PRIMO_AUTORI}/${ANNO_ULTIMO}`,
      spatialCoverage: {
        "@type": "Place",
        name: "Italia",
      },
      license: "https://creativecommons.org/licenses/by/3.0/it/",
      creator: {
        "@type": "Organization",
        name: "ISTAT",
        url: "https://www.istat.it",
      },
    },
  };

  return (
    <html lang="it">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${testo.variable} ${titoli.variable} antialiased`}
      >
        <FilterSyncProvider>
        <Barra />
        <div className="grid grid-cols-[216px_minmax(0,1fr)] items-start gap-x-[18px] px-4 pt-3.5 pb-5 max-[760px]:grid-cols-[minmax(0,1fr)] max-[760px]:px-3 max-[760px]:pt-2.5 max-[760px]:pb-[60px]">
          <MappaSito />
          <div className="min-w-0">
            {children}
            <Piede />
          </div>
        </div>
        <ContaVisite />
        </FilterSyncProvider>
      </body>
    </html>
  );
}
