import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Dati e Codice Sorgente",
  "Fonti dati ISTAT, dataset scaricabili e codice sorgente di DatoCrimine.",
  "/dati-e-codice",
);

export default function DatiECodice() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8 space-y-8">
      <h1 className="text-2xl sm:text-4xl font-bold">
        Dati e Codice Sorgente
      </h1>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">Repository</h2>
        <p>
          Tutto il codice sorgente, i dati elaborati e la documentazione sono
          disponibili su GitHub:{" "}
          <a
            href="https://github.com/AlbGri/datocrimine"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            github.com/AlbGri/datocrimine
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Fonti ISTAT
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-semibold">Dataset</th>
                <th className="text-left py-2 pr-4 font-semibold">Periodo</th>
                <th className="text-left py-2 font-semibold">Sezioni</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <a
                    href="https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,Z0840JUS,1.0/JUS_CRIMINAL/DCCV_DELITTIPS/IT1,73_67_DF_DCCV_DELITTIPS_1,1.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    DCCV_DELITTIPS
                  </a>
                  <br />
                  <span className="text-xs">Delitti denunciati per provincia</span>
                </td>
                <td className="py-2 pr-4">2014-2024</td>
                <td className="py-2">Il contesto, Analisi Territoriale, Allarme Sociale</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <a
                    href="https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,Z0840JUS,1.0/JUS_CRIMINAL/DCCV_AUTVITTPS/IT1,73_230_DF_DCCV_AUTVITTPS_7,1.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    DCCV_AUTVITTPS
                  </a>
                  <br />
                  <span className="text-xs">Autori denunciati e vittime di delitto</span>
                </td>
                <td className="py-2 pr-4">2007-2024</td>
                <td className="py-2">Persone Denunciate</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  BES / Multiscopo ISTAT
                  <br />
                  <span className="text-xs">Percezione sicurezza famiglie</span>
                </td>
                <td className="py-2 pr-4">2014-2024</td>
                <td className="py-2">Il contesto (percezione vs dati)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  DCIS_POPRES1 / Ricostruzione intercensuaria
                  <br />
                  <span className="text-xs">Popolazione residente</span>
                </td>
                <td className="py-2 pr-4">2014-2025</td>
                <td className="py-2">Normalizzazione tassi per abitante</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Pipeline di elaborazione
        </h2>
        <p>
          I dati raw ISTAT vengono trasformati in JSON tramite script Python.
          I JSON risultanti sono committati nel repository e consumati
          direttamente dal frontend.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-semibold">Script</th>
                <th className="text-left py-2 pr-4 font-semibold">Input</th>
                <th className="text-left py-2 font-semibold">Output</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">generate_delittips.py</td>
                <td className="py-2 pr-4 text-xs">
                  CSV raw ISTAT DELITTIPS + popolazione
                </td>
                <td className="py-2 text-xs">
                  7 CSV in data/processed/,
                  reati_allarme_sociale_regioni.json,
                  reati_allarme_sociale_province.json
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">csv_to_json.py</td>
                <td className="py-2 pr-4 text-xs">
                  6 CSV in data/processed/
                </td>
                <td className="py-2 text-xs">
                  delitti_italia.json, delitti_regioni.json,
                  delitti_province.json, delitti_categorie.json,
                  percezione_vs_dati.json, reati_allarme_sociale.json
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">generate_popolazione.py</td>
                <td className="py-2 pr-4 text-xs">
                  2 fonti ISTAT popolazione (intercensuaria 2014-2018, POPRES1 dal 2019)
                </td>
                <td className="py-2 text-xs">
                  popolazione_regioni_province.csv
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">generate_autori_vittime.py</td>
                <td className="py-2 pr-4 text-xs">
                  CSV raw AUTVITTPS (DF_7 + DF_8)
                </td>
                <td className="py-2 text-xs">
                  autori_vittime_trend.json,
                  autori_vittime_regioni.json,
                  autori_vittime_reati.json,
                  autori_vittime_province.json,
                  reati_gerarchia.json
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">generate_insights.py</td>
                <td className="py-2 pr-4 text-xs">
                  JSON in public/data/ + popolazione CSV
                </td>
                <td className="py-2 text-xs">
                  insights_candidates.csv (4.537 combinazioni analizzate, 2.215 oltre le soglie di
                  rilevanza, 9 test statistici),
                  insights_categorie.json, insights_ripartizioni.json
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">generate_report.py</td>
                <td className="py-2 pr-4 text-xs">
                  JSON in public/data/
                </td>
                <td className="py-2 text-xs">
                  report_2024.json (report annuale interattivo)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Replicare l&apos;analisi
        </h2>
        <p className="text-sm text-muted-foreground">
          Il frontend si avvia con Node.js. Per rigenerare i JSON dai dati
          raw serve anche Python con conda.
        </p>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`# Frontend
git clone https://github.com/AlbGri/datocrimine.git
cd datocrimine
npm install
npm run dev

# Scaricare i dati grezzi dall'ISTAT (può richiedere molto tempo:
# il servizio accetta poche richieste al minuto)
conda activate osservatorio
python scripts/download_popolazione.py
python scripts/download_delittips.py
python scripts/download_autvittps.py

# Rigenerare JSON (richiede conda + environment osservatorio)
python scripts/generate_popolazione.py
python scripts/generate_delittips.py
python scripts/generate_autori_vittime.py
python scripts/csv_to_json.py
python scripts/generate_insights.py
python scripts/generate_report.py`}</code>
        </pre>
        <p className="text-sm text-muted-foreground">
          I dati grezzi ISTAT (circa 185 MB) non sono nel repository per le
          dimensioni: si scaricano con i tre script <code>download_*.py</code>. La
          popolazione 2014-2018 (ricostruzione intercensuaria) &egrave; gi&agrave; nel
          repository, in <code>data/raw/popolazione/</code>. I JSON elaborati sono
          gi&agrave; inclusi.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">Licenze</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Codice</strong>:{" "}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              AGPL-3.0
            </a>
          </li>
          <li>
            <strong>Documentazione e testi</strong>:{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              CC BY-NC-ND 4.0
            </a>
          </li>
          <li>
            <strong>Dati ISTAT</strong>:{" "}
            <a
              href="https://creativecommons.org/licenses/by/3.0/it/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              CC BY 3.0 IT
            </a>{" "}
            - elaborati da DatoCrimine
          </li>
        </ul>
      </section>
    </main>
  );
}
