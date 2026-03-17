# Metodologia

## Fonti dei dati

I dati provengono dal portale ufficiale ISTAT ([esploradati.istat.it](https://esploradati.istat.it/databrowser/)), sezione "Giustizia e sicurezza":

1. **Delitti denunciati dalle forze di polizia all'autorità giudiziaria** (periodo 2014-2024)
   - 56 tipologie di reato dettagliate
   - Dato nazionale aggregato per anno

2. **Percezione di sicurezza delle famiglie** - Indagine Multiscopo ISTAT (2014-2024)
   - Indicatore: "Famiglie per presenza di alcuni problemi nella zona in cui abitano: rischio di criminalità: molto e abbastanza"
   - Espresso in percentuale di famiglie che percepiscono rischio
   - Dato 2024 (26.6%) da Noi Italia 2025 (fonte indiretta: indicatore BES derivato dall'indagine Multiscopo)

3. **Popolazione residente** - ISTAT
   - Ricostruzione intercensuaria 2002-2019
   - DCIS_POPRES1 (Popolazione residente al 1° gennaio) 2019-2025

4. **Autori e vittime di delitto** (DCCV_AUTVITTPS, periodo 2007-2022)
   - Autori denunciati/arrestati (DF_7) e vittime di delitto (DF_8)
   - Breakdown per sesso, età (adulti/minori), cittadinanza (italiani/stranieri)
   - Livello territoriale: Italia, ripartizioni, regioni, province (province dal 2022)
   - Scaricati via API SDMX REST da esploradati.istat.it
   - **Nota**: "vittima" è intesa in senso giuridico (persona offesa dal reato), non solo fisico. Per reati contro il patrimonio (furti, danneggiamenti, incendi) la vittima è il titolare del bene.

### Criticità dataset AUTVITTPS

- **Dato aggregato (TOT) solo fino al 2022**: dal 2023 ISTAT pubblica solo i singoli tipi di reato, non il totale. Per questo il trend nazionale autori si ferma al 2022.
- **Dati provinciali solo dal 2022**: prima del 2022 sono disponibili solo Italia, ripartizioni e regioni.
- **CITIZENSHIP=TOTAL solo dal 2022**: per gli anni 2007-2021, il totale autori è calcolato come somma italiani + stranieri (FRG+ITL). Verifica 2022: FRG(270.567) + ITL(548.265) = TOTAL(818.832).
- **Dato minori limitato**: AGE=Y_UN17 è disponibile solo dal 2022 per il totale; per anni precedenti il dato è assente.
- **Duplicato STALK/CP612BIS**: entrambi i codici rappresentano l'art. 612-bis c.p. (atti persecutori). STALK copre 2007-2024 con breakdown limitato, CP612BIS copre 2022+ con breakdown completo. Nelle visualizzazioni viene escluso STALK per evitare doppi conteggi.
- **Totale vittime non disponibile**: il codice TOT esiste solo per gli autori (OFFEND). Per le vittime (VICTIM) non è possibile calcolare un totale perché una stessa persona può essere vittima di più reati contemporaneamente.

## Cosa rappresentano i dati

### Denunce vs Crimini

I numeri mostrati rappresentano le **denunce** registrate dalle forze di polizia (Polizia di Stato, Carabinieri, Guardia di Finanza, ecc.) e trasmesse all'autorità giudiziaria. Una denuncia viene registrata quando:

- Una persona si presenta per denunciare un reato
- Le forze dell'ordine rilevano direttamente un reato (es. durante controlli)
- Emerge un reato da indagini in corso

### Percezione di sicurezza

Il dato sulla percezione proviene da indagine campionaria ISTAT Multiscopo su famiglie italiane. Misura la **percezione soggettiva** di insicurezza nella zona di residenza, non l'esperienza diretta di vittimizzazione. La serie potrebbe risentire di **variazioni metodologiche** tra edizioni dell'indagine (es. il **salto 30.0% → 41.1%** tra 2014 e 2015 potrebbe riflettere un cambiamento nel questionario).

## Cosa NON rappresentano

I dati NON mostrano:

- **Crimini realmente commessi**: molti reati non vengono denunciati (es. furti minori, violenze domestiche). Il tasso di denuncia varia per tipo di reato.
- **Crimini accertati**: una denuncia non implica che il reato sia confermato o che ci sia un colpevole.
- **Condanne**: il dato è indipendente dall'esito processuale.
- **Sicurezza oggettiva**: la percezione di insicurezza risponde a fattori molteplici (copertura mediatica, degrado urbano, fiducia istituzionale) non sempre correlati con i dati registrati.

## Limiti metodologici

### Numero oscuro

La differenza tra reati commessi e reati denunciati (il "numero oscuro") varia significativamente per tipo di reato. Dati dall'[Indagine ISTAT sulla Sicurezza dei Cittadini 2022-2023](https://www.istat.it/comunicato-stampa/reati-contro-la-persona-e-contro-la-proprieta-vittime-ed-eventi-2022-2023/) e dal [Report ISTAT Reati contro la persona e la proprietà 2025](https://www.istat.it/wp-content/uploads/2025/06/Report_REATI-CONTRO-LA-PERSONA-E-LA-PROPRIETA_VITTIME-ED-EVENTI.pdf):

- **Furti auto/moto**: ~95% denunciati (necessità assicurativa; stabile tra le due edizioni)
- **Scippi**: 68.2% denunciati (era 88.9% nel 2015-2016: calo per rassegnazione)
- **Aggressioni**: 40.6% denunciate (era 19.9% nel 2015-2016: forte miglioramento)
- **Frodi/truffe**: 24.1% denunciate (era 18.4% nel 2015-2016: lieve aumento, legato a crescita truffe bancarie online)
- **Violenza da partner**: ~11% denunciata ([ISTAT Violenza donne 2025](https://www.istat.it/comunicato-stampa/la-violenza-contro-le-donne-dentro-e-fuori-la-famiglia-primi-risultati-anno-2025/))

Il numero oscuro varia nel tempo: un aumento delle denunce può indicare maggiore propensione a denunciare (positivo), non necessariamente più reati. Il raddoppio delle denunce per aggressioni tra 2015-2016 e 2022-2023 ne è un esempio. Le due edizioni dell'indagine comparabili sono l'[Indagine 2015-2016](https://www.istat.it/it/files/2019/02/Reati-contro-la-persona-e-contro-la-proprieta.pdf) e quella 2022-2023.

### Propensione alla denuncia per territorio

L'Indagine ISTAT sulla Sicurezza dei Cittadini 2022-2023 ([Tavola 6](https://www.istat.it/comunicato-stampa/reati-contro-la-persona-e-contro-la-proprieta-vittime-ed-eventi-2022-2023/)) disaggrega la propensione alla denuncia per macroarea geografica e tipo di reato. I dati sfatano il luogo comune "il Sud denuncia meno": il Sud denuncia più della media nazionale per reati contro la proprietà, reati violenti e reati contro i veicoli, mentre Nord-est e Isole denunciano meno per quasi tutte le categorie.

Le macro-categorie ISTAT aggregano più reati:
- **Reati contro la proprietà individuale** = scippi + borseggi + furti oggetti personali
- **Reati violenti** = aggressioni + minacce
- **Reati contro l'abitazione** = furti in abitazione + tentati furti
- **Reati contro i veicoli** = furti di veicoli + furti di oggetti dai veicoli

Le macro-categorie sono disponibili solo per l'edizione 2022-2023. Il confronto con l'edizione 2015-2016 ([Prospetto 6, report ISTAT 2019](https://www.istat.it/it/files/2019/02/Reati-contro-la-persona-e-contro-la-proprieta.pdf)) è possibile solo per i 9 singoli reati. I grafici interattivi nella sezione "Il Numero Oscuro" della Home mostrano il dettaglio completo per macroarea e per singolo reato, con indicazione dei dati a errore campionario elevato.

### Cambiamenti normativi

Nuove leggi possono modificare:
- **Cosa costituisce reato** (es. reati informatici emersi con digitalizzazione)
- **Modalità di registrazione** (es. GDPR 2018 limita pubblicazione dati disaggregati)
- **Pene** (es. depenalizzazioni modificano classificazione)

**Caso rilevante nei dati:** il D.Lgs. 7/2016 (in vigore dal 6 febbraio 2016) ha depenalizzato le ingiurie, trasformandole da reato penale a illecito civile. Questo spiega il calo del -23% nella categoria "Violenze contro la persona" tra 2015 e 2016: circa 50.000-60.000 denunce/anno per ingiurie sono uscite dalle statistiche penali. Non si tratta di un calo reale della violenza.

### Propensione a denunciare

La propensione a denunciare varia per:
- **Fattori culturali**: stigma sociale (es. violenze sessuali)
- **Fiducia nelle istituzioni**: campagne sensibilizzazione aumentano denunce
- **Gravità del reato**: crimini gravi più probabilmente denunciati
- **Utilità pratica**: denunce per assicurazione vs rassegnazione per piccoli furti

**Esempio critico**: l'aumento delle denunce per violenze sessuali (+60.4% in numeri assoluti dal 2014 al 2024, da 4.257 a 6.831) riflette principalmente l'effetto di campagne come #MeToo e maggiore fiducia nelle autorità, NON necessariamente un aumento delle violenze reali. Questo è un risultato positivo: il numero oscuro si sta riducendo.

### Anno di riferimento

È l'**anno della denuncia**, non necessariamente dell'evento criminoso. Reati scoperti anni dopo (es. truffe complesse) vengono registrati nell'anno della denuncia.

### Periodo COVID nei grafici

Nei grafici temporali è evidenziata la finestra COVID (indicativamente 2020-2021). Il **calo dei reati nel 2020 (-17% circa)** è in larga parte dovuto ai lockdown e alle restrizioni di movimento, non a un miglioramento strutturale della sicurezza. I dati sono annuali, quindi l'evidenziazione è approssimativa.

## Normalizzazione per popolazione

Tutti i tassi sono calcolati per abitanti per permettere confronti temporali corretti:

- **Tasso per 1000 abitanti**: usato per categorie frequenti (furti, totale delitti)
- **Tasso per 100.000 abitanti**: usato per reati rari (omicidi, violenze sessuali)

Formula: `Tasso = (Numero delitti / Popolazione) × 1000 (o 100.000)`

La normalizzazione è essenziale perché la **popolazione italiana è diminuita** da 60.3 milioni (2014) a 59.0 milioni (2024).

## Categorie di reato

### Aggregazione in macro-categorie

I 56 tipi di delitto ISTAT sono stati aggregati in 6 macro-categorie per leggibilità. **Le macro-categorie non sono mutuamente esclusive**: uno stesso reato può rientrare in più categorie (es. una rapina con violenza può figurare sia in "Rapine" che in "Violenze contro la persona"). La somma delle categorie supera pertanto il totale nazionale del 25-35%.

1. **Furti**: tutti i furti (con strappo, destrezza, abitazioni, auto, moto, esercizi commerciali, ecc.)
2. **Rapine**: rapine in abitazione, banca, uffici postali, esercizi commerciali, pubblica via
3. **Violenze contro la persona**: omicidi volontari (inclusi infanticidi, per mafia, per rapina, terrorismo, strage), tentati omicidi, percosse, lesioni, minacce, sequestri, ingiurie, violenze sessuali, atti con minori, pornografia minorile, corruzione di minorenne, sfruttamento prostituzione. Nota: gli omicidi colposi (stradali e non) sono classificati in "Altro" perché non sono violenza intenzionale
4. **Truffe e Frodi**: truffe informatiche, delitti informatici, contraffazione marchi, violazione proprietà intellettuale
5. **Droga**: normativa stupefacenti
6. **Altro**: danneggiamenti, incendi, criminalità organizzata (mafia, riciclaggio, usura, estorsioni), ricettazione, contrabbando

### Reati ad alto allarme sociale

Per il focus su reati mediatici, sono stati selezionati 6 tipi specifici (non aggregati):

- Omicidi volontari consumati
- Tentati omicidi
- Violenze sessuali
- Atti sessuali con minorenne
- Rapine in abitazione
- Sequestri di persona

Questi reati rappresentano **<2% dei delitti totali** ma dominano percezione pubblica e copertura mediatica.

## Indicatore di sicurezza percepita vs oggettiva

I delitti denunciati sono più un indicatore dell'**attività delle forze dell'ordine** e della **propensione a denunciare** che della criminalità effettiva. Un aumento delle denunce può riflettere:

- **Maggiore efficienza** nel rilevare reati
- **Maggiore fiducia** dei cittadini
- **Reale aumento** della criminalità

Non è possibile distinguere tra queste cause senza analisi aggiuntive.

Il **divario tra percezione e dati registrati** è documentato e normale. La percezione di insicurezza risponde a:

- **Copertura mediatica** (focus su crimini violenti anche se rari)
- **Degrado urbano** visibile (indipendente da crimini denunciati)
- **Sfiducia istituzionale** generale
- **Esperienza personale** o di conoscenti
- **Narrazioni politiche**

Questi fattori sono legittimi e non rendono la percezione "sbagliata". Il progetto mira a visualizzare questa differenza senza giudizi di valore.

## Limiti strutturali: cosa l'Italia potrebbe misurare ma non fa

Questo progetto è limitato ai dati delle denunce non per scelta metodologica, ma perché l'Italia non pubblica dati che altri paesi rendono disponibili.

### Cosa pubblicano UK, USA, Germania (e Italia no)

**Regno Unito:**
- Crime Survey for England and Wales (CSEW): indagine vittimizzazione annuale su ~35.000 famiglie
- Dati pubblicati entro 6 mesi, disaggregati per tipologia e territorio
- Stima numero oscuro per ogni categoria di reato

**Stati Uniti:**
- National Crime Victimization Survey (NCVS): ~160.000 persone intervistate annualmente dal 1973
- Pubblicazione trimestrale, dati aperti e linkabili
- Database FBI integrato con esiti processuali

**Germania:**
- Dunkelfeldforschung (ricerche numero oscuro) periodiche su scala nazionale
- Dati sanitari aggregati su violenze (Polizeiliche Kriminalstatistik + dati ospedalieri)
- Confronto diretto denunce vs vittimizzazioni

### Cosa l'Italia non pubblica (ma potrebbe)

1. **Indagini vittimizzazione annuali**
   - ISTAT le fa ogni 5-7 anni (ultima 2022-2023, precedente 2015-2016)
   - Campione più piccolo (~29.000 individui vs 35k famiglie UK)
   - Non sempre pubblicati dati disaggregati per anno e territorio

2. **Dati sanitari aggregati**
   - Accessi Pronto Soccorso per violenze esistono ma NON sono pubblici
   - Database decessi (ReNCaM) esiste con cause dettagliate
   - Database violenze ospedaliere? No
   - Motivazione ufficiale: privacy/GDPR
   - Realtà: dati aggregati per regione/anno non violano privacy. È scelta politica.

3. **Esiti processuali linkabili**
   - Ministero Giustizia pubblica statistiche ma:
     - Con 3-5 anni di ritardo
     - Non linkabili a dataset ISTAT (chiavi diverse)
     - Formato non standard, difficile analisi temporale

4. **Database integrato Interno-Giustizia-Sanità**
   - Tecnicamente possibile (abbiamo anagrafe tributaria, sanitaria unificata)
   - Nessun progetto in corso per integrazione dati criminalità

### Perché l'Italia non li pubblica

**Non sono limiti tecnici.** L'Italia ha:
- Database nazionale decessi con cause (ReNCaM)
- Tessera sanitaria con accessi PS tracciati
- Sistema informatico Ministero Interno per denunce
- Sistema SICP Ministero Giustizia per processi

**Sono scelte politiche:**

1. **Accountability**: dati reali = governi valutabili su risultati
   - Esempio: se ISTAT pubblicasse "500.000 violenze domestiche/anno" vs "6.000 denunce", pressione su servizi sociali, centri antiviolenza, fondi
   - Più facile non misurare che dover agire

2. **Inerzia burocratica**: ogni ministero protegge proprio territorio
   - Interno: denunce
   - Giustizia: processi
   - Salute: PS
   - Zero coordinamento, zero incentivi a condividere

3. **Costo politico percepito**: nessun governo vuole titoli
   - "Italia: 500k violenze/anno, solo 6k denunciate"
   - "Numero oscuro criminalità 400% più alto di UK"
   - Preferiscono parlare di "aumento denunce" (spin positivo: fiducia cittadini)

4. **Assenza pressione pubblica**: cittadini/media non chiedono questi dati
   - Campagne su sicurezza basate su percezione, non evidenze
   - Dibattito politico su "emergenza criminalità" usa aneddoti, non statistiche comparative

### Conseguenze dell'opacità

- **Politiche inefficaci**: allocazione risorse su percezione (es. più polizia in centro) invece che su dati (es. violenze domestiche periferie)
- **Dibattito distorto**: media/politici parlano di "aumento criminalità" citando denunce (dato quasi inutile per crimini con numero oscuro alto)
- **Non comparabilità internazionale**: impossibile valutare performance Italia vs paesi trasparenti
- **Mancanza accountability**: nessuno può misurare efficacia politiche sicurezza senza dati pre/post

### Costi pubblicazione dati (risibili)

UK CSEW: ~£10 milioni/anno (£0.15 per abitante)
- Interviste, elaborazione, pubblicazione aperta
- ROI: politiche basate su evidenze, non percezione

Italia equivalente: ~€9 milioni/anno
- 0.01% budget Ministero Interno (€11 miliardi)
- Costo: 1 caffè/anno per cittadino

**Non è problema di soldi. È problema di volontà politica.**

### Cosa si potrebbe fare

**Minimo (costo quasi zero):**
1. ISTAT indagine vittimizzazione annuale (non ogni 5 anni)
2. Pubblicare dati PS violenze aggregati per regione/anno (già raccolti)
3. Ministero Giustizia: esiti denunce linkabili con dati ISTAT

**Ottimale (costo 10-15 milioni/anno):**
1. Database integrato Interno-Giustizia-Sanità
2. Indagine vittimizzazione su campione UK-size (50k famiglie)
3. Dashboard pubblico con confronti internazionali
4. Audit annuale indipendente qualità dati

**Confronto UK:**
- 1973: inizia NCVS (USA)
- 1982: inizia CSEW (UK)
- 2026: Italia ancora dipendente solo da denunce

**Ritardo: 40+ anni.**

## Confronti territoriali

### Dati regionali e provinciali

I dati territoriali provengono dallo **stesso dataset ISTAT** dei delitti nazionali, filtrati per codice NUTS regionale e provinciale. La popolazione per la normalizzazione proviene da due fonti ISTAT complementari:

- **2014-2018**: demo.istat.it (Ricostruzione intercensuaria)
- **2019-2025**: esploradati.istat.it (DCIS_POPRES1, Popolazione residente al 1° gennaio)

**Trentino-Alto Adige**: nel dataset ISTAT i delitti sono separati in Bolzano (ITD1) e Trento (ITD2). Vengono sommati in ITD12 per il confronto con il GeoJSON regionale (openpolis).

**Codici NUTS**: i dati utilizzano la classificazione NUTS pre-2021 (es. ITD3 per Veneto, ITD5 per Emilia-Romagna), coerente con la distribuzione ISTAT dei dati. Dal 2021 i codici ufficiali sono cambiati (ITH3, ITH5).

**Residuo nazionale**: la somma dei delitti regionali differisce dal totale nazionale di circa 50 unità/anno, presumibilmente per reati non attribuibili a una regione specifica (es. acque internazionali).

### Cautele nell'interpretazione

I confronti territoriali richiedono estrema cautela per diversi motivi:

1. **Propensione alla denuncia**: la propensione a denunciare varia significativamente per tipo di reato e territorio. L'Indagine ISTAT 2022-2023 mostra che il Sud denuncia più della media nazionale per reati contro la proprietà (52.6% vs 44.7%) e per reati violenti (58.6% vs 41.6%), mentre Nord-est e Isole denunciano meno (vedi sezione "Propensione alla denuncia per territorio"). Un tasso più alto non significa necessariamente più criminalità reale.

2. **Effetto turismo e pendolarismo**: regioni con alta presenza turistica (es. Lazio, Toscana) o forte pendolarismo mostrano tassi elevati perché il denominatore (popolazione residente) sottostima le persone effettivamente presenti.

3. **Province piccole**: province con meno di 150.000 abitanti possono mostrare variabilità elevata anno su anno per effetto statistico (pochi eventi = alta variazione percentuale). Guardare trend pluriennali, non singoli anni.

4. **Composizione reati**: territori diversi hanno mix diversi di reati. Il tasso totale maschera queste differenze qualitative.

### Confini geografici

I confini regionali provengono dal dataset [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy) (limiti amministrativi ISTAT). La chiave di join è `reg_istat_code_num` (codice numerico regione).

## Frequenza di aggiornamento

### Delitti denunciati (ISTAT - esploradati.istat.it)

ISTAT pubblica i dati sui delitti denunciati con un **ritardo strutturale di circa 2 anni** rispetto all'anno di riferimento. I dati provengono dalla banca dati interforze del Ministero dell'Interno (SDI/SSD) e vengono elaborati e strutturati dall'ISTAT prima della pubblicazione su [esploradati.istat.it](https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,Z0840JUS,1.0/JUS_CRIMINAL/DCCV_DELITTIPS/IT1,73_67_DF_DCCV_DELITTIPS_1,1.0).

- **Dati 2024**: pubblicati su esploradati.istat.it a inizio 2026 (attualmente in uso in questa dashboard)
- **Dati 2025**: attesi indicativamente nel **2027-2028**

Non esiste un calendario fisso per questo aggiornamento. ISTAT pubblica un [calendario settimanale delle diffusioni](https://www.istat.it/attivita-e-servizi-per-tipo-di-utenti/giornalisti/appuntamenti/calendario-delle-diffusioni-e-degli-eventi/) che vale la pena monitorare. Schede qualità: [delitti denunciati da PdS, CC e GdF](https://www.istat.it/scheda-qualita/delitti-denunciati-allautorita-giudiziaria-da-polizia-di-stato-arma-dei-carabinieri-e-guardia-di-finanza/), [delitti con azione penale](https://www.istat.it/scheda-qualita/delitti-denunciati-per-i-quali-lautorita-giudiziaria-ha-iniziato-lazione-penale/).

### Perché non fonti alternative?

I dati 2024 esistono: il **Sole 24 Ore** li pubblica annualmente nel suo [Indice della criminalità](https://lab24.ilsole24ore.com/indice-della-criminalita/), ottenendoli in esclusiva dalla banca dati interforze del Ministero dell'Interno. Ma questi dati **non sono scaricabili** in formato strutturato.

Il **Ministero dell'Interno** pubblica dati aggregati aperti (licenza CC-BY) su [dati-coll.dfp.gov.it](https://dati-coll.dfp.gov.it/dataset/?tags=delitti&tags=denunce&tags=capoluogo&organization=min-interni&license_id=CC-BY-4.0&res_format=JSON), ma a febbraio 2026 il dataset risulta fermo al 2022. La banca dati CED/SDI interforze resta riservata alle forze dell'ordine.

Di fatto, **l'unica fonte pubblica** con dati strutturati per provincia e tipologia di reato è ISTAT, con il suo ritardo di circa 2 anni. Questa è una **scelta deliberata** dell'architettura informativa italiana sulla criminalità, non un limite tecnico.

### Percezione di sicurezza (BES - ISTAT)

Il rapporto BES viene aggiornato **annualmente** in autunno:

- **BES 2024** (XII edizione): pubblicato a novembre 2025, con dati sulla percezione al 2024
- **BES 2025**: atteso indicativamente a **novembre 2026**

### Omicidi (ISTAT)

Questa dashboard utilizza i dati sugli omicidi dal dataset DCCV_DELITTIPS (delitti denunciati), che segue il ciclo di pubblicazione standard con **circa 2 anni di ritardo**. Tuttavia, per gli omicidi ISTAT pubblica anche un report separato con ciclo più rapido: "[Le vittime di omicidio](https://www.istat.it/comunicato-stampa/le-vittime-di-omicidio-anno-2024/)" con **dati 2024 già disponibili** (pubblicato a novembre 2025). Chi cerca dati più aggiornati sugli omicidi può consultare direttamente quel report.

## Trasparenza

Questo progetto non afferma di mostrare "la criminalità in Italia", ma solo i dati ufficiali sulle denunce e sulla percezione, con piena consapevolezza dei limiti. L'obiettivo è facilitare la comprensione del divario tra percezione pubblica e dati registrati, non di dimostrare una tesi precostituita.

**Questo progetto mostra cosa è possibile vedere con i dati disponibili. L'assenza di dati migliori non è limite statistico: è responsabilità istituzionale.**

## Nota sul processo di sviluppo

Questo progetto è stato sviluppato con **VS Code** e **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** (Anthropic, modello Claude Opus), in una modalità di **interazione continua tra analista e modello**. La scelta è deliberata: costruire una dashboard statistica **non è un problema di ingegneria del software risolvibile in autonomia** da un agente. Ogni grafico richiede **decisioni metodologiche** — quale indicatore esporre, a quale scala, con quale contesto — che sono il **contenuto intellettuale del lavoro**, non dettagli implementativi.

La statistica **non è una scienza esatta**: è uno strumento interpretativo, e come tale **uno strumento politico** in senso ampio. Le stesse cifre possono **sostenere narrative opposte** a seconda di cosa si sceglie di mostrare, come lo si aggrega e cosa si omette. Per questo il paradigma utile non è quello dell'"agente autonomo che esegue", ma quello del **collaboratore intelligente** che propone e lascia decidere. Il modello **non decide la storia** da raccontare: aiuta a **raccontare meglio** quella che l'analista ha già scelto di raccontare.

Tutti i dati raw, script di elaborazione e codice sorgente della dashboard sono disponibili pubblicamente su GitHub: https://github.com/AlbGri/osservatorio-criminalita-next