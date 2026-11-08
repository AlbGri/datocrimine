# Fonti dei dati

Da dove viene ogni dato del sito, come si riscarica e quale file produce. I comandi per rifare
l'intera elaborazione sono nel [README](../README.md#dati).

## 1. Delitti denunciati (DCCV_DELITTIPS)

| Campo | Valore |
|-------|--------|
| Dataset | DCCV_DELITTIPS, delitti denunciati dalle forze di polizia all'autorità giudiziaria |
| Portale | [esploradati.istat.it](https://esploradati.istat.it), servizio SDMX |
| Copertura | Italia, ripartizioni, 20 regioni, 106 province; 55 tipologie di reato; 2014-2024 |
| Download | `scripts/download_delittips.py` (automatico) |
| Usato | dataflow 1 (numeri assoluti per territorio e reato), in `data/raw/delittips/delittips_1.csv` |
| Genera | `delitti_italia.json`, `delitti_regioni.json`, `delitti_province.json`, `delitti_categorie.json`, `delitti_reati_italia.json`, `reati_allarme_sociale*.json`, tasso di `percezione_vs_dati.json` |
| Scaricato | 17 marzo 2026 |

Lo script scarica tutti i 9 dataflow del dataset; il sito ne usa uno.

## 2. Autori e vittime di delitto (DCCV_AUTVITTPS)

| Campo | Valore |
|-------|--------|
| Dataset | DCCV_AUTVITTPS, autori denunciati o arrestati e vittime di delitto |
| Portale | [esploradati.istat.it](https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,Z0840JUS,1.0/JUS_CRIMINAL/DCCV_AUTVITTPS), servizio SDMX |
| Copertura | 2007-2024; province solo dal 2022; totale di tutti i reati solo fino al 2022 |
| Download | `scripts/download_autvittps.py` (automatico) |
| Usato | dataflow 7 (autori) e 8 (vittime): sesso, minori e adulti, cittadinanza, per provincia |
| Genera | `autori_vittime_trend.json`, `autori_vittime_reati.json`, `autori_vittime_regioni.json`, `autori_vittime_province.json`, `reati_gerarchia.json` |

Lo script scarica tutti gli 8 dataflow del dataset; il sito ne usa due.

## 3. Percezione del rischio di criminalità

| Campo | Valore |
|-------|--------|
| Indicatore | Famiglie che percepiscono molto o abbastanza rischio di criminalità nella zona in cui abitano (Indagine Multiscopo ISTAT) |
| Portale | dati.istat.it: Giustizia e sicurezza > Indagine Multiscopo > "Famiglie per presenza di alcuni problemi nella zona in cui abitano: rischio di criminalità: molto e abbastanza", Italia, tutti gli anni |
| Copertura | Italia, 2014-2024 |
| Download | manuale, in `data/raw/percezione_criminalita_istat.csv` |
| Genera | colonna `Percezione_pct` di `percezione_vs_dati.json` |

Il dato 2024 (26,6%) è stato aggiunto a mano da [Noi Italia 2025](https://noi-italia.istat.it/pagina.php?id=3&categoria=9&action=show&L=0):
non era ancora nel dataset scaricabile.

## 4. Popolazione residente

Serve per i tassi (delitti per 1.000 o per 100.000 abitanti). Due fonti, unite da
`scripts/generate_popolazione.py` in `data/processed/popolazione_regioni_province.csv`:
il 2019, presente in entrambe, viene da DCIS_POPRES1.

### 4a. Ricostruzione intercensuaria, 2014-2018

| Campo | Valore |
|-------|--------|
| Portale | [demo.istat.it](https://demo.istat.it/app/?i=RIC): Ricostruzione intercensuaria > Popolazione per età, singola area |
| Selezione | tutte le età, tutti gli anni; un file per Italia e ripartizioni, uno per le regioni, uno per ciascuna provincia (non c'è un export unico) |
| Download | manuale; i file sono già nel repository, in `data/raw/popolazione/` |
| Scaricato | ripartizioni 6 gennaio 2026, regioni e province 22 febbraio 2026 |

### 4b. DCIS_POPRES1, dal 2019

| Campo | Valore |
|-------|--------|
| Dataset | [DCIS_POPRES1](https://esploradati.istat.it/databrowser/#/it/dw/categories/IT1,POP,1.0/POP_POPULATION/DCIS_POPRES1/IT1,22_289_DF_DCIS_POPRES1_1,1.0), popolazione residente al 1° gennaio |
| Selezione | sesso, età e stato civile totali; Italia, regioni e province |
| Copertura | 2019-2025 |
| Download | `scripts/download_popolazione.py` (automatico), in `data/raw/popolazione/popres1.csv` |

## 5. Propensione alla denuncia (numero oscuro)

Percentuali trascritte a mano dai report ISTAT nel grafico `src/components/charts/chart-numero-oscuro.tsx`:
non esistono come file di dati.

| Report | Dati usati |
|--------|------------|
| [Reati contro la persona e contro la proprietà: vittime ed eventi, 2022-2023](https://www.istat.it/comunicato-stampa/reati-contro-la-persona-e-contro-la-proprieta-vittime-ed-eventi-2022-2023/), tavola 6 | quota di vittime che denunciano, per tipo di reato e per macroarea |
| [Report completo 2022-2023 (PDF)](https://www.istat.it/wp-content/uploads/2025/06/Report_REATI-CONTRO-LA-PERSONA-E-LA-PROPRIETA_VITTIME-ED-EVENTI.pdf) | quota di vittime che denunciano, per 5 reati |
| [Reati contro la persona e contro la proprietà, 2015-2016 (PDF)](https://www.istat.it/it/files/2019/02/Reati-contro-la-persona-e-contro-la-proprieta.pdf), prospetto 6 | propensione alla denuncia per macroarea, 9 reati, per il confronto storico |
| [La violenza contro le donne dentro e fuori la famiglia, primi risultati 2025](https://www.istat.it/comunicato-stampa/la-violenza-contro-le-donne-dentro-e-fuori-la-famiglia-primi-risultati-anno-2025/) | quota di violenze da partner denunciate |

## 6. Confini delle regioni

| Campo | Valore |
|-------|--------|
| Fonte | [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy), file `geojson/limits_IT_regions.geojson` |
| Uso | mappe regionali, unite ai dati con il codice ISTAT della regione (`reg_istat_code_num`) |
| Download | manuale, in `data/raw/geojson_regioni_italia.geojson`, copiato in `public/data/` |
| Scaricato | 22 febbraio 2026 |
| Semplificato | `npx mapshaper@0.6 limits_IT_regions.geojson -simplify 10% keep-shapes -o geojson_regioni_italia.geojson precision=0.0001 gj2008`: da 2,9 MB a 140 KB, a scala regionale non si vede differenza. `gj2008` tiene i confini in senso orario, come vuole Plotly: senza, ogni regione riempie la mappa |

## 7. Dai dati grezzi al sito

1. **Download**: i tre script `download_*.py` per delitti, autori e vittime e popolazione dal 2019;
   le altre fonti sono già nel repository
2. **Elaborazione**: `generate_popolazione.py`, `generate_delittips.py` (7 CSV in `data/processed/`
   e i JSON dei reati di allarme per regioni e province), `generate_autori_vittime.py`,
   poi `csv_to_json.py`, che converte i CSV in JSON per il sito
3. **Analisi**: `generate_insights.py` e `generate_report.py`, per ultimi perché leggono i JSON
   già in `public/data/`

Nel grafico dei delitti per tipologia i reati sono raggruppati in 7 categorie che non si
sovrappongono e sommano al totale: furti, rapine, violenze contro la persona, truffe e frodi,
droga, altro e ingiurie. Le ingiurie, depenalizzate nel 2016, stanno a parte per non falsare
l'andamento di "altro".

Il servizio SDMX dell'ISTAT accetta poche richieste al minuto e a volte risponde con errori
temporanei: gli script aspettano fra una richiesta e l'altra e riprovano.
