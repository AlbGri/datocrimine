import datiMeta from "@/data/dati_meta.json";
import { fmtData } from "@/lib/format";

// Nella barra sul computer, nel piede sul telefono
export function DatiAggiornati({ className }: { className?: string }) {
  return (
    <span className={className}>
      Dati aggiornati al {fmtData(datiMeta.scaricati_il)}, fino all&apos;anno{" "}
      {datiMeta.ultimo_anno}
    </span>
  );
}
