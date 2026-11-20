"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pause, Play } from "lucide-react";
import { ChartMappaRegioni } from "@/components/charts/chart-mappa-regioni";
import { ChartRankingRegioni } from "@/components/charts/chart-ranking-regioni";
import { ChartTrendRegione } from "@/components/charts/chart-trend-regione";
import { ChartTabellaProvince } from "@/components/charts/chart-tabella-province";
import { ChartTrendProvincia } from "@/components/charts/chart-trend-provincia";
import { Grafico } from "@/components/charts/grafico";
import { IndicePagina } from "@/components/ui/indice-pagina";
import { Pulsante } from "@/components/ui/pulsante";
import { SceltaAnno } from "@/components/ui/scelta-anno";
import { useParametro } from "@/lib/use-parametro";
import { nomeProvincia } from "@/lib/format";
import { ANNI_DELITTI, CHART_HEIGHT_MAP, CHART_HEIGHT_RANKING, PERIODO_DELITTI } from "@/lib/config";
import type { Regione } from "@/lib/territori";

const PLAY_INTERVAL_MS = 1500;
const ANNI = ANNI_DELITTI.map(String);

const SEZIONI = [
  { id: "mappa", titolo: "Mappa" },
  { id: "regioni", titolo: "Regioni a confronto" },
  { id: "regione", titolo: "Andamento della regione" },
  { id: "province", titolo: "Province a confronto" },
  { id: "provincia", titolo: "Andamento della provincia" },
];

const SELETTORE = "border rounded-md px-3 py-2 text-sm bg-background";

export function Territori({ territori }: { territori: Regione[] }) {
  const [annoTesto, setAnno] = useParametro("anno", ANNI, ANNI[ANNI.length - 1]);
  const anno = Number(annoTesto);
  const [regione, setRegione] = useParametro("regione", territori.map((r) => r.nome));
  const province = territori.find((r) => r.nome === regione)?.province ?? [];
  const [provincia, setProvincia] = useParametro("provincia", province);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    setPlaying(true);
    setAnno(ANNI[0]);
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx++;
      if (idx >= ANNI.length) {
        stopPlay();
        return;
      }
      setAnno(ANNI[idx]);
    }, PLAY_INTERVAL_MS);
  }, [stopPlay, setAnno]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlay();
    } else {
      startPlay();
    }
  }, [playing, stopPlay, startPlay]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <main className="space-y-6 sm:space-y-10">
      <div className="space-y-4">
        <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
          Territori
        </h1>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="regione-select" className="block text-sm font-medium mb-1">
              Regione
            </label>
            <select id="regione-select" value={regione} onChange={(e) => setRegione(e.target.value)} className={SELETTORE}>
              {territori.map((r) => (
                <option key={r.nome} value={r.nome}>{r.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="provincia-select" className="block text-sm font-medium mb-1">
              Provincia
            </label>
            <select id="provincia-select" value={provincia} onChange={(e) => setProvincia(e.target.value)} className={SELETTORE}>
              {province.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <SceltaAnno
          legenda="Anno di mappa, classifica e tabella delle province"
          anni={ANNI}
          anno={annoTesto}
          onScelta={(a) => {
            stopPlay();
            setAnno(a);
          }}
        >
          <Pulsante
            onClick={togglePlay}
            aria-label={playing ? "Pausa animazione anni" : "Avvia animazione anni"}
            className="self-stretch"
          >
            {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </Pulsante>
        </SceltaAnno>

        <IndicePagina sezioni={SEZIONI} />
      </div>

      <hr />

      <Grafico
        id="mappa"
        titolo={`Mappa dei delitti denunciati, ${anno}`}
        sottotitolo="Ogni 1.000 abitanti; i triangoli segnano un aumento o un calo sull'anno precedente"
        fonte="delitti"
        parametri={{ anno }}
        altezza={CHART_HEIGHT_MAP + 200}
      >
        <ChartMappaRegioni anno={anno} />
      </Grafico>

      <hr />

      <Grafico
        id="regioni"
        titolo={`Delitti denunciati per regione, ${anno}`}
        sottotitolo="Ogni 1.000 abitanti; la linea tratteggiata è la media italiana, il quadratino ha il colore della regione nella mappa"
        fonte="delitti"
        parametri={{ anno }}
        altezza={CHART_HEIGHT_RANKING}
      >
        <ChartRankingRegioni anno={anno} />
      </Grafico>

      <hr />

      <Grafico
        id="regione"
        titolo={`Delitti denunciati, ${regione}, ${PERIODO_DELITTI}`}
        sottotitolo="A confronto con la media italiana"
        fonte="delitti"
        parametri={{ regione }}
        altezza={500}
      >
        <ChartTrendRegione regione={regione} />
      </Grafico>

      <hr />

      <Grafico
        id="province"
        titolo={`Delitti denunciati per provincia, ${anno}`}
        sottotitolo="Ogni 1.000 abitanti, con la variazione fra le medie triennali"
        fonte="delitti"
        parametri={{ anno }}
        altezza={480}
        immagine={false}
      >
        <ChartTabellaProvince anno={anno} />
      </Grafico>

      <hr />

      <Grafico
        id="provincia"
        titolo={`Delitti denunciati, ${nomeProvincia(provincia)}, ${PERIODO_DELITTI}`}
        sottotitolo={`A confronto con la media della regione (${regione})`}
        fonte="delitti"
        parametri={{ regione, provincia }}
        altezza={500}
      >
        <ChartTrendProvincia regione={regione} provincia={provincia} />
      </Grafico>
    </main>
  );
}
