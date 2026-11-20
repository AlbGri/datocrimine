import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { SintesiNazionale } from "@/components/charts/sintesi-nazionale";
import { ChartTrendNazionale } from "@/components/charts/chart-trend-nazionale";
import { Grafico } from "@/components/charts/grafico";
import { Fila, Riquadro } from "@/components/ui/riquadro";
import {
  PERIODO_DELITTI,
  ANNO_ULTIMO,
  TRIENNIO_INIZIALE,
  TRIENNIO_FINALE,
  TRIENNALE_PERIODI,
  varTriennale,
} from "@/lib/config";
import { fmtNum, fmtPct, fmtPctSigned, slug } from "@/lib/format";
import delittiItalia from "../../public/data/delitti_italia.json";
import percezione from "../../public/data/percezione_vs_dati.json";
import allarme from "../../public/data/reati_allarme_sociale.json";

export const metadata: Metadata = pageMetadata(
  "DatoCrimine - Dati ISTAT sulla criminalità in Italia",
  `Dati e analisi sulla criminalità in Italia ${PERIODO_DELITTI} con fonti ufficiali ISTAT`,
  "/",
);

// Stesso ordine dei colori in config.ts; il nome breve e' quello del riquadro
const REATI_ALLARME: [string, string][] = [
  ["Omicidi volontari consumati", "Omicidi volontari"],
  ["Tentati omicidi", "Tentati omicidi"],
  ["Violenze sessuali", "Violenze sessuali"],
  ["Rapine in abitazione", "Rapine in abitazione"],
  ["Atti sessuali con minorenne", "Atti sessuali con minorenne"],
  ["Sequestri di persona", "Sequestri di persona"],
];

const sulPrecedente = (valori: number[], anni: number[]) =>
  `${fmtPctSigned((valori[valori.length - 1] / valori[valori.length - 2] - 1) * 100)} sul ${anni[anni.length - 2]}`;

const varTasso = (serie: { anno: number; tasso: number }[]) => {
  const v = varTriennale(serie);
  return v === null ? "" : fmtPctSigned(v);
};

