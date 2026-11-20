import { Pulsante } from "@/components/ui/pulsante";

// Sotto i 640 px un menu a tendina: gli 11 pulsanti occuperebbero la prima schermata del telefono
export function SceltaAnno({
  legenda,
  anni,
  anno,
  onScelta,
  children,
}: {
  legenda: string;
  anni: string[];
  anno: string;
  onScelta: (anno: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium">{legenda}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {children}
        <select
          aria-label="Anno"
          value={anno}
          onChange={(e) => onScelta(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background sm:hidden"
        >
          {anni.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="hidden sm:contents">
          {anni.map((a) => (
            <Pulsante key={a} onClick={() => onScelta(a)} premuto={anno === a}>
              {a}
            </Pulsante>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
