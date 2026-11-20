"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PLOTLY_CONFIG } from "@/lib/config";
import { PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { testo } from "@/lib/caratteri";

// Un solo import dinamico: con piu' import separati Turbopack duplica il core di Plotly
const PlotDinamico = dynamic(() => import("./plotly-component"), { ssr: false });

type PlotProps = ComponentProps<typeof PlotDinamico> & {
  /** Testo per chi usa un lettore di schermo */
  descrizione?: string;
};

/** Grafico Plotly con le impostazioni comuni: carattere del sito, formato italiano, niente zoom, fondo trasparente */
export function Plot({ descrizione, layout, config, ...props }: PlotProps) {
  return (
    <div role={descrizione ? "img" : undefined} aria-label={descrizione}>
      <PlotDinamico
        layout={{
          separators: PLOTLY_IT_SEPARATORS,
          dragmode: false,
          plot_bgcolor: "rgba(0,0,0,0)",
          paper_bgcolor: "rgba(0,0,0,0)",
          ...layout,
          font: { family: testo.style.fontFamily, ...layout?.font },
        }}
        config={config ?? PLOTLY_CONFIG}
        useResizeHandler
        className="w-full"
        {...props}
      />
    </div>
  );
}
