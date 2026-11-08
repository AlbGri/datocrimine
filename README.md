# Osservatorio Criminalità

Un progetto open source per rendere accessibili e comprensibili i dati ufficiali ISTAT sulla criminalità in Italia. Nasce dalla constatazione che il dibattito pubblico sulla sicurezza si basa spesso su percezioni e titoli di giornale anziché sui dati: questo sito mette i numeri a disposizione di tutti, con metodologia trasparente e codice aperto.

**[Vai al sito](https://datocrimine.it)**

![Osservatorio Criminalità](public/og-image.png)

## Contenuti

**Navigazione principale:**
- **Report 2024** - Executive summary dell'anno: reati che spiegano la variazione dei delitti (sull'anno prima e sul 2019), mappa variazione regionale, confronto ripartizioni, reati di allarme sociale, percezione vs realtà
- **Esplora i dati** - Hub con 3 sezioni: Analisi Territoriale (mappa coropletica, ranking, trend, tabelle province), Reati di Allarme Sociale (6 reati gravi), Persone Denunciate (profilo criminale a 3 livelli)
- **Insights** - 23 analisi statistiche curate su trend, composizione demografica, anomalie, confronti tra categorie e territori. Filtri per categoria e dimensione, badge test statistici cliccabili
- **Il contesto** - KPI nazionali, trend delitti denunciati, percezione vs dati, numero oscuro e propensione alla denuncia

**Nel footer:**
- Metodologia, Guida alla Lettura, Dati e Codice

## Stack

- Next.js 16 (App Router, TypeScript, React 19)
- Tailwind CSS v4 + shadcn/ui
- Plotly.js (grafici interattivi)
- Deploy: GitHub Pages (export statico, GitHub Actions)

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri http://localhost:3000

## Dati

I dati ISTAT sono in `public/data/` come JSON, pronti per il frontend.

Per rigenerarli dai CSV sorgente (richiede conda + environment `osservatorio`):

```bash
conda activate osservatorio
python scripts/generate_popolazione.py
python scripts/generate_delittips.py
python scripts/generate_autori_vittime.py
python scripts/csv_to_json.py
python scripts/generate_insights.py
python scripts/generate_report.py
```

## Build

```bash
npm run build
```

Genera il sito statico nella cartella `out/`.

## Licenze

- **Codice**: [AGPL-3.0](LICENSE)
- **Documentazione e testi**: [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)
- **Dati ISTAT**: [CC BY 3.0 IT](https://creativecommons.org/licenses/by/3.0/it/) - elaborati da Osservatorio Criminalità
