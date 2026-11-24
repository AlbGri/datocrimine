import type { Regione } from "@/lib/territori";

const SELETTORE = "border rounded-md px-3 py-2 text-sm bg-background";

// Sta sopra le sole sezioni che usano regione e provincia: in cima alla pagina farebbe credere che valga anche per i dati di tutta Italia
export function SceltaTerritorio({
  territori,
  regione,
  onRegione,
  provincia,
  onProvincia,
}: {
  territori: Regione[];
  regione: string;
  onRegione: (regione: string) => void;
  provincia: string;
  onProvincia: (provincia: string) => void;
}) {
  const province = territori.find((r) => r.nome === regione)?.province ?? [];
  return (
    <fieldset>
      <legend className="mb-2 block text-sm text-muted-foreground">
        Le sezioni che seguono riguardano la regione e la provincia scelte
      </legend>
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="regione-select" className="block text-sm font-medium mb-1">
            Regione
          </label>
          <select id="regione-select" value={regione} onChange={(e) => onRegione(e.target.value)} className={SELETTORE}>
            {territori.map((r) => (
              <option key={r.nome} value={r.nome}>{r.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="provincia-select" className="block text-sm font-medium mb-1">
            Provincia
          </label>
          <select id="provincia-select" value={provincia} onChange={(e) => onProvincia(e.target.value)} className={SELETTORE}>
            {province.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
