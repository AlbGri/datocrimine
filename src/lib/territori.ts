import { readFileSync } from "node:fs";
import path from "node:path";

export interface Regione {
  nome: string;
  province: string[];
}

/** Regioni e province in ordine alfabetico, lette in costruzione: la barra di pagina le mostra subito */
export function leggiTerritori(): Regione[] {
  const file = path.join(process.cwd(), "public", "data", "delitti_province.json");
  const righe: { Territorio: string; Regione: string }[] = JSON.parse(readFileSync(file, "utf-8"));
  const perRegione = new Map<string, Set<string>>();
  for (const r of righe) {
    if (!perRegione.has(r.Regione)) perRegione.set(r.Regione, new Set());
    perRegione.get(r.Regione)!.add(r.Territorio);
  }
  const alfabetico = (a: string, b: string) => a.localeCompare(b, "it");
  return [...perRegione]
    .map(([nome, province]) => ({ nome, province: [...province].sort(alfabetico) }))
    .sort((a, b) => alfabetico(a.nome, b.nome));
}
