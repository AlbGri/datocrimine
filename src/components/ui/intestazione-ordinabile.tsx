import type { ReactNode } from "react";

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
        <span aria-hidden="true" className={attiva ? "ml-1" : "ml-1 text-muted-foreground/40"}>
          {attiva ? (verso === "asc" ? "▲" : "▼") : "⇵"}
        </span>
      </button>
    </th>
  );
}
