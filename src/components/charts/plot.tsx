"use client";

import dynamic from "next/dynamic";
import { useMemo, type ComponentProps } from "react";
import { PLOTLY_CONFIG } from "@/lib/config";
import { PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { testo } from "@/lib/caratteri";
import { COLORI_CHIARI, modelloGrafici, traduciColori, useColori } from "@/lib/tema";

// Un solo import dinamico: con piu' import separati Turbopack duplica il core di Plotly
const PlotDinamico = dynamic(() => import("./plotly-component"), { ssr: false });

type PlotProps = ComponentProps<typeof PlotDinamico> & {
  /** Testo per chi usa un lettore di schermo */
  descrizione?: string;
};

/**
 * Grafico Plotly con le impostazioni comuni: carattere del sito, formato italiano, niente zoom,
 * fondo trasparente, colori del tema corrente (i grafici li scrivono chiari, qui diventano scuri)
 */
export function Plot({ descrizione, data, layout, config, ...props }: PlotProps) {
  const colori = useColori();
  const dati = useMemo(() => traduciColori(data, COLORI_CHIARI, colori), [data, colori]);
  const impaginazione = traduciColori(layout, COLORI_CHIARI, colori);
  return (
    <div role={descrizione ? "img" : undefined} aria-label={descrizione}>
      <PlotDinamico
        data={dati}
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          dragmode: false,
          plot_bgcolor: "rgba(0,0,0,0)",
          paper_bgcolor: "rgba(0,0,0,0)",
          template: modelloGrafici(colori),
          ...impaginazione,
          font: { family: testo.style.fontFamily, ...impaginazione?.font },
        }}
        config={config ?? PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
        {...props}
      />
    </div>
  );
}
