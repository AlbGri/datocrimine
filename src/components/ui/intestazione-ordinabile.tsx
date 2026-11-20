import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

/** Intestazione di colonna che ordina la tabella: pulsante raggiungibile da tastiera, verso dichiarato con `aria-sort`. */
export function IntestazioneOrdinabile({
  children,
  attiva,
  verso,
  onOrdina,
  destra = false,
  title,
}: {
  children: ReactNode;
  attiva: boolean;
  verso: "asc" | "desc";
  onOrdina: () => void;
  destra?: boolean;
  title?: string;
}) {
  return (
    <th
      aria-sort={attiva ? (verso === "asc" ? "ascending" : "descending") : undefined}
      className={`py-2 px-3 font-semibold ${destra ? "text-right" : "text-left"}`}
      title={title}
    >
      <button
        type="button"
        onClick={onOrdina}
        className="inline-flex min-h-6 items-center font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
      >
        {children}
        {attiva ? (
          verso === "asc" ? <ChevronUp className="ml-1 size-3.5" /> : <ChevronDown className="ml-1 size-3.5" />
        ) : (
          <ChevronsUpDown className="ml-1 size-3.5 text-muted-foreground/40" />
        )}
      </button>
    </th>
  );
}
