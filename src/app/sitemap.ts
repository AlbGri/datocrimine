import { execSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

export const dynamic = "force-static";

type Frequenza = "monthly" | "yearly";

const PAGINE: [string, Frequenza, number][] = [
  ["", "monthly", 1.0],
  ["/esplora", "monthly", 0.8],
  ["/analisi-territoriale", "monthly", 0.8],
  ["/reati-allarme-sociale", "monthly", 0.8],
  ["/persone-denunciate", "monthly", 0.8],
  ["/insights", "monthly", 0.9],
  ["/report/2024", "yearly", 0.9],
  ["/metodologia", "yearly", 0.5],
  ["/guida", "yearly", 0.5],
  ["/dati-e-codice", "yearly", 0.4],
];

export default function sitemap(): MetadataRoute.Sitemap {
  // Giorno dell'ultimo commit che ha toccato pagine o dati: serve la storia git completa
  const lastModified = execSync("git log -1 --format=%cs -- src public", {
    encoding: "utf8",
  }).trim();
  return PAGINE.map(([path, changeFrequency, priority]) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
