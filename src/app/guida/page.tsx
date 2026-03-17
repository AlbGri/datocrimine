export default function Guida() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:py-8 space-y-8">
      <h1 className="text-2xl sm:text-4xl font-bold">
        Guida alla Lettura
      </h1>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Cosa significa &quot;per 1.000 abitanti&quot;
        </h2>
        <p>
          Se leggi <strong>45 delitti per 1.000 abitanti</strong>, significa: in
          una citt&agrave; di 100.000 persone, ci sono stati circa 4.500 delitti
          denunciati in un anno.
        </p>
        <p>
          <strong>Non</strong> significa che il 4,5% della popolazione ha subito
          un reato: alcuni ne subiscono pi&ugrave; di uno, molti zero.
        </p>
        <p>
          Per i reati rari (omicidi, violenze sessuali) si usa il{" "}
          <strong>tasso per 100.000 abitanti</strong> per avere numeri
          leggibili.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Come interpretare i trend
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Pendenza della linea</strong>: indica la velocit&agrave; del
            cambiamento
          </li>
          <li>
            <strong>Confrontare sempre periodi lunghi</strong> (5-10 anni), non
            anno su anno
          </li>
          <li>
            <strong>Attenzione agli outlier</strong>: il periodo COVID
            (2020-2021) ha alterato tutti i dati per effetto dei lockdown, non
            per cambiamenti reali nella criminalit&agrave;
          </li>
          <li>
            <strong>Un singolo anno anomalo non fa un trend</strong>: servono
            almeno 3-4 anni nella stessa direzione per parlare di tendenza
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Cosa NON si pu&ograve; concludere
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>
              &quot;Il territorio X &egrave; pi&ugrave; sicuro di Y&quot;
            </strong>
            : la propensione alla denuncia varia tra territori e tipi di reato.
            L&apos;Indagine ISTAT 2022-2023 mostra che il Sud denuncia pi&ugrave; della
            media per reati contro la propriet&agrave; e reati violenti, mentre Nord-est
            e Isole denunciano meno (vedi Metodologia)
          </li>
          <li>
            <strong>
              &quot;La criminalit&agrave; &egrave; colpa del gruppo Z&quot;
            </strong>
            : i dati sugli autori denunciati (sezione Persone Denunciate)
            riguardano persone denunciate o arrestate, non condannate.
            Sovra-rappresentazioni di un gruppo possono riflettere pratiche
            di controllo differenziate, non maggiore propensione al crimine
          </li>
          <li>
            <strong>&quot;Non devo preoccuparmi&quot;</strong>: la percezione di
            rischio &egrave; legittima e personale. Questi dati mostrano un quadro
            aggregato, non la realt&agrave; del singolo quartiere
          </li>
          <li>
            <strong>Se un territorio &egrave; sicuro o pericoloso</strong>: i dati
            provinciali sono troppo aggregati e il numero oscuro varia
            localmente
          </li>
          <li>
            <strong>Previsioni future</strong>: non viene applicata nessuna
            modellazione predittiva
          </li>
          <li>
            <strong>La criminalit&agrave; reale totale</strong>: solo quella denunciata
            alle forze dell&apos;ordine
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Autori e vittime: cosa significano
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Autore denunciato</strong>: persona denunciata o arrestata
            dalle forze dell&apos;ordine. Non equivale a &quot;colpevole&quot;:
            il procedimento penale potrebbe concludersi con
            un&apos;archiviazione o un&apos;assoluzione
          </li>
          <li>
            <strong>Vittima</strong>: persona offesa dal reato in senso
            giuridico, non solo fisico. Per reati come incendi, danneggiamenti
            o furti, la vittima &egrave; il titolare del bene
            danneggiato o sottratto (es. il proprietario dell&apos;immobile
            incendiato)
          </li>
          <li>
            <strong>Dati 2007-2022</strong>: la sezione Persone Denunciate
            copre un arco temporale diverso (2007-2022) rispetto alle altre
            sezioni (2014-2024), perch&eacute; proviene da un dataset ISTAT
            separato (DCCV_AUTVITTPS)
          </li>
        </ul>
      </section>

      <hr />

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">Domande comuni</h2>

        <div className="space-y-2">
          <h3 className="font-semibold text-primary">
            Perch&eacute; alcuni reati aumentano ma il totale cala?
          </h3>
          <p>
            La composizione cambia. Esempio: se i furti calano del 20% ma le
            truffe aumentano del 50%, e i furti erano l&apos;80% del totale
            mentre le truffe il 5%, il totale pu&ograve; comunque calare. &Egrave; il peso
            relativo delle categorie che conta.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-primary">
            Posso usare questi dati per decidere dove vivere?
          </h3>
          <p>
            Con estrema cautela. I dati provinciali mascherano una variabilit&agrave;
            interna enorme: la provincia di Milano include sia zone centrali
            dense sia comuni rurali con realt&agrave; completamente diverse.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-primary">
            Perch&eacute; le denunce per violenza sessuale aumentano?
          </h3>
          <p>
            L&apos;aumento delle denunce riflette principalmente l&apos;effetto
            di campagne di sensibilizzazione (es. #MeToo) e maggiore fiducia
            nelle autorit&agrave;. Non indica necessariamente un aumento delle violenze
            reali. &Egrave; un risultato <strong>positivo</strong>: il numero oscuro si
            sta riducendo.
          </p>
        </div>
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Bias noti e non correggibili
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Under-reporting sistematico</strong> su alcuni reati
            (violenze di genere, domestiche)
          </li>
          <li>
            <strong>Over-reporting</strong> su altri (furti auto per necessit&agrave;
            assicurativa)
          </li>
          <li>
            <strong>Variabilit&agrave; territoriale</strong> nella propensione alla
            denuncia: varia per tipo di reato e area geografica, senza un
            pattern uniforme Nord-Sud (fonte: ISTAT Sicurezza dei Cittadini
            2022-2023)
          </li>
          <li>
            <strong>Effetto copertura mediatica</strong>: un caso mediatico pu&ograve;
            provocare un picco temporaneo nelle denunce di reati simili
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Compromessi di design
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Livello minimo: provincia</strong> - sacrifica utilit&agrave; locale
            per evitare stigmatizzazione di aree specifiche
          </li>
          <li>
            <strong>Delitti denunciati dal 2014</strong> - per qualit&agrave; e
            comparabilit&agrave; delle serie. Autori e vittime dal 2007 (fonte
            diversa)
          </li>
          <li>
            <strong>No dati real-time</strong> - ISTAT pubblica i delitti
            denunciati con un ritardo di circa 2 anni (vedi Metodologia per il
            calendario atteso)
          </li>
          <li>
            <strong>Solo denunce e denunciati</strong> - l&apos;Italia non pubblica
            dati su vittimizzazione sistematica, esiti processuali o dati
            sanitari aggregati (vedi Metodologia per dettagli)
          </li>
        </ul>
      </section>

      <hr />

      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          Segnalazione errori
        </h2>
        <p>
          Se trovi errori nei dati, nei calcoli o nella comunicazione, segnalali
          aprendo una{" "}
          <a
            href="https://github.com/AlbGri/osservatorio-criminalita-next/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            issue su GitHub
          </a>
          .
        </p>
        <p>Ogni segnalazione viene presa seriamente e valutata.</p>
      </section>
    </main>
  );
}
