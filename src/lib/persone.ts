/** Autori o vittime: la scelta in cima a Persone denunciate */
export type DataType = "OFFEND" | "VICTIM";

/** etichetta: il pulsante; soggetto: inizio di un titolo; titolo: dentro un titolo */
export const CHI: Record<DataType, { etichetta: string; soggetto: string; titolo: string }> = {
  OFFEND: { etichetta: "Autori", soggetto: "Autori denunciati", titolo: "autori denunciati" },
  VICTIM: { etichetta: "Vittime", soggetto: "Vittime", titolo: "vittime" },
};
