import { execSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";
import { ANNI_REPORT } from "@/lib/report-anni";
import { indirizzi } from "@/lib/sito";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Giorno dell'ultimo commit che ha toccato pagine o dati: serve la storia git completa
  const lastModified = execSync("git log -1 --format=%cs -- src public", {
    encoding: "utf8",
  }).trim();
  const percorsi = new Set([...indirizzi(), ...ANNI_REPORT.map((anno) => `/report/${anno}`)]);
  return [...percorsi].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
  }));
}
