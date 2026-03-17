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
            href="https://github.com/AlbGri/osservatorio-criminalita-next"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            github.com/AlbGri/osservatorio-criminalita-next
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
                <td className="py-2">Home, Analisi Territoriale, Allarme Sociale</td>
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
                <td className="py-2 pr-4">2007-2022</td>
                <td className="py-2">Persone Denunciate</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  BES / Multiscopo ISTAT
                  <br />
                  <span className="text-xs">Percezione sicurezza famiglie</span>
                </td>
                <td className="py-2 pr-4">2014-2024</td>
                <td className="py-2">Home (percezione vs dati)</td>
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
                  6 CSV in data/processed/,
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
                <td className="py-2 pr-4 font-mono text-xs">generate_autori_vittime.py</td>
                <td className="py-2 pr-4 text-xs">
                  CSV raw AUTVITTPS (DF_7 + DF_8)
                </td>
                <td className="py-2 text-xs">
                  autori_vittime_trend.json,
                  autori_vittime_reati.json,
                  autori_vittime_province.json
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
git clone https://github.com/AlbGri/osservatorio-criminalita-next.git
cd osservatorio-criminalita-next
npm install
npm run dev

# Rigenerare JSON (richiede conda + environment osservatorio)
conda activate osservatorio
python scripts/generate_delittips.py
python scripts/csv_to_json.py
python scripts/generate_autori_vittime.py`}</code>
        </pre>
        <p className="text-sm text-muted-foreground">
          I dati raw ISTAT (CSV ~80 MB) non sono nel repository per dimensioni.
          Sono rigenerabili scaricandoli dalle fonti ISTAT indicate sopra.
          I JSON processati sono gi&agrave; inclusi nel repository.
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
            - elaborati da Osservatorio Criminalit&agrave;
          </li>
        </ul>
      </section>
    </main>
  );
}
