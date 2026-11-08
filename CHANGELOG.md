# Changelog

## 2026-11-08 — Il quadro in una frase
- In cima alla home e al report una frase riassume la tendenza: in calo nel lungo periodo, in risalita dal 2021. Si aggiorna da sola con i dati
- Nel report il riferimento è il tasso del 2019, l'ultimo anno prima del COVID, al posto della media degli anni precedenti

## 2026-11-08 — CSV leggibili da Excel
- I file CSV delle tabelle provinciali usano la virgola decimale in tutte le colonne, come Excel in italiano

## 2026-11-08 — Icone e formato dei numeri
- Le frecce delle sezioni e il pulsante dell'animazione non vengono più mostrati come emoji
- Decimali con la virgola anche nella sezione Il Numero Oscuro e nella Metodologia
- Separatore delle migliaia anche nei numeri a quattro cifre (3.858, non 3858)

## 2026-11-08 — Sito più leggero
- Le pagine con grafici scaricano circa un terzo dei dati di prima (la home da 1,6 MB a circa 650 KB)
- La mappa delle regioni scarica 42 KB invece di 1,2 MB
- Le mappe non chiedono più nulla a siti esterni
- Mappa del report senza i confini degli Stati vicini

## 2026-11-08 — Nuovo nome: DatoCrimine
- Il sito si chiama DatoCrimine, come il suo indirizzo: "Osservatorio" faceva pensare a un ente pubblico
- Condividendo una pagina, l'anteprima mostra titolo e indirizzo di quella pagina, non quelli della home; il Report 2024 ha di nuovo l'immagine
- Nuova immagine di anteprima, da 2,3 MB a 11 KB

## 2026-11-08 — Correzioni su mappa, KPI e testi
- Mappa e classifica delle regioni: la scala di colore arriva al tasso più alto registrato, non a 100, ed è uguale per tutti gli anni; le differenze fra regioni si vedono meglio
- KPI "Variazione totale autori": confronto fra 2022 e 2019 (ultimo anno prima del COVID), non più fra medie che includevano il 2020 e il 2021
- Corretti accenti e un rinvio a una sezione rinominata

## 2026-11-08 — Report 2024 rivisto
- "Cosa è cambiato" mostra quali reati spiegano la variazione dei delitti denunciati, rispetto all'anno prima e al 2019 (ultimo anno prima del COVID). Sostituisce la classifica per variazione percentuale degli autori denunciati, dominata da reati con poche centinaia di casi
- Niente più "trend storico stabile" su serie di pochi anni; dove non c'è una tendenza chiara il report scrive "nessuna tendenza storica netta"
- Corrette sette variazioni calcolate su tassi già arrotondati (omicidi volontari -4,4%, non -5,2%)
- L'avviso sulla propensione alla denuncia commenta la variazione mostrata
- Ogni numero del report è verificato in automatico contro i dati

## 2026-11-08 — Insight corretti e verificati
- Corretti i numeri degli insight su reati violenti, patrimoniali e informatici: alcuni reati erano contati due volte. Le vittime di reati violenti calano del 12,9% dal 2007, non crescono
- I grafici per Nord, Centro e Sud usano le medie pesate per popolazione, le stesse dei testi
- Nuovo insight sul quadro complessivo degli autori stranieri; titoli piu' precisi su rapine, violenze sessuali e omicidi di donne
- Tolti due insight che non superano la correzione statistica; la pagina passa da 23 a 21 insight
- Ogni numero degli insight e' ora verificato in automatico contro i dati

## 2026-11-08 — Nomi e categorie dei reati
- Corretti i nomi di cinque reati nella sezione Persone denunciate (gli incendi boschivi comparivano come "porto abusivo di armi", le ingiurie come "resistenza a pubblico ufficiale"); ogni reato ha ora lo stesso nome in tutte le pagine
- Grafico dei delitti per tipologia: le categorie sommano al totale, senza reati contati due volte; le ingiurie, depenalizzate nel 2016, sono una categoria a parte
- Profili per reato: i sottotipi (come i furti in esercizi commerciali) non compaiono piu' accanto alla voce che li contiene

## 2026-03-29 — Revisione grafica
- Colori di stranieri, maschi, femmine e minori distinguibili e uguali su tutto il sito
- Caratteri e legende dei grafici uniformi, tolti i titoli d'asse ripetuti
- Insight: corretta la nota sul genere e l'uso di "straniere"
- Titolo piu' preciso per l'insight sulle truffe al Nord, link fra insight e report nei due sensi, avviso sui limiti dei dati in homepage

