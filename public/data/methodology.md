# Metodologia

## Fonti dei dati

I dati provengono dal portale ufficiale ISTAT ([esploradati.istat.it](https://esploradati.istat.it/databrowser/)), sezione "Giustizia e sicurezza":

1. **Delitti denunciati dalle forze di polizia all'autorità giudiziaria** (periodo 2014-2024)
   - 56 tipologie di reato dettagliate
   - Dato nazionale aggregato per anno

2. **Percezione di sicurezza delle famiglie** - Indagine Multiscopo ISTAT (2014-2024)
   - Indicatore: "Famiglie per presenza di alcuni problemi nella zona in cui abitano: rischio di criminalità: molto e abbastanza"
   - Espresso in percentuale di famiglie che percepiscono rischio
   - Dato 2024 (26,6%) da [Noi Italia 2025 - Criminalità e sicurezza](https://noi-italia.istat.it/pagina.php?id=3&categoria=9&action=show&L=0) (indicatore BES derivato dall'indagine Multiscopo)
   - La serie storica è compilata manualmente da pubblicazioni ISTAT annuali (Noi Italia, rapporto BES, comunicati Multiscopo). Non esiste un dataset ISTAT scaricabile automaticamente per questo indicatore. Ogni anno può provenire da una pubblicazione diversa, quindi la coerenza metodologica tra anni non è garantita (es. variazioni nel campione o nel questionario non sono sempre documentate da ISTAT).

3. **Popolazione residente** - ISTAT
   - Ricostruzione intercensuaria 2002-2019
   - DCIS_POPRES1 (Popolazione residente al 1° gennaio) 2019-2025

4. **Autori e vittime di delitto** (DCCV_AUTVITTPS, periodo 2007-2024)
   - Autori denunciati/arrestati (DF_7) e vittime di delitto (DF_8)
   - Breakdown per sesso, età (adulti/minori), cittadinanza (italiani/stranieri)
   - Livello territoriale: Italia, ripartizioni, regioni (2007-2024 per singoli reati, 2007-2022 per TOT), province (dal 2022, singoli reati fino al 2024, TOT solo 2022)
   - Scaricati via API SDMX REST da esploradati.istat.it
   - "Vittima" è intesa in senso giuridico (persona offesa dal reato), non solo fisico. Per reati contro il patrimonio (furti, danneggiamenti, incendi) la vittima è il titolare del bene.

### Criticità dataset AUTVITTPS

**Copertura temporale e territoriale (autori / vittime):**

- Totale nazionale: autori 2007-2022, vittime non disponibile*
- Reati singoli, Italia e regioni: 2007-2024 per autori e vittime
- Reati singoli, province: 2022-2024 per autori e vittime
- Totale provinciale: autori solo 2022, vittime non disponibile*

*\*Il totale delle vittime non si ottiene sommando i singoli reati, perché una stessa persona può essere vittima di più reati.*

**Dettaglio criticità:**

- **Dato aggregato (TOT) solo fino al 2022**: dal 2023 ISTAT pubblica solo i singoli tipi di reato, non il totale. Per questo il trend nazionale TOT si ferma al 2022; selezionando un singolo reato la serie arriva al 2024.
- **Dati provinciali solo dal 2022**: prima del 2022 sono disponibili solo Italia, ripartizioni e regioni.
- **CITIZENSHIP=TOTAL solo dal 2022**: per gli anni 2007-2021, il totale autori è calcolato come somma italiani + stranieri (FRG+ITL). Verifica 2022: FRG(270.567) + ITL(548.265) = TOTAL(818.832).
- **Dato minori limitato**: AGE=Y_UN17 è disponibile solo dal 2022 per il totale; per anni precedenti il dato è assente.
- **Unificazione STALK/CP612BIS**: ISTAT usa due codici per lo stesso reato (art. 612-bis c.p., atti persecutori): STALK (dal 2009, senza breakdown minori) e CP612BIS (dal 2022, con breakdown completo). I valori negli anni sovrapposti (2022-2023) sono identici. In fase di elaborazione, STALK viene rinominato in CP612BIS e per gli anni sovrapposti si mantiene il record CP612BIS originale (che include il dato sui minori), producendo una serie unica 2009-2024.
- **Subset reati per livello regionale**: i dati regionali espongono 18 reati selezionati (i più rilevanti per volume e interesse analitico) più il totale, per contenere la dimensione dei file. Il dato nazionale copre 56 reati, quello provinciale 55: mancano le ingiurie, depenalizzate nel 2016, perché i dati provinciali partono dal 2022. Un reato assente nel dettaglio regionale è comunque incluso nel totale nazionale.

## Cosa rappresentano i dati

### Denunce vs Crimini

I numeri mostrati rappresentano le **denunce** registrate dalle forze di polizia (Polizia di Stato, Carabinieri, Guardia di Finanza, ecc.) e trasmesse all'autorità giudiziaria. Una denuncia viene registrata quando:

- Una persona si presenta per denunciare un reato
- Le forze dell'ordine rilevano direttamente un reato (es. durante controlli)
- Emerge un reato da indagini in corso

### Percezione di sicurezza

Il dato sulla percezione proviene da indagine campionaria ISTAT Multiscopo su famiglie italiane. Misura la **percezione soggettiva** di insicurezza nella zona di residenza, non l'esperienza diretta di vittimizzazione. La serie potrebbe risentire di **variazioni metodologiche** tra edizioni dell'indagine (es. il **salto dal 30,0% al 41,1%** tra 2014 e 2015 potrebbe riflettere un cambiamento nel questionario).

## Cosa NON rappresentano

I dati NON mostrano:

- **Crimini realmente commessi**: molti reati non vengono denunciati (es. furti minori, violenze domestiche). Il tasso di denuncia varia per tipo di reato.
- **Crimini accertati**: una denuncia non implica che il reato sia confermato o che ci sia un colpevole.
- **Condanne**: il dato è indipendente dall'esito processuale.
- **Colpevoli accertati**: nella sezione "Persone Denunciate", gli autori sono persone denunciate o arrestate, non condannate. Una sovra-rappresentazione di un gruppo demografico tra i denunciati può riflettere pratiche di controllo differenziate (es. maggiori controlli in alcune aree o su alcune popolazioni), non necessariamente una maggiore propensione al crimine.
- **Sicurezza oggettiva**: la percezione di insicurezza risponde a fattori molteplici (copertura mediatica, degrado urbano, fiducia istituzionale) non sempre correlati con i dati registrati.

## Limiti metodologici

### Numero oscuro

La differenza tra reati commessi e reati denunciati (il "numero oscuro") varia significativamente per tipo di reato. Dati dall'[Indagine ISTAT sulla Sicurezza dei Cittadini 2022-2023](https://www.istat.it/comunicato-stampa/reati-contro-la-persona-e-contro-la-proprieta-vittime-ed-eventi-2022-2023/) e dal [Report ISTAT Reati contro la persona e la proprietà 2025](https://www.istat.it/wp-content/uploads/2025/06/Report_REATI-CONTRO-LA-PERSONA-E-LA-PROPRIETA_VITTIME-ED-EVENTI.pdf):

- **Furti auto/moto**: ~95% denunciati (necessità assicurativa; stabile tra le due edizioni)
- **Scippi**: 68,2% denunciati (era 88,9% nel 2015-2016)
- **Aggressioni**: 40,6% denunciate (era 19,9% nel 2015-2016)
- **Frodi/truffe**: 24,1% denunciate (era 18,4% nel 2015-2016: lieve aumento, legato a crescita truffe bancarie online)
- **Violenza da partner**: ~11% denunciata ([ISTAT Violenza donne 2025](https://www.istat.it/comunicato-stampa/la-violenza-contro-le-donne-dentro-e-fuori-la-famiglia-primi-risultati-anno-2025/))

Il numero oscuro varia nel tempo. Un aumento delle denunce può voler dire più reati, più propensione a denunciare o entrambe le cose; un calo, allo stesso modo, meno reati o meno denunce. Il raddoppio della quota di aggressioni denunciate dalle vittime tra 2015-2016 e 2022-2023 ne è un esempio. Le due edizioni dell'indagine comparabili sono l'[Indagine 2015-2016](https://www.istat.it/it/files/2019/02/Reati-contro-la-persona-e-contro-la-proprieta.pdf) e quella 2022-2023.

L'indagine esce ogni 5-7 anni; il confronto con altri paesi, con la posizione dell'autore, è nella pagina [Dati che mancano](/dati-che-mancano).

### Propensione alla denuncia per territorio

L'Indagine ISTAT sulla Sicurezza dei Cittadini 2022-2023 ([Tavola 6](https://www.istat.it/comunicato-stampa/reati-contro-la-persona-e-contro-la-proprieta-vittime-ed-eventi-2022-2023/)) disaggrega la propensione alla denuncia per macroarea geografica e tipo di reato. Il Sud denuncia più della media nazionale per reati contro la proprietà, reati violenti e reati contro i veicoli, mentre Nord-est e Isole denunciano meno per quasi tutte le categorie.

Le macro-categorie ISTAT aggregano più reati:
- **Reati contro la proprietà individuale** = scippi + borseggi + furti oggetti personali
- **Reati violenti** = aggressioni + minacce
- **Reati contro l'abitazione** = furti in abitazione + tentati furti
- **Reati contro i veicoli** = furti di veicoli + furti di oggetti dai veicoli

Le macro-categorie sono disponibili solo per l'edizione 2022-2023. Il confronto con l'edizione 2015-2016 ([Prospetto 6, report ISTAT 2019](https://www.istat.it/it/files/2019/02/Reati-contro-la-persona-e-contro-la-proprieta.pdf)) è possibile solo per i 9 singoli reati. I grafici interattivi della pagina [Il numero oscuro](/numero-oscuro) mostrano il dettaglio completo per macroarea e per singolo reato, con indicazione dei dati a errore campionario elevato.

### Cambiamenti normativi

Nuove leggi possono modificare:
- **Cosa costituisce reato** (es. reati informatici emersi con digitalizzazione)
- **Modalità di registrazione** (es. GDPR 2018 limita pubblicazione dati disaggregati)
- **Pene** (es. depenalizzazioni modificano classificazione)

**Casi rilevanti nei dati:**

- **D.Lgs. 7/2016** (in vigore dal 6 febbraio 2016): ha depenalizzato le ingiurie, trasformandole da reato penale a illecito civile. Le denunce per ingiurie passano da 58.620 nel 2015 a 15.781 nel 2016 e a 2.064 nel 2017, poi la voce scompare. Nel totale ISTAT circa un quinto del calo fra 2015 e 2016 (42.839 su 199.860) dipende da questo, non da meno reati. Per questo in tutto il sito il totale dei delitti è **al netto delle ingiurie**: gli anni 2014-2017 si confrontano con i successivi a parità di reati. Il totale ISTAT si ottiene sommando la colonna `Ingiurie` dei dati scaricabili. Nel grafico per tipologia le ingiurie sono una categoria a parte, per non falsare il trend delle altre.
- **L. 69/2019 "Codice Rosso"** (in vigore dal 9 agosto 2019): ha introdotto procedure accelerate per violenza domestica e di genere (obbligo di ascolto vittima entro 3 giorni, nuovi reati come revenge porn). Può aver contribuito all'aumento delle denunce per violenze sessuali e maltrattamenti dal 2019 in poi; quanto, i dati non lo dicono.

### Propensione a denunciare

La propensione a denunciare varia per:
- **Fattori culturali**: stigma sociale (es. violenze sessuali)
- **Fiducia nelle istituzioni**: campagne sensibilizzazione aumentano denunce
- **Gravità del reato**: crimini gravi più probabilmente denunciati
- **Utilità pratica**: denunce per assicurazione vs rassegnazione per piccoli furti

L'aumento delle denunce per violenze sessuali (+60,5% in numeri assoluti dal 2014 al 2024, da 4.257 a 6.831) non distingue fra più violenze e più denunce. L'indagine ISTAT 2025 sulle donne trova stabili, rispetto al 2014, sia le vittime di violenza fisica o sessuale sia i comportamenti di denuncia, ma copre solo le donne fra 16 e 75 anni e misura la denuncia solo per le violenze del partner (vedi [Guida alla lettura](/guida)).

### Anno di riferimento

È l'**anno della denuncia**, non necessariamente dell'evento criminoso. Reati scoperti anni dopo (es. truffe complesse) vengono registrati nell'anno della denuncia.

### Periodo COVID nei grafici

Nei grafici temporali è evidenziata la finestra COVID (indicativamente 2020-2021). Il **calo dei reati nel 2020 (-17% circa)** è in larga parte dovuto ai lockdown e alle restrizioni di movimento, non a un miglioramento strutturale della sicurezza. I dati sono annuali, quindi l'evidenziazione è approssimativa.

## Normalizzazione per popolazione

Tutti i tassi sono calcolati per abitanti per permettere confronti temporali corretti:

- **Tasso per 1000 abitanti**: usato per categorie frequenti (furti, totale delitti)
- **Tasso per 100.000 abitanti**: usato per reati rari (omicidi, violenze sessuali)

Formula: `Tasso = (Numero delitti / Popolazione) × 1000 (o 100.000)`

La normalizzazione è essenziale perché la **popolazione italiana è diminuita** da 60,3 milioni (2014) a 59,0 milioni (2024).

## Categorie di reato

### Aggregazione in macro-categorie

I 55 tipi di delitto ISTAT sono aggregati in 7 macro-categorie **mutuamente esclusive**. Ogni reato rientra in una sola categoria e la somma delle categorie è uguale al totale nazionale. Venti codici ISTAT sono sottotipi di un altro (i tipi di furto e di rapina, alcuni omicidi volontari, gli incendi boschivi, gli omicidi stradali) e si contano solo nel codice padre.

1. **Furti**: codice padre ISTAT (include tutti i sottotipi: con strappo, destrezza, abitazioni, auto, moto, esercizi commerciali, ecc.)
2. **Rapine**: codice padre ISTAT (include tutti i sottotipi: in abitazione, banca, uffici postali, esercizi commerciali, pubblica via)
3. **Violenze contro la persona**: omicidi volontari consumati, tentati omicidi, omicidi preterintenzionali, infanticidi, stragi, percosse, lesioni, minacce, sequestri, violenze sessuali, atti con minori, pornografia minorile, corruzione di minorenne, sfruttamento e favoreggiamento della prostituzione. Nota: gli omicidi colposi (stradali e non) sono classificati in "Altro" perché non sono violenza intenzionale
4. **Truffe e Frodi**: truffe informatiche, delitti informatici, contraffazione marchi, violazione proprietà intellettuale
5. **Droga**: normativa sugli stupefacenti
6. **Altro**: danneggiamenti (anche seguiti da incendio), incendi, criminalità organizzata (associazione per delinquere e di tipo mafioso, riciclaggio, usura, estorsioni), ricettazione, contrabbando, attentati, omicidi colposi, altri delitti
7. **Ingiurie**: depenalizzate nel 2016, serie fino al 2017; a parte per non falsare il trend di "Altro"

### Reati ad alto allarme sociale

Per il focus su reati mediatici, sono stati selezionati 6 tipi specifici (non aggregati):

- Omicidi volontari consumati
- Tentati omicidi
- Violenze sessuali
- Atti sessuali con minorenne
- Rapine in abitazione
- Sequestri di persona

Questi reati sono **lo 0,48% dei delitti totali** nel 2024 (erano lo 0,40% nel 2014) ma dominano percezione pubblica e copertura mediatica.

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

1. **Propensione alla denuncia**: la propensione a denunciare varia significativamente per tipo di reato e territorio. L'Indagine ISTAT 2022-2023 mostra che il Sud denuncia più della media nazionale per reati contro la proprietà (52,6% vs 44,7%) e per reati violenti (58,6% vs 41,6%), mentre Nord-est e Isole denunciano meno (vedi sezione "Propensione alla denuncia per territorio"). Un tasso più alto non significa necessariamente più criminalità reale. Di conseguenza, **classifiche e confronti Nord-Sud basati sui tassi di denuncia non sono interpretabili senza correzione per propensione**, correzione che ISTAT non fornisce a livello regionale/provinciale.

2. **Effetto turismo e pendolarismo**: regioni con alta presenza turistica (es. Lazio, Toscana) o forte pendolarismo mostrano tassi elevati perché il denominatore (popolazione residente) sottostima le persone effettivamente presenti.

3. **Province piccole**: province con meno di 150.000 abitanti possono mostrare variabilità elevata anno su anno per effetto statistico (con pochi eventi la variazione percentuale è alta). Conviene guardare l'andamento di più anni.

4. **Composizione reati**: territori diversi hanno mix diversi di reati. Il tasso totale maschera queste differenze qualitative.

5. **Eterogeneità interna**: il dato provinciale è una media su territori molto diversi tra loro. Una provincia come Milano include zone centrali ad alta densità (più furti, più denunce) e aree rurali con dinamiche opposte. Il tasso provinciale non rappresenta nessuna delle due realtà.

### Confini geografici

I confini regionali provengono dal dataset [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy) (limiti amministrativi ISTAT). La chiave di join è `reg_istat_code_num` (codice numerico regione).

## Frequenza di aggiornamento

### Delitti denunciati (ISTAT - esploradati.istat.it)

ISTAT pubblica i dati sui delitti denunciati con **oltre un anno di ritardo** rispetto all'anno di riferimento. I dati provengono dalla banca dati interforze del Ministero dell'Interno (SDI/SSD) e vengono elaborati e strutturati dall'ISTAT prima della pubblicazione su [esploradati.istat.it](https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,Z0840JUS,1.0/JUS_CRIMINAL/DCCV_DELITTIPS/IT1,73_67_DF_DCCV_DELITTIPS_1,1.0).

- **Dati 2024**: pubblicati su esploradati.istat.it a inizio 2026 (attualmente in uso in questa dashboard)
- **Dati 2025**: attesi indicativamente a **inizio 2027**

Non esiste un calendario fisso per questo aggiornamento. ISTAT pubblica un [calendario settimanale delle diffusioni](https://www.istat.it/attivita-e-servizi-per-tipo-di-utenti/giornalisti/appuntamenti/calendario-delle-diffusioni-e-degli-eventi/) che vale la pena monitorare. Schede qualità: [delitti denunciati da PdS, CC e GdF](https://www.istat.it/scheda-qualita/delitti-denunciati-allautorita-giudiziaria-da-polizia-di-stato-arma-dei-carabinieri-e-guardia-di-finanza/), [delitti con azione penale](https://www.istat.it/scheda-qualita/delitti-denunciati-per-i-quali-lautorita-giudiziaria-ha-iniziato-lazione-penale/).

### Perché non fonti alternative?

Il **Sole 24 Ore** pubblica annualmente un [Indice della criminalità](https://lab24.ilsole24ore.com/indice-della-criminalita/) con dati ottenuti in esclusiva dalla banca dati interforze del Ministero dell'Interno, tipicamente in anticipo rispetto a ISTAT. Tuttavia questi dati **non sono scaricabili** in formato strutturato. Un confronto incrociato tra i dati ISTAT usati in questo progetto e quelli pubblicati dal Sole 24 Ore (edizione 2025, dati 2024) mostra alta coerenza, con ranking provinciale identico e scarti sistematici dello 0,2-1,5% attribuibili a differenze nella popolazione di riferimento (vedi [analisi tecnica di confronto](https://github.com/AlbGri/datocrimine/blob/main/docs/confronto-sole24ore.md)).

Il **Ministero dell'Interno** pubblica dati aggregati aperti (licenza CC-BY) su [dati-coll.dfp.gov.it](https://dati-coll.dfp.gov.it/dataset/?tags=delitti&tags=denunce&tags=capoluogo&organization=min-interni&license_id=CC-BY-4.0&res_format=JSON), ma a marzo 2026 il dataset risulta fermo al 2022. La banca dati CED/SDI interforze resta riservata alle forze dell'ordine.

Di fatto, **l'unica fonte pubblica** con dati strutturati per provincia e tipologia di reato è ISTAT, con il suo ritardo di oltre un anno.

### Percezione di sicurezza (BES - ISTAT)

Il rapporto BES viene aggiornato **annualmente** in autunno:

- **BES 2024** (XII edizione): pubblicato a novembre 2025, con dati sulla percezione al 2024
- **BES 2025**: atteso indicativamente a **novembre 2026**

### Omicidi (ISTAT)

Questa dashboard utilizza i dati sugli omicidi dal dataset DCCV_DELITTIPS (delitti denunciati), che segue il ciclo di pubblicazione standard con **oltre un anno di ritardo**. Tuttavia, per gli omicidi ISTAT pubblica anche un report separato con ciclo più rapido, "[Le vittime di omicidio](https://www.istat.it/comunicato-stampa/le-vittime-di-omicidio-anno-2024/)", con **dati 2024 già disponibili** (pubblicato a novembre 2025). Chi cerca dati più aggiornati sugli omicidi può consultare direttamente quel report.

## Trasparenza

Questo progetto non afferma di mostrare "la criminalità in Italia", ma solo i dati ufficiali sulle denunce e sulla percezione, con piena consapevolezza dei limiti. L'obiettivo è facilitare la comprensione del divario tra percezione pubblica e dati registrati, non di dimostrare una tesi precostituita.

**Visite.** Il sito conta le visite con [GoatCounter](https://www.goatcounter.com), senza cookie e senza raccogliere dati personali. Per ogni pagina aperta arrivano a GoatCounter l'indirizzo della pagina, il sito da cui si è arrivati e la dimensione dello schermo; dall'indirizzo IP GoatCounter ricava il paese, ma non lo conserva. Servono solo a capire quali pagine vengono lette. Nessun altro servizio esterno riceve dati da chi visita il sito.

## Nota sul processo di sviluppo

Questo progetto è stato sviluppato con VS Code e [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic, modello Claude Opus), in un'interazione continua tra analista e modello. La scelta è voluta, perché un agente non costruisce da solo una dashboard statistica. Ogni grafico richiede decisioni metodologiche (quale indicatore esporre, a quale scala, con quale contesto), e queste decisioni sono il contenuto intellettuale del lavoro.

La statistica è uno strumento interpretativo, e come tale politico in senso ampio. Le stesse cifre possono sostenere narrazioni opposte a seconda di cosa si sceglie di mostrare, di come lo si aggrega e di cosa si omette. Per questo serve un collaboratore che propone e lascia decidere, più che un agente autonomo che esegue. La storia da raccontare la sceglie l'analista, e il modello aiuta a raccontarla meglio.

Codice sorgente, script di elaborazione e script per scaricare i dati dall'ISTAT sono pubblici su GitHub: https://github.com/AlbGri/datocrimine. I dati grezzi di delitti, autori e vittime non sono nel repository per le dimensioni. Si riscaricano con gli script `download_*.py`.