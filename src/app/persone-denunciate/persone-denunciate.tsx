"use client";

import Link from "next/link";
import { KpiAutoriVittime } from "@/components/charts/kpi-autori-vittime";
import { ChartProfiloNazionale } from "@/components/charts/chart-profilo-nazionale";
import { ChartAutoriVsVittime } from "@/components/charts/chart-autori-vs-vittime";
import { ChartAutoriTrend } from "@/components/charts/chart-autori-trend";
import { ChartAutoriRankingRegioni } from "@/components/charts/chart-autori-ranking-regioni";
import { ChartProfiloTerritorio } from "@/components/charts/chart-profilo-territorio";
import { ChartAutoriTrendRegione } from "@/components/charts/chart-autori-trend-regione";
import { ChartAutoriTabellaProvince } from "@/components/charts/chart-autori-tabella-province";
import { ChartProfiloProvincia } from "@/components/charts/chart-profilo-provincia";
import { ChartAutoriTrendProvincia } from "@/components/charts/chart-autori-trend-provincia";
import { Grafico } from "@/components/charts/grafico";
import { IndicePagina } from "@/components/ui/indice-pagina";
import { Pulsante } from "@/components/ui/pulsante";
import { useParametro } from "@/lib/use-parametro";
import { nomeProvincia } from "@/lib/format";
import { ANNO_ULTIMO_AUTORI, CHART_HEIGHT_RANKING, PERIODO_AUTORI } from "@/lib/config";
import { CHI, type DataType } from "@/lib/persone";
import type { Regione } from "@/lib/territori";

const TIPI: DataType[] = ["OFFEND", "VICTIM"];

const SEZIONI = [
  { id: "italia", titolo: "Andamento in Italia" },
  { id: "reati-italia", titolo: "Reati in Italia" },
  { id: "autori-vittime", titolo: "Autori e vittime" },
  { id: "regioni", titolo: "Regioni a confronto" },
  { id: "regione", titolo: "Andamento della regione" },
  { id: "reati-regione", titolo: "Reati nella regione" },
  { id: "province", titolo: "Province a confronto" },
  { id: "province-regione", titolo: "Province della regione" },
  { id: "reati-provincia", titolo: "Reati nella provincia" },
];

const SELETTORE = "border rounded-md px-3 py-2 text-sm bg-background";

export function PersoneDenunciate({ territori }: { territori: Regione[] }) {
  const [chiEtichetta, setChi] = useParametro("chi", TIPI.map((t) => CHI[t].etichetta));
  const dataType = TIPI.find((t) => CHI[t].etichetta === chiEtichetta) ?? "OFFEND";
  const chi = CHI[dataType];
  const [regione, setRegione] = useParametro("regione", territori.map((r) => r.nome));
  const province = territori.find((r) => r.nome === regione)?.province ?? [];
  const [provincia, setProvincia] = useParametro("provincia", province);

  return (
    <main className="space-y-6 sm:space-y-10">
      <div className="space-y-4">
        <div>
          <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
            Persone Denunciate
          </h1>
          <p className="mt-2 text-muted-foreground">
            Autori denunciati/arrestati e vittime di delitto per cittadinanza,
            et&agrave; e tipo di reato. Fonte: ISTAT DCCV_AUTVITTPS ({PERIODO_AUTORI} per singoli
            reati, 2007-2022 per il totale).
          </p>
        </div>
        <div className="flex gap-1.5">
          {TIPI.map((t) => (
            <Pulsante key={t} onClick={() => setChi(CHI[t].etichetta)} premuto={dataType === t}>
              {CHI[t].etichetta}
            </Pulsante>
          ))}
        </div>
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
        <IndicePagina sezioni={SEZIONI} />
      </div>

      {dataType === "VICTIM" && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <strong>Nota:</strong> per le vittime il dato aggregato (totale per tutti i reati)
            non &egrave; disponibile. Le analisi sono basate sui singoli reati.
            Una stessa vittima pu&ograve; comparire in pi&ugrave; tipologie.
        </div>
      )}

      <KpiAutoriVittime dataType={dataType} />

      <hr />

      <Grafico
        id="italia"
        titolo={`${chi.soggetto}, Italia, ${PERIODO_AUTORI}`}
        sottotitolo="Il numero sull'asse di sinistra; le quote di stranieri, maschi, femmine e minori sull'asse di destra"
        fonte="autori"
        parametri={{ chi: chi.etichetta }}
        altezza={520}
      >
        <ChartAutoriTrend dataType={dataType} />
      </Grafico>

      <hr />

      <Grafico
        id="reati-italia"
        titolo={`${chi.soggetto} per reato, Italia, ${ANNO_ULTIMO_AUTORI}`}
        sottotitolo="Ogni 100.000 abitanti o quota sul totale, secondo la misura scelta"
        fonte="autori"
        parametri={{ chi: chi.etichetta }}
        altezza={600}
      >
        <ChartProfiloNazionale dataType={dataType} />
      </Grafico>

      <hr />

      <Grafico
        id="autori-vittime"
        titolo={`Autori denunciati per ogni vittima, per reato, Italia, ${ANNO_ULTIMO_AUTORI}`}
        sottotitolo="Sopra 1 più autori che vittime (reati con più autori), sotto 1 più vittime che autori identificati"
        fonte="autori"
        altezza={600}
      >
        <ChartAutoriVsVittime />
      </Grafico>

      <hr />

      <Grafico
        id="regioni"
        titolo={`${chi.soggetto} per regione, ${ANNO_ULTIMO_AUTORI}`}
        sottotitolo="La linea tratteggiata è la media italiana"
        fonte="autori"
        parametri={{ chi: chi.etichetta }}
        altezza={CHART_HEIGHT_RANKING + 80}
      >
        <ChartAutoriRankingRegioni dataType={dataType} />
      </Grafico>

      <hr />

      <Grafico
        id="regione"
        titolo={`${chi.soggetto}, ${regione}, ${PERIODO_AUTORI}`}
        sottotitolo="A confronto con la media italiana; le quote sull'asse di destra"
        fonte="autori"
        parametri={{ chi: chi.etichetta, regione }}
        altezza={500}
      >
        <ChartAutoriTrendRegione dataType={dataType} regione={regione} />
      </Grafico>

      <hr />

      <Grafico
        id="reati-regione"
        titolo={`${chi.soggetto} per reato, ${regione}, ${ANNO_ULTIMO_AUTORI}`}
        sottotitolo="A confronto con la media italiana, segnata da un trattino"
        fonte="autori"
        parametri={{ chi: chi.etichetta, regione }}
        altezza={CHART_HEIGHT_RANKING + 80}
      >
        <ChartProfiloTerritorio dataType={dataType} regione={regione} />
      </Grafico>

      <hr />

      <Grafico
        id="province"
        titolo={`${chi.soggetto} per provincia, ${ANNO_ULTIMO_AUTORI}`}
        sottotitolo="Totale, stranieri e minori; il dato provinciale c'è dal 2022"
        fonte="autori"
        parametri={{ chi: chi.etichetta }}
        altezza={400}
        immagine={false}
      >
        <ChartAutoriTabellaProvince dataType={dataType} />
      </Grafico>

      <hr />

      <Grafico
        id="province-regione"
        titolo={`${chi.soggetto} per provincia, ${regione}`}
        sottotitolo="Numero per anno e variazione dal primo all'ultimo"
        fonte="autori"
        parametri={{ chi: chi.etichetta, regione }}
        altezza={400}
        immagine={false}
      >
        <ChartAutoriTrendProvincia dataType={dataType} regione={regione} />
      </Grafico>

      <hr />

      <Grafico
        id="reati-provincia"
        titolo={`${chi.soggetto} per reato, ${nomeProvincia(provincia)}, ${ANNO_ULTIMO_AUTORI}`}
        sottotitolo="A confronto con la media italiana, segnata da un trattino"
        fonte="autori"
        parametri={{ chi: chi.etichetta, regione, provincia }}
        altezza={CHART_HEIGHT_RANKING + 80}
      >
        <ChartProfiloProvincia dataType={dataType} provincia={provincia} />
      </Grafico>

      <hr />

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <strong>Nota metodologica:</strong> i dati riguardano persone denunciate o
          arrestate dalle forze dell&apos;ordine, non condannate. Una stessa persona
          pu&ograve; comparire pi&ugrave; volte se coinvolta in pi&ugrave; procedimenti.
          Il dato provinciale &egrave; disponibile solo dal 2022.
          Per approfondimenti si rimanda alla{" "}
          <Link href="/metodologia" className="rimando">nota metodologica</Link>.
      </div>
    </main>
  );
}