## 2026-03-28 — Correzioni dopo un controllo completo del sito
- Corrette le etichette scambiate fra scippi e borseggi (l'insight diventa "furti con strappo")
- Separatore delle migliaia anche nei tooltip dove mancava
- Insight sull'usura: linee di autori e vittime non piu' invertite
- Accessibilita': menu su mobile, grafici degli insight e pulsanti dell'anno leggibili dai lettori di schermo; titolo principale in homepage

## 2026-03-26/27 — Grafici negli insight
- Ognuno dei 23 insight ha un grafico che si apre sotto il testo, con una nota sulla composizione delle categorie
- Negli insight sulle quote (% stranieri, % donne) anche i valori assoluti, su un secondo asse
- Scelta fra tasso e numero assoluto su 7 grafici di andamento
- Note informative sui grafici per tipologia e sul numero oscuro
- Riscritto l'avviso su percezione e dati, tolti i KPI ripetuti
- Tooltip con numeri formattati e nomi interi; corretto il link al report completo degli insight
- Nuova favicon

## 2026-03-24/25
- Numeri in formato italiano su tutto il sito
- Grafico delle categorie di delitti senza sovrapposizioni (prima alcuni reati contavano due volte)
- Tooltip del report in italiano
- Insight su percezione e realta' rivisto: correlazione di Spearman, testo piu' cauto
- Persone denunciate: l'andamento viene prima del profilo

## 2026-03-23
- Stalking in una serie unica 2009-2024 (unite le due codifiche ISTAT)
- Corretti il periodo dello stalking in Metodologia e i testi sull'anno di riferimento
- Nuova immagine di anteprima per i social
- Documentazione allineata prima del lancio

## 2026-03-22 — Navigazione e dominio
- Navbar ridotta da 9 a 4 voci: Report 2024, Esplora i dati, Insights, Il contesto
- Nuova pagina hub `/esplora` con 3 card (Territoriale, Allarme Sociale, Persone Denunciate)
- Metodologia, Guida alla Lettura, Dati e Codice spostati nel footer
- Banner CTA Report 2024 in homepage
- Dominio `datocrimine.it` configurato (DNS Cloudflare, GitHub Pages)
- Rimosso basePath, aggiornati URL in metadata/robots/sitemap/CNAME
- Disclaimer indipendenza nel footer
- Rinominato repo da `osservatorio-criminalita-next` a `datocrimine`
- Rimosso fullscreen grafici Plotly (bug non risolvibile: layout non ripristina dimensioni)

## 2026-03-22 — Report annuale interattivo
- Nuova pagina `/report/2024`: executive summary, top crescita/calo autori denunciati, mappa variazione regionale, confronto ripartizioni, reati allarme sociale, percezione vs realta
- Script `scripts/generate_report.py` con CLI `--anno`, produce `public/data/report_{anno}.json`
- Blocchi narrativi automatici: contesto (YoY vs trend strutturale), caveat (propensione denuncia), nota (contesto esterno), link insight
- Filtro soglia minima (100 autori) per escludere variazioni % su numeri irrilevanti
- Normalizzazione accenti (apostrofi pipeline ISTAT -> accenti) nel JSON del report
- 62 test pytest per generate_report.py (contesto, caveat, variazioni, regioni, ripartizioni)

## 2026-03-22
- Insights: badge test statistici cliccabili (Mann-Kendall, Spearman, Divergenza, Confronto categorie/territoriale, Rapporto A/V) al posto di alta/media, con scroll alla nota metodologica
- Insights: filtri per categoria (5) e dimensione (3), vista adattiva raggruppata/piatta
- Insights: curazione v2 con dati aggiornati, linguaggio accessibile, testi che esplicitano gradualita' dei trend
## 2026-03-21
- Insights: fix metodologici v2 (gestione COVID, detrending Spearman, salto massimo, incrocio numero oscuro, rapporto autori/vittime, warning bassa potenza)
- Insights: pagina `/insights` con 23 card in 5 categorie, nota metodologica, disclaimer sperimentale
- Insights: script `generate_insights.py` con 11 tipi di analisi, 2209 combinazioni, correzione FDR
- Profilo criminale nazionale con selettore metrica e anno, top 10 + "Altro" espandibile
- Profilo criminale regionale e provinciale con tasso per 100k e marker media nazionale
- Sezioni collassabili (`CollapsibleSection`) su tutte le pagine
- Sincronizzazione filtri cross-pagina (`FilterSyncProvider`)
- Ordinamento alfabetico globale selettori, "Totale" sempre primo
- Trend nazionale multi-dimensionale (%, stranieri, maschi, femmine, minori su asse destro)

## 2026-03-18
- Pipeline popolazione estesa a 2002-2018 (intercensuaria) + 2019+ (POPRES1)
- Tasso per 100k autori/vittime regionale dal 2007

## 2026-03-17
- Pipeline SDMX completa: `generate_delittips.py`, `generate_popolazione.py`
- Deploy GitHub Pages con GitHub Actions

## Pre-2026-03-17
- Dashboard iniziale: Home (KPI, trend, percezione, numero oscuro), Analisi Territoriale (mappa, ranking, trend, tabelle province), Reati Allarme Sociale (6 reati gravi), Persone Denunciate (autori/vittime con breakdown), Metodologia, Guida, Dati e Codice
- Stack: Next.js + Tailwind v4 + shadcn/ui + Plotly.js
