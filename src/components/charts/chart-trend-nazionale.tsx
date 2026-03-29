"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useFetchData } from "@/lib/use-fetch-data";
import {
  COLORS,
  CHART_HEIGHT,
  CHART_HEIGHT_MINI,
  PLOTLY_CONFIG,
  PLOTLY_FONT,
  COVID_SHAPES,
  getCovidAnnotations,
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

const CATEGORIE_DETTAGLIO: Record<string, string> = {
  "Furti": "furti in abitazione, auto, con destrezza, con strappo, ecc.",
  "Violenze contro la persona": "omicidi volontari e tentati, lesioni dolose, percosse, minacce, sequestri di persona, violenze sessuali, atti sessuali con minorenne, pornografia minorile, sfruttamento prostituzione",
  "Truffe e Frodi": "truffe e frodi informatiche, delitti informatici, contraffazione, violazione proprieta' intellettuale",
  "Rapine": "rapine in abitazione, in banca, in pubblica via, ecc.",
  "Droga": "produzione, traffico e spaccio di stupefacenti",
  "Altro": "estorsioni, ricettazione, danneggiamenti, incendi dolosi, riciclaggio, usura, associazione per delinquere e di tipo mafioso, contrabbando, omicidi stradali e colposi, altri delitti",
};

type ViewMode = "totale" | "tipologia";
type Metrica = "tasso" | "assoluto";

export function ChartTrendNazionale() {
  const [view, setView] = useState<ViewMode>("totale");
  const [metrica, setMetrica] = useState<Metrica>("tasso");
  const [showCategorie, setShowCategorie] = useState(false);
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
      hovertemplate: isAssoluto
        ? "<b>%{fullData.name}</b><br>Anno: %{x}<br>Delitti: %{y:,.0f}<extra></extra>"
        : "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:.2f} per 1.000 ab.<extra></extra>",
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
      hovertemplate: isAssoluto
        ? "<b>%{fullData.name}</b><br>Anno: %{x}<br>Delitti: %{y:,.0f}<extra></extra>"
        : "<b>%{fullData.name}</b><br>Anno: %{x}<br>%{y:.2f} per 1.000 ab.<extra></extra>",
      line: { width: 2, color: COLORI_CATEGORIE[cat] ?? COLORS.grigioMedia },
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
          <strong>Nota metodologica:</strong> questi dati mostrano <strong>denunce registrate</strong>, non crimini effettivamente commessi. Alcuni reati hanno bassa propensione alla denuncia (es. violenze domestiche), altri alta (es. furti auto assicurati).
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
        {isTipologia && (
          <button
            onClick={() => setShowCategorie((v) => !v)}
            className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 pb-2 transition-colors"
            aria-expanded={showCategorie}
            aria-label="Mostra dettaglio categorie"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs font-medium">i</span>
            <span>{showCategorie ? "Nascondi categorie" : "Cosa include ogni categoria?"}</span>
          </button>
        )}
      </div>

      {isTipologia && showCategorie && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {Object.entries(CATEGORIE_DETTAGLIO).map(([cat, dettaglio]) => (
            <div key={cat} className="rounded-md border border-border p-2">
              <span className="font-medium" style={{ color: COLORI_CATEGORIE[cat] }}>{cat}</span>
              <span className="text-muted-foreground">: {dettaglio}</span>
            </div>
          ))}
        </div>
      )}

      <ChartFullscreenWrapper ariaDescription={isTipologia ? "Grafico trend delitti per tipologia in Italia dal 2014 al 2024: furti in calo, truffe in crescita costante" : "Grafico trend tasso delitti denunciati per 1.000 abitanti in Italia dal 2014 al 2024"}>
        <Plot
          key={`${metrica}-${view}`}
          data={isTipologia ? traceTipologia : traceTotale}
          layout={{
            separators: PLOTLY_IT_SEPARATORS,
            xaxis: { ...getAxisYear(isMobile), title: { text: "Anno" } },
            yaxis: { ...AXIS_FIXED, title: { text: isAssoluto ? "Delitti denunciati" : "Tasso per 1.000 ab.", font: { size: PLOTLY_FONT.axisTitle } }, ...(isAssoluto && { tickformat: "~s", hoverformat: ",.0f" }) },
            dragmode: false,
            hovermode: "closest" as const,
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            height: isMobile ? CHART_HEIGHT_MINI : CHART_HEIGHT,
            margin: isMobile ? { l: 45, r: 20, t: 20, b: 60 } : { l: 50, r: 20, t: 20, b: 50 },
            legend: isTipologia
              ? isMobile
                ? { x: 0.5, y: -0.35, xanchor: "center" as const, yanchor: "top" as const, orientation: "h" as const, font: { size: PLOTLY_FONT.legendMobile } }
                : { x: 0.5, y: 1.08, xanchor: "center" as const, orientation: "h" as const }
              : { x: 0.5, y: -0.15, xanchor: "center" as const, orientation: "h" as const },
            showlegend: true,
            shapes: COVID_SHAPES,
            annotations: getCovidAnnotations(isMobile),
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
