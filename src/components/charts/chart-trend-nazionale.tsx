"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT,
  PLOTLY_CONFIG,
  COVID_SHAPES,
  COVID_ANNOTATIONS,
  AXIS_FIXED,
  getAxisYear,
  varTriennale,
  TRIENNALE_PERIODI,
} from "@/lib/config";
import { fmtPctSigned, PLOTLY_IT_SEPARATORS } from "@/lib/format";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartFullscreenWrapper } from "@/components/charts/chart-fullscreen-wrapper";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface DelittiItalia {
  Anno: number;
  Delitti: number;
  Popolazione: number;
  Tasso_per_1000: number;
}

interface CategoriaReato {
  Anno: number;
  Categoria: string;
  Delitti: number;
  Popolazione: number;
  Tasso_per_1000: number;
}

const COLORI_CATEGORIE: Record<string, string> = {
  Furti: COLORS.furti,
  "Violenze contro la persona": COLORS.violenze,
  "Truffe e Frodi": COLORS.truffe,
  Rapine: COLORS.rapine,
  Droga: COLORS.droga,
  Altro: COLORS.altro,
};

type ViewMode = "totale" | "tipologia";
type Metrica = "tasso" | "assoluto";

export function ChartTrendNazionale() {
  const [view, setView] = useState<ViewMode>("totale");
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const isMobile = useIsMobile();

  const { data, loading, error } = useFetchData<DelittiItalia[]>(
    "/data/delitti_italia.json"
  );
  const { data: categorie, loading: loadingCat } = useFetchData<CategoriaReato[]>(
    "/data/delitti_categorie.json"
  );

  if (loading || loadingCat) return <div className="h-[250px] sm:h-[450px] animate-pulse bg-muted rounded" />;
  if (error) return <p className="text-destructive">Errore: {error}</p>;
  if (!data) return null;

  const isAssoluto = metrica === "assoluto";

  const traceTotale = [
    {
      x: data.map((d) => d.Anno),
      y: data.map((d) => isAssoluto ? d.Delitti : d.Tasso_per_1000),
      mode: "lines+markers" as const,
      name: isAssoluto ? "Delitti denunciati" : "Tasso delitti per 1.000 ab.",
      line: { color: COLORS.primary, width: 3 },
      marker: { size: 8 },
    },
  ];

  const categorieUniche = categorie ? [...new Set(categorie.map((d) => d.Categoria))] : [];
  const traceTipologia = categorieUniche.map((cat) => {
    const filtered = categorie!.filter((d) => d.Categoria === cat);
    return {
      x: filtered.map((d) => d.Anno),
      y: filtered.map((d) => isAssoluto ? d.Delitti : d.Tasso_per_1000),
      mode: "lines+markers" as const,
      name: cat,
      line: { width: 2, color: COLORI_CATEGORIE[cat] ?? "#999999" },
      marker: { size: isMobile ? 4 : 6 },
    };
  });

  const calcVar = (cat: string) =>
    categorie
      ? varTriennale(
          categorie.filter((d) => d.Categoria === cat).map((d) => ({ anno: d.Anno, tasso: isAssoluto ? d.Delitti : d.Tasso_per_1000 }))
        )
      : null;
  const varFurti = calcVar("Furti");
  const varTruffe = calcVar("Truffe e Frodi");

  const isTipologia = view === "tipologia";
  const showToggle = !!categorie;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="block">
          {isTipologia ? (
            <>
              <strong>Composizione per tipologia:</strong> ogni reato rientra in una sola categoria. La somma pu&ograve; differire lievemente dal totale nazionale per effetto delle aggregazioni ISTAT.
            </>
          ) : (
            <>
              <strong>Nota metodologica:</strong> questi dati mostrano <strong>denunce registrate</strong>, non crimini effettivamente commessi. Alcuni reati hanno bassa propensione alla denuncia (es. violenze domestiche), altri alta (es. furti auto assicurati).
            </>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-end gap-4">
        {showToggle && (
          <div>
            <span className="block text-sm font-medium mb-1">Visualizzazione</span>
            <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
              <button
                onClick={() => setView("totale")}
                className={`px-3 py-1.5 transition-colors ${
                  view === "totale"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Totale
              </button>
              <button
                onClick={() => setView("tipologia")}
                className={`px-3 py-1.5 transition-colors ${
                  view === "tipologia"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Per tipologia
              </button>
            </div>
          </div>
        )}
        <div>
          <label htmlFor="trend-naz-metrica" className="block text-sm font-medium mb-1">
            Metrica
          </label>
          <select
            id="trend-naz-metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as Metrica)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="tasso">Tasso per 1.000 ab.</option>
            <option value="assoluto">Numero assoluto</option>
          </select>
        </div>
      </div>

      <ChartFullscreenWrapper ariaDescription={isTipologia ? "Grafico trend delitti per tipologia in Italia dal 2014 al 2024: furti in calo, truffe in crescita costante" : "Grafico trend tasso delitti denunciati per 1.000 abitanti in Italia dal 2014 al 2024"}>
        <Plot
          data={isTipologia ? traceTipologia : traceTotale}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
            yaxis: { ...AXIS_FIXED, title: { text: isAssoluto ? "Delitti denunciati" : "Tasso per 1.000 ab.", font: { size: 12 } }, ...(isAssoluto && { tickformat: ",", hoverformat: "," }) },
            dragmode: false,
            hovermode: "closest" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: isMobile ? 250 : CHART_HEIGHT,
            margin: isMobile ? { l: 45, r: 20, t: 20, b: 60 } : { l: 50, r: 20, t: 20, b: 50 },
            legend: isTipologia
              ? isMobile
                ? { x: 0.5, y: -0.35, xanchor: "center" as const, yanchor: "top" as const, orientation: "h" as const, font: { size: 9 } }
                : { x: 0.5, y: 1.08, xanchor: "center" as const, orientation: "h" as const }
              : undefined,
            showlegend: isTipologia,
            shapes: COVID_SHAPES,
            annotations: isMobile
              ? COVID_ANNOTATIONS.map((a) => ({ ...a, y: 0.92, font: { ...a.font, size: 8 } }))
              : COVID_ANNOTATIONS,
          }}
          config={PLOTLY_CONFIG}
          useResizeHandler
          className="w-full"
        />
      </ChartFullscreenWrapper>

      {isTipologia && varFurti !== null && varTruffe !== null && (
        <p className="text-sm text-muted-foreground text-center">
          <strong>Variazioni ({TRIENNALE_PERIODI}):</strong> Furti {fmtPctSigned(varFurti)} | Truffe e Frodi {fmtPctSigned(varTruffe)}
        </p>
      )}
    </div>
  );
}