export default function Home() {
  const anni = delittiItalia.map((d) => d.Anno);
  const delitti = delittiItalia.map((d) => d.Delitti);
  const tassi = delittiItalia.map((d) => d.Tasso_per_1000);
  const ultimaPercezione = percezione[percezione.length - 1];

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
        <h1 className="text-[1.55rem] sm:text-[1.9rem] font-bold leading-[1.1] tracking-[-0.01em]">
          La criminalit&agrave; in Italia nei dati ISTAT
        </h1>
        <Link
          href={`/report/${ANNO_ULTIMO}`}
          className="rounded-md border border-foreground bg-evidenza px-3 py-1.5 text-[0.92rem] leading-tight font-bold text-su-evidenza"
        >
          Report {ANNO_ULTIMO}: cosa dicono i dati
        </Link>
      </div>

      <SintesiNazionale />

      <details className="border-t">
        <summary className="cursor-pointer py-1.5 font-bold">Cosa misurano questi dati</summary>
        <p className="mb-2.5">
          I dati si riferiscono ai delitti denunciati alle Forze dell&apos;ordine e non
          rappresentano la totalit&agrave; dei crimini commessi. Per approfondire il divario tra
          denunce e realt&agrave;, vedi{" "}
          <Link href="/numero-oscuro" className="rimando">
            Il numero oscuro
          </Link>
          .
        </p>
      </details>

      <Fila titolo="In breve">
        <Riquadro
          titolo={`Delitti denunciati ${ANNO_ULTIMO}`}
          href="#andamento"
          numero={fmtNum(delitti[delitti.length - 1])}
          nota={sulPrecedente(delitti, anni)}
          valori={delitti}
        />
        <Riquadro
          titolo={`Tasso ${ANNO_ULTIMO}`}
          href="#andamento"
          numero={fmtNum(tassi[tassi.length - 1], 1)}
          unita="per 1.000 ab."
          nota={sulPrecedente(tassi, anni)}
          valori={tassi}
        />
        <Riquadro
          titolo="Variazione del tasso"
          href="#andamento"
          numero={varTasso(delittiItalia.map((d) => ({ anno: d.Anno, tasso: d.Tasso_per_1000 })))}
          nota={`medie ${TRIENNALE_PERIODI}`}
        />
        <Riquadro
          titolo="Percezione della sicurezza"
          href="/percezione"
          numero={fmtPct(ultimaPercezione.Percezione_pct)}
          unita="delle famiglie"
          // Nessuna variazione: il salto 2014-2015 e' probabilmente un cambio di metodo dell'indagine
          nota={`nel ${ultimaPercezione.Anno}`}
          valori={percezione.map((p) => p.Percezione_pct)}
        />
        {/* id: i vecchi link a /#numero-oscuro arrivano qui */}
        <Riquadro
          id="numero-oscuro"
          titolo="Il numero oscuro"
          href="/numero-oscuro"
          nota="Quanti reati non arrivano a una denuncia."
        />
      </Fila>

      <Fila titolo="Tutti i dati" larghi>
        <Riquadro
          titolo="La tua provincia"
          href="/analisi-territoriale#province"
          nota="Tabella delle province con tasso e variazioni, da scaricare in CSV."
        />
        <Riquadro
          titolo="Regioni e province"
          href="/analisi-territoriale"
          nota="Mappa e andamento per regione e provincia."
        />
        <Riquadro
          titolo="Persone denunciate"
          href="/persone-denunciate"
          nota="Autori e vittime di reato per sesso, età e cittadinanza."
        />
        <Riquadro
          titolo="Analisi statistiche"
          href="/insights"
          nota="Tendenze verificate con test statistici, una scheda per risultato."
        />
      </Fila>

      <Fila
        titolo="Reati di allarme sociale"
        unita={`tasso per 100.000 abitanti nel ${ANNO_ULTIMO} e variazione fra le medie ${TRIENNIO_INIZIALE.join("-")} e ${TRIENNIO_FINALE.join("-")}`}
      >
        {REATI_ALLARME.map(([reato, titolo]) => {
          const serie = allarme.filter((d) => d.Reato === reato);
          return (
            <Riquadro
              key={reato}
              titolo={titolo}
              href={`/reati-allarme-sociale?reato=${slug(reato)}`}
              numero={fmtNum(serie[serie.length - 1].Tasso_per_100k, 2)}
              nota={varTasso(serie.map((d) => ({ anno: d.Anno, tasso: d.Tasso_per_100k })))}
              valori={serie.map((d) => d.Tasso_per_100k)}
            />
          );
        })}
      </Fila>

      <Fila titolo="Capire i dati" larghi>
        <Riquadro
          titolo="Guida alla lettura"
          href="/guida"
          nota="Cosa vuol dire un tasso, cosa non si può concludere, domande comuni."
        />
        <Riquadro titolo="Metodologia" href="/metodologia" nota="Fonti, calcoli e limiti dei dati." />
        <Riquadro
          titolo="Dati e codice"
          href="/dati-e-codice"
          nota="File elaborati da scaricare e codice aperto."
        />
      </Fila>

      <p>
        <strong>Chi fa questo sito:</strong> DatoCrimine &egrave; curato da Alberto Grippaldi, a
        titolo personale, senza finanziamenti n&eacute; pubblicit&agrave;.{" "}
        <Link href="/progetto" className="rimando">
          Chi c&apos;&egrave; dietro e come segnalare un errore
        </Link>
      </p>

      <Grafico
        id="andamento"
        titolo={`Delitti denunciati, Italia, ${PERIODO_DELITTI}`}
        sottotitolo="Totale o per tipologia di reato, ogni 1.000 abitanti o in numero"
        fonte="delitti"
        altezza={560}
      >
        <ChartTrendNazionale />
      </Grafico>
    </main>
  );
}
