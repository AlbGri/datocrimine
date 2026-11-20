import { Alegreya, Atkinson_Hyperlegible_Next } from "next/font/google";

// Caratteri dello stile comune, serviti dal sito (nessuna richiesta a Google)
export const testo = Atkinson_Hyperlegible_Next({
  variable: "--font-testo",
  subsets: ["latin"],
  fallback: ["Segoe UI", "Roboto", "sans-serif"],
});

export const titoli = Alegreya({
  variable: "--font-titoli",
  subsets: ["latin"],
  fallback: ["Palatino", "Georgia", "serif"],
});
