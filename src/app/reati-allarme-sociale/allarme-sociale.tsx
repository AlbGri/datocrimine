"use client";

import { ChartAllarmeTrendNazionale } from "@/components/charts/chart-allarme-trend-nazionale";
import { ChartAllarmeRankingRegioni } from "@/components/charts/chart-allarme-ranking-regioni";
import { ChartAllarmeTrendRegione } from "@/components/charts/chart-allarme-trend-regione";
import { ChartAllarmeTabellaProvince } from "@/components/charts/chart-allarme-tabella-province";
import { ChartAllarmeTrendProvincia } from "@/components/charts/chart-allarme-trend-provincia";
import { Grafico } from "@/components/charts/grafico";
import { IndicePagina } from "@/components/ui/indice-pagina";
import { Pulsante } from "@/components/ui/pulsante";
import { useFetchData } from "@/lib/use-fetch-data";
import { useParametro } from "@/lib/use-parametro";
import { fmtPct, nomeProvincia } from "@/lib/format";
import { ANNI_DELITTI, CHART_HEIGHT_RANKING, PERIODO_DELITTI } from "@/lib/config";
import type { Regione } from "@/lib/territori";

const REATI = [
  "Atti sessuali con minorenne",
  "Omicidi volontari consumati",
  "Rapine in abitazione",
  "Sequestri di persona",
  "Tentati omicidi",
  "Violenze sessuali",
];

// Scelta editoriale: si parte dal dato senza numero oscuro, non dal primo in ordine alfabetico
const REATO_INIZIALE = "Omicidi volontari consumati";
const ANNI = ANNI_DELITTI.map(String);

const SEZIONI = [
  { id: "italia", titolo: "Andamento in Italia" },
  { id: "regioni", titolo: "Regioni a confronto" },
  { id: "regione", titolo: "Andamento della regione" },
  { id: "province", titolo: "Province a confronto" },
  { id: "provincia", titolo: "Andamento della provincia" },
];

type DelittiAnno = { Anno: number; Delitti: number };

// Quota dei reati di allarme sociale sul totale dei delitti, nell'ultimo anno
function quotaSulTotale(allarme: DelittiAnno[], italia: DelittiAnno[]) {
  const ultimo = italia.reduce((a, b) => (b.Anno > a.Anno ? b : a));
  const somma = allarme
    .filter((d) => d.Anno === ultimo.Anno)
    .reduce((tot, d) => tot + d.Delitti, 0);
  return { anno: ultimo.Anno, pct: (somma / ultimo.Delitti) * 100 };
}

const SELETTORE = "border rounded-md px-3 py-2 text-sm bg-background";

export function AllarmeSociale({ territori }: { territori: Regione[] }) {
  const [reato, setReato] = useParametro("reato", REATI, REATO_INIZIALE);
  const [annoTesto, setAnno] = useParametro("anno", ANNI, ANNI[ANNI.length - 1]);
  const anno = Number(annoTesto);
  const [regione, setRegione] = useParametro("regione", territori.map((r) => r.nome));
  const province = territori.find((r) => r.nome === regione)?.province ?? [];
  const [provincia, setProvincia] = useParametro("provincia", province);

  const { data: allarme } = useFetchData<DelittiAnno[]>("/data/reati_allarme_sociale.json");
  const { data: italia } = useFetchData<DelittiAnno[]>("/data/delitti_italia.json");
  const quota = allarme && italia ? quotaSulTotale(allarme, italia) : null;

  return (
    <main className="space-y-6 sm:space-y-10">
      <div>
        <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
          Reati di Allarme Sociale
        </h1>
        <p className="mt-2 text-muted-foreground">
          Focus su reati rari ma ad alto impatto: sono una piccola parte dei
          delitti denunciati
          {quota && ` (${fmtPct(quota.pct, 2)} nel ${quota.anno})`} ma dominano
          la percezione pubblica e la copertura mediatica. Tutti i dati si riferiscono a delitti denunciati alle forze
          dell&apos;ordine, non alla criminalit&agrave; reale.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="reato-select" className="block text-sm font-medium mb-1">
              Reato
            </label>
            <select id="reato-select" value={reato} onChange={(e) => setReato(e.target.value)} className={SELETTORE}>
              {REATI.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
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

        <fieldset>
          <legend className="block text-sm font-medium mb-1">
            Anno di classifica e tabella
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {ANNI.map((a) => (
              <Pulsante key={a} onClick={() => setAnno(a)} premuto={annoTesto === a}>
                {a}
              </Pulsante>
            ))}
          </div>
        </fieldset>

        <IndicePagina sezioni={SEZIONI} />
      </div>

      <hr />

      <Grafico
        id="italia"
        titolo={`${reato}, Italia, ${PERIODO_DELITTI}`}
        sottotitolo="In chiaro, per confronto, gli altri reati di allarme sociale"
        fonte="delitti"
        parametri={{ reato }}
        altezza={470}
      >
        <ChartAllarmeTrendNazionale reatoSelezionato={reato} />
      </Grafico>

      <hr />

      <Grafico
        id="regioni"
        titolo={`${reato} per regione, ${anno}`}
        sottotitolo="Ogni 100.000 abitanti; la linea tratteggiata è la media italiana"
        fonte="delitti"
        parametri={{ reato, anno }}
        altezza={CHART_HEIGHT_RANKING}
      >
        <ChartAllarmeRankingRegioni anno={anno} reato={reato} />
      </Grafico>

      <hr />

      <Grafico
        id="regione"
        titolo={`${reato}, ${regione}, ${PERIODO_DELITTI}`}
        sottotitolo="A confronto con la media italiana"
        fonte="delitti"
        parametri={{ reato, regione }}
        altezza={470}
      >
        <ChartAllarmeTrendRegione reato={reato} regione={regione} />
      </Grafico>

      <hr />

      <Grafico
        id="province"
        titolo={`${reato} per provincia, ${anno}`}
        sottotitolo="Ogni 100.000 abitanti, con la variazione fra le medie triennali"
        fonte="delitti"
        parametri={{ reato, anno }}
        altezza={420}
        immagine={false}
      >
        <ChartAllarmeTabellaProvince anno={anno} reato={reato} />
      </Grafico>

      <hr />

      <Grafico
        id="provincia"
        titolo={`${reato}, ${nomeProvincia(provincia)}, ${PERIODO_DELITTI}`}
        sottotitolo={`A confronto con la media della regione (${regione})`}
        fonte="delitti"
        parametri={{ reato, regione, provincia }}
        altezza={470}
      >
        <ChartAllarmeTrendProvincia reato={reato} regione={regione} provincia={provincia} />
      </Grafico>

      <hr />

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <strong>Nota metodologica:</strong> tutti i tassi sono calcolati sui
          delitti denunciati e sulla popolazione residente. Per reati rari (es.
          omicidi in regioni piccole), poche unit&agrave; di differenza possono
          causare variazioni percentuali significative. Confrontare sempre i
          valori assoluti.
      </div>
    </main>
  );
}
