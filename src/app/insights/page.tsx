import { CollapsibleSection } from "@/components/ui/collapsible-section";

export default function Insights() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8 space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-4xl font-bold">Insights</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
          <p>
            <strong>Sezione sperimentale.</strong> Gli insight sono estratti
            tramite analisi statistica automatizzata sui dati ISTAT e curati con
            l&apos;assistenza di intelligenza artificiale. I risultati
            evidenziano correlazioni e trend statisticamente significativi, ma{" "}
            <strong>non implicano causalit&agrave;</strong>.
          </p>
          <p>
            I dati riflettono le denunce alle forze dell&apos;ordine, non i
            crimini reali. Variazioni nei numeri possono dipendere da
            cambiamenti nella propensione alla denuncia, nelle norme o nelle
            pratiche investigative. Interpretare con cautela.
          </p>
        </div>
      </div>

      {/* ================================================================
          TREND STRUTTURALI
          ================================================================ */}
      <CollapsibleSection
        title="Trend strutturali"
        description="Fenomeni di lungo periodo con direzione costante negli ultimi 10-17 anni"
        defaultOpen
      >
        <div className="space-y-6">
          <InsightCard
            title="Rapine in banca: un reato in via di estinzione"
            confidence="alta"
            period="2007-2024"
          >
            <p>
              Gli autori denunciati per rapine in banca sono passati da 2.893 a
              367, con un calo quasi ininterrotto nel tempo. La
              digitalizzazione dei servizi bancari e il rafforzamento delle
              misure di sicurezza fisiche hanno reso questo reato sempre meno
              praticabile.
            </p>
          </InsightCard>

          <InsightCard
            title="Stalking: emersione costante del fenomeno"
            confidence="alta"
            period="2009-2023"
          >
            <p>
              Le vittime di atti persecutori (stalking) sono passate da circa
              5.000 a oltre 18.000 (+264%), con una crescita quasi costante
              anno dopo anno. L&apos;introduzione del reato nel 2009 (art.
              612-bis c.p.) e le successive campagne di sensibilizzazione hanno
              progressivamente ridotto il numero oscuro, portando pi&ugrave;
              vittime a denunciare.
            </p>
            <Caveat>
              L&apos;aumento delle denunce &egrave; un indicatore di
              emersione, non necessariamente di aumento del fenomeno reale.
            </Caveat>
          </InsightCard>

          <InsightCard
            title="Truffe e frodi informatiche: il reato del decennio"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Le vittime di truffe e frodi informatiche sono pi&ugrave; che
              raddoppiate: da 109.000 a 236.000. Gli autori denunciati sono
              passati da 46.000 a 73.000. Il fenomeno &egrave; uniforme su
              tutto il territorio: in 64 regioni-reato su 88 analizzate, il
              trend regionale &egrave; significativamente crescente.
            </p>
          </InsightCard>

          <InsightCard
            title="Omicidi volontari in calo strutturale"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Gli autori denunciati per omicidio volontario sono scesi da 1.199
              a 771 (-36%), le vittime da 631 a 328 (-48%). Il calo include
              gli omicidi di tipo mafioso, passati da 476 a 130 autori
              denunciati. Il trend &egrave; coerente con la tendenza europea di
              lungo periodo.
            </p>
          </InsightCard>

          <InsightCard
            title="Sequestri di persona dimezzati"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Autori denunciati passati da 2.355 a 1.185, vittime da 2.095 a
              737. Il calo &egrave; presente in circa 3 anni su 4, un reato che
              ha perso progressivamente attrattivit&agrave; criminale.
            </p>
          </InsightCard>

          <InsightCard
            title="Usura: le denunce crollano, ma il sommerso resta"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Gli autori denunciati per usura sono passati da 1.392 a 495, le
              vittime da 298 a 106. Un calo marcato che va letto con
              cautela.
            </p>
            <Caveat>
              L&apos;usura ha uno dei numeri oscuri pi&ugrave; alti tra tutti i
              reati: le vittime raramente denunciano per paura di ritorsioni o
              perch&eacute; coinvolte in situazioni di illegalit&agrave;. Il
              calo delle denunce non implica un calo del fenomeno.
            </Caveat>
          </InsightCard>

          <InsightCard
            title="Estorsioni: pi&ugrave; vittime, meno stranieri coinvolti"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Le vittime di estorsione sono aumentate del 70%, da 6.704 a
              11.433. Contemporaneamente, la percentuale di vittime straniere
              &egrave; scesa dal 16,4% all&apos;8,8%. L&apos;estorsione colpisce
              in misura crescente cittadini italiani.
            </p>
          </InsightCard>
        </div>
      </CollapsibleSection>

      {/* ================================================================
          COMPOSIZIONE DEMOGRAFICA
          ================================================================ */}
      <CollapsibleSection
        title="Composizione demografica"
        description="Come cambia il profilo di autori e vittime nel tempo"
      >
        <div className="space-y-6">
          <InsightCard
            title="Rapine: la quota di autori stranieri raddoppia"
            confidence="alta"
            period="2007-2024"
          >
            <p>
              La percentuale di autori stranieri denunciati per rapine &egrave;
              passata dal 35,5% al 52,4% (+16,9 punti percentuali). Il trend
              &egrave; coerente su tutte le tipologie: rapine in strada (47%
              &rarr; 60%), in esercizi commerciali (36% &rarr; 50%). Anche tra
              le vittime di rapina, la quota di stranieri &egrave; salita dal
              14% al 26%, con un aumento quasi costante anno dopo anno.
            </p>
            <Caveat>
              Il dato riflette le denunce, non necessariamente la
              criminalit&agrave; reale. Fattori come la maggiore visibilit&agrave;
              e le pratiche di controllo differenziate possono influenzare la
              composizione degli autori denunciati.
            </Caveat>
          </InsightCard>

          <InsightCard
            title="Furti con destrezza: ribaltamento di genere tra le vittime"
            confidence="media"
            period="2008-2024"
          >
            <p>
              La percentuale di vittime donne di furti con destrezza
              (borseggi) &egrave; scesa dall&apos;81% al 54%, quella degli
              uomini &egrave; salita dal 19% al 46%. &Egrave; la tendenza
              pi&ugrave; regolare dell&apos;intero dataset: in oltre 9 anni su
              10 il valore si muove nella stessa direzione.
              Contemporaneamente, la quota di autori stranieri &egrave; salita
              dal 34% al 61%.
            </p>
          </InsightCard>

          <InsightCard
            title="Cybercrimine: convergenza di genere"
            confidence="media"
            period="2008-2024"
          >
            <p>
              Tra le vittime di delitti informatici, le donne sono passate dal
              34% al 49,6%, sfiorando la parit&agrave; con gli uomini. Per
              truffe e frodi informatiche le vittime donne sono cresciute dal
              34,5% al 43,4%, con un aumento quasi costante nel tempo. Il
              cybercrimine diventa progressivamente trasversale al genere.
            </p>
          </InsightCard>

          <InsightCard
            title="Omicidi: la quota di vittime donne cresce"
            confidence="media"
            period="2008-2024"
          >
            <p>
              Le vittime donne di omicidio volontario sono passate dal 24% al
              34,5% del totale (+10,5 punti percentuali). Gli omicidi calano
              complessivamente, ma calano di pi&ugrave; quelli con vittime
              maschili. Il dato &egrave; coerente con l&apos;attenzione
              crescente al tema dei femminicidi e con il calo degli omicidi
              legati alla criminalit&agrave; organizzata (prevalentemente
              maschili).
            </p>
          </InsightCard>

          <InsightCard
            title="Violenze sessuali: il tasso sale, la quota di vittime straniere scende"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Il tasso di violenze sessuali denunciate &egrave; aumentato da
              7,0 a 11,6 per 100.000 abitanti. Contemporaneamente, la
              percentuale di vittime straniere &egrave; scesa dal 31% al 22,5%
              (-8,5 punti percentuali).
            </p>
            <Caveat>
              L&apos;aumento delle denunce riflette principalmente campagne di
              sensibilizzazione (es. #MeToo) e maggiore fiducia nelle
              istituzioni. &Egrave; un segnale positivo di emersione del
              sommerso, non necessariamente di aumento del fenomeno.
            </Caveat>
          </InsightCard>

          <InsightCard
            title="Incendi dolosi: pi&ugrave; autori e pi&ugrave; stranieri"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Gli autori denunciati per incendi dolosi sono aumentati di 607
              unit&agrave;, e la percentuale di autori stranieri &egrave; salita
              dal 17,4% al 34% (+16,6 punti percentuali). Trend significativo
              su entrambe le dimensioni.
            </p>
          </InsightCard>
        </div>
      </CollapsibleSection>

      {/* ================================================================
          ANOMALIE E DIVERGENZE
          ================================================================ */}
      <CollapsibleSection
        title="Anomalie e divergenze"
        description="Pattern inattesi, divergenze territoriali e confronti tra fenomeni"
      >
        <div className="space-y-6">
          <InsightCard
            title="Percezione e realt&agrave;: direzioni indipendenti"
            confidence="media"
            period="2014-2024"
          >
            <p>
              Il tasso di delitti denunciati non mostra una tendenza chiara
              (da 46,6 a 40,7 per 1.000 abitanti). La percezione di
              insicurezza delle famiglie
              ha avuto un andamento indipendente: picco al 41% nel 2015, discesa
              al 21% nel 2021, risalita al 27% nel 2024. La correlazione tra le
              due serie &egrave; debole.
            </p>
            <Caveat>
              La percezione di insicurezza &egrave; influenzata dalla copertura
              mediatica, dal clima politico e da fattori locali che i dati
              aggregati non catturano. Il salto 2014-2015 potrebbe riflettere
              un cambio metodologico ISTAT.
            </Caveat>
          </InsightCard>

          <InsightCard
            title="Violenze sessuali: divergenza regionale crescente"
            confidence="media"
            period="2007-2024"
          >
            <p>
              La dispersione dei tassi di violenze sessuali tra regioni
              aumenta significativamente nel tempo, sia per gli autori sia per
              le vittime. Il fenomeno non &egrave; uniforme sul territorio: alcune
              regioni mostrano aumenti marcati, altre stagnazione. Questo
              pu&ograve; riflettere differenze nella propensione alla denuncia
              pi&ugrave; che nella diffusione del reato.
            </p>
          </InsightCard>

          <InsightCard
            title="Reati fisici e digitali: due velocit&agrave; investigative"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Per i reati fisici, il rapporto tra autori identificati e vittime
              migliora costantemente: nelle rapine passa da 0,45 a 1,05 (oggi
              si identifica pi&ugrave; di un autore per ogni vittima), nelle
              rapine in esercizi commerciali da 0,64 a 1,87. Per i reati
              digitali accade l&apos;opposto: nei delitti informatici il
              rapporto crolla da 0,29 a 0,08 (un autore ogni 12 vittime), nelle
              truffe da 0,43 a 0,31. Le vittime digitali crescono molto
              pi&ugrave; velocemente della capacit&agrave; di identificare gli
              autori.
            </p>
          </InsightCard>
        </div>
      </CollapsibleSection>

      {/* ================================================================
          CONFRONTI TRA CATEGORIE
          ================================================================ */}
      <CollapsibleSection
        title="Confronti tra categorie di reati"
        description="Come si muovono le macro-categorie (violenti, patrimoniali, informatici) l'una rispetto all'altra"
      >
        <div className="space-y-6">
          <InsightCard
            title="Reati informatici vs patrimoniali: il sorpasso tra le vittime"
            confidence="media"
            period="2007-2024"
          >
            <p>
              La differenza nel numero di vittime tra reati patrimoniali e
              informatici si riduce significativamente nel tempo: le vittime di
              reati informatici crescono molto pi&ugrave; velocemente di quelle
              dei reati patrimoniali tradizionali (cambio: -1.018.000 nella
              differenza). Le truffe online stanno erodendo la predominanza
              dei furti fisici.
            </p>
          </InsightCard>

          <InsightCard
            title="Reati violenti vs patrimoniali: le vittime divergono"
            confidence="media"
            period="2007-2024"
          >
            <p>
              La differenza nel numero di vittime tra reati violenti e
              patrimoniali cresce significativamente (+900.000): i reati
              patrimoniali calano pi&ugrave; di quelli violenti. Il profilo
              complessivo della criminalit&agrave; denunciata si sta
              spostando: meno reati contro il patrimonio, tenuta dei reati
              contro la persona.
            </p>
          </InsightCard>

          <InsightCard
            title="Autori stranieri: pi&ugrave; concentrati nei reati violenti"
            confidence="media"
            period="2007-2024"
          >
            <p>
              La differenza nella percentuale di autori stranieri tra reati
              violenti e informatici &egrave; in crescita (+9,2 punti
              percentuali): la quota di stranieri aumenta pi&ugrave; nei reati
              violenti che in quelli informatici, dove anzi diminuisce (dal
              37% al 20%).
            </p>
            <Caveat>
              La composizione degli autori denunciati riflette anche pratiche
              di controllo differenziate e differente visibilit&agrave; dei
              reati, non solo la reale distribuzione della criminalit&agrave;.
            </Caveat>
          </InsightCard>
        </div>
      </CollapsibleSection>

      {/* ================================================================
          CONFRONTI TERRITORIALI
          ================================================================ */}
      <CollapsibleSection
        title="Confronti territoriali"
        description="Come divergono Nord, Centro e Sud nel tempo per reati e dimensioni demografiche"
      >
        <div className="space-y-6">
          <InsightCard
            title="Rapine: il gap Nord-Sud si inverte"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Il tasso di rapine (vittime) al Nord cresce rispetto al Sud
              in modo costante, con la differenza che aumenta in circa 3 anni
              su 4. Sia nel confronto Nord vs Sud (+63 per 100k) sia Centro vs
              Sud (+61 per 100k). Il tradizionale divario con il Mezzogiorno si
              sta riducendo o invertendo per questo tipo di reato.
            </p>
          </InsightCard>

          <InsightCard
            title="Truffe informatiche: il Nord corre di pi&ugrave;"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Il tasso di truffe e frodi informatiche (vittime) al Nord
              cresce pi&ugrave; che al Sud (+118 per 100k nella differenza).
              Anche per gli autori, il divario Nord-Sud aumenta (+85 per 100k),
              con la differenza che cresce in 2 anni su 3. La digitalizzazione
              pi&ugrave; avanzata espone a maggiore vittimizzazione
              informatica.
            </p>
          </InsightCard>

          <InsightCard
            title="Violenze sessuali: il Nord supera il Sud"
            confidence="media"
            period="2007-2024"
          >
            <p>
              Il tasso di autori denunciati per violenze sessuali al Nord
              cresce significativamente rispetto al Sud (+2,3 per 100k) e al
              Centro (+1,8 per 100k). Il divario si amplia anche per le
              vittime.
            </p>
            <Caveat>
              Questa divergenza potrebbe riflettere una maggiore propensione
              alla denuncia al Nord pi&ugrave; che una reale differenza nei
              tassi di violenza. Il numero oscuro delle violenze sessuali
              &egrave; molto alto e varia per territorio.
            </Caveat>
          </InsightCard>

          <InsightCard
            title="Autori stranieri per stupefacenti: divario Nord-Sud crescente"
            confidence="media"
            period="2007-2024"
          >
            <p>
              La differenza nella percentuale di autori stranieri per
              stupefacenti tra Nord e Sud cresce di circa 10 punti percentuali,
              con un aumento presente in 2 anni su 3. Al Nord la quota di
              autori stranieri per droga aumenta molto pi&ugrave; che al Sud,
              coerentemente con la diversa composizione demografica dei
              territori.
            </p>
          </InsightCard>
        </div>
      </CollapsibleSection>

      {/* ================================================================
          NOTA METODOLOGICA
          ================================================================ */}
      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-semibold text-primary">
          Nota metodologica
        </h2>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>
            Gli insight sono stati estratti analizzando sistematicamente{" "}
            <strong>2.209 combinazioni</strong> di reato, dimensione
            demografica, territorio e periodo temporale. Su queste combinazioni
            sono stati applicati i seguenti test statistici:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>
                <a
                  href="https://en.wikipedia.org/wiki/Mann%E2%80%93Kendall_trend_test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Test di Mann-Kendall
                </a>
              </strong>
              : verifica se una serie temporale ha una tendenza costante nel
              tempo (crescente o decrescente), anche in presenza di oscillazioni
              occasionali
            </li>
            <li>
              <strong>
                <a
                  href="https://en.wikipedia.org/wiki/Theil%E2%80%93Sen_estimator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Stimatore Theil-Sen
                </a>
              </strong>
              : stima la velocit&agrave; del cambiamento calcolando la
              pendenza mediana tra tutte le coppie di punti, ignorando i valori
              estremi
            </li>
            <li>
              <strong>Anomalia dell&apos;ultimo anno</strong>: misura quanto il
              valore pi&ugrave; recente si discosta dalla media storica della
              serie. Identifica picchi o crolli insoliti nell&apos;ultimo anno
              disponibile
            </li>
            <li>
              <strong>Stabilit&agrave; della serie</strong>: misura quanto i
              valori oscillano attorno alla media. Serie stabili in cui compare
              un cambio improvviso sono pi&ugrave; significative
            </li>
            <li>
              <strong>Divergenza tra regioni</strong>: misura quanto i valori
              delle 20 regioni differiscono tra loro per ogni anno. Se la
              differenza cresce nel tempo, il fenomeno diventa meno uniforme
              sul territorio
            </li>
            <li>
              <strong>
                <a
                  href="https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Correlazione di Spearman
                </a>
              </strong>
              : misura la correlazione tra le variazioni anno-su-anno di reati
              diversi (non tra le serie grezze, per evitare correlazioni
              spurie dovute a trend comuni). Valori prossimi a +1 indicano
              reati che si muovono insieme, a -1 reati con andamenti opposti
            </li>
            <li>
              <strong>Confronto trend tra categorie</strong>: confronta
              l&apos;evoluzione di macro-categorie di reati (violenti,
              patrimoniali, informatici, droga) calcolando il trend della
              differenza tra le serie aggregate. Identifica se un fenomeno
              &egrave; specifico di una categoria o generalizzato
            </li>
            <li>
              <strong>Confronti territoriali Nord/Centro/Sud</strong>: calcola
              la media per ripartizione (Nord, Centro, Sud e Isole) per ogni
              reato e dimensione, poi analizza il trend della differenza tra
              ripartizioni. Rileva convergenze o divergenze territoriali
            </li>
            <li>
              <strong>Rapporto autori/vittime</strong>: per ogni reato, calcola
              come evolve il rapporto tra autori identificati e vittime nel
              tempo. Un rapporto in calo indica che le vittime crescono
              pi&ugrave; velocemente degli autori identificati
            </li>
          </ul>

          <p>
            Per isolare l&apos;effetto della pandemia, i test di trend vengono
            eseguiti escludendo gli anni 2020 e 2021 come risultato primario,
            confrontando poi con la serie completa. Quando i due risultati
            divergono, l&apos;insight viene segnalato come sensibile al COVID.
          </p>

          <p>
            Analizzando migliaia di combinazioni contemporaneamente, alcuni
            risultati apparirebbero significativi per puro caso. Per filtrare
            questi falsi positivi &egrave; stata applicata la correzione{" "}
            <strong>
              <a
                href="https://en.wikipedia.org/wiki/False_discovery_rate#Benjamini%E2%80%93Hochberg_procedure"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Benjamini-Hochberg (FDR)
              </a>
            </strong>{" "}
            al 5%, separatamente per ogni tipo di analisi.
          </p>

          <p>Sono state inoltre escluse dall&apos;analisi:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Combinazioni con meno di 50 persone/anno (numeri troppo piccoli
              per essere affidabili)
            </li>
            <li>Serie con meno di 5 anni di dati disponibili</li>
            <li>
              Variazioni inferiori a 3 punti percentuali sull&apos;intero
              periodo
            </li>
          </ul>

          <p>
            Ogni candidato &egrave; stato poi valutato manualmente per
            escludere artefatti (cambiamenti normativi, effetto COVID, limiti
            dei dati ISTAT) e per contestualizzare i risultati.
          </p>

          <p>
            Codice sorgente dell&apos;analisi:{" "}
            <a
              href="https://github.com/AlbGri/osservatorio-criminalita-next/blob/main/scripts/generate_insights.py"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              scripts/generate_insights.py
            </a>
            . Report completo con tutti i candidati statisticamente
            significativi (non solo quelli selezionati per questa pagina):{" "}
            <a
              href="https://github.com/AlbGri/osservatorio-criminalita-next/blob/main/docs/insights_report.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              insights_report.md
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

/* ---------- Componenti locali ---------- */

function InsightCard({
  title,
  confidence,
  period,
  children,
}: {
  title: string;
  confidence: "alta" | "media";
  period: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-base">{title}</h3>
        <div className="flex gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{period}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              confidence === "alta"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {confidence}
          </span>
        </div>
      </div>
      <div className="text-sm space-y-2">{children}</div>
    </div>
  );
}

function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground italic border-l-2 border-amber-300 pl-3 mt-2">
      {children}
    </p>
  );
}
