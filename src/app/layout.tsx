import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FilterSyncProvider } from "@/lib/filter-sync-context";
import { SITE_NAME, SITE_URL } from "@/lib/metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      temporalCoverage: "2007/2024",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FilterSyncProvider>
        <Header />
        <div className="min-h-[calc(100vh-3.5rem)]">
          {children}
        </div>
        <Footer />
        </FilterSyncProvider>
      </body>
    </html>
  );
}
