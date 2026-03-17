import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
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
  title: "Osservatorio Criminalit\u00e0",
  description: "Dati e analisi sulla criminalit\u00e0 in Italia con fonti ufficiali ISTAT",
  openGraph: {
    title: "Osservatorio Criminalit\u00e0",
    description: "Dati e analisi sulla criminalit\u00e0 in Italia 2014-2024 con fonti ufficiali ISTAT",
    type: "website",
    locale: "it_IT",
    url: "https://albgri.github.io/osservatorio-criminalita-next",
    siteName: "Osservatorio Criminalit\u00e0",
    images: [
      {
        url: "https://albgri.github.io/osservatorio-criminalita-next/og-image.png",
        width: 1200,
        height: 630,
        alt: "Osservatorio Criminalit\u00e0 - Dati e analisi sulla criminalit\u00e0 in Italia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Osservatorio Criminalit\u00e0",
    description: "Dati e analisi sulla criminalit\u00e0 in Italia 2014-2024 con fonti ufficiali ISTAT",
    images: ["https://albgri.github.io/osservatorio-criminalita-next/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <div className="min-h-[calc(100vh-3.5rem)]">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
