import { cn } from "@/lib/utils";

// Stile comune: superficie con bordo; premuto = superficie 2 e bordo scuro
export function Pulsante({
  premuto,
  className,
  ...props
}: React.ComponentProps<"button"> & { premuto?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={premuto}
      className={cn(
        "cursor-pointer rounded-[6px] border border-border bg-card px-3 py-1.5 text-[0.92rem] leading-tight text-foreground hover:border-muted-foreground aria-pressed:relative aria-pressed:border-foreground aria-pressed:bg-secondary",
        className,
      )}
      {...props}
    />
  );
}

// Pulsanti uniti in una fila, come i segmenti dello stile comune
export const SEGMENTO = "-ml-px rounded-none first:ml-0 first:rounded-l-[6px] last:rounded-r-[6px]";
