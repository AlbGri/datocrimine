# Osservatorio Criminalit&agrave;

Un progetto open source per rendere accessibili e comprensibili i dati ufficiali ISTAT sulla criminalit&agrave; in Italia. Nasce dalla constatazione che il dibattito pubblico sulla sicurezza si basa spesso su percezioni e titoli di giornale anzich&eacute; sui dati: questo sito mette i numeri a disposizione di tutti, con metodologia trasparente e codice aperto.

**[Vai al sito](https://albgri.github.io/osservatorio-criminalita-next/)**

![Osservatorio Criminalit&agrave;](public/og-image.png)

## Contenuti

- **Home** - KPI nazionali, trend delitti denunciati, percezione vs dati, numero oscuro e propensione alla denuncia
- **Analisi Territoriale** - Mappa coropletica regioni con frecce trend, ranking regionale, trend regione/provincia, tabella province con filtro
- **Reati di Allarme Sociale** - Focus su 6 reati rari ad alto impatto (omicidi, violenze sessuali, rapine in abitazione, ecc.): trend nazionale, ranking regionale, trend regione/provincia, tabella province
- **Persone Denunciate** - Autori denunciati e vittime di delitto: breakdown per sesso, cittadinanza e et&agrave;, trend nazionale, ranking regionale, trend regione/provincia, tabella province (toggle Autori/Vittime)
- **Metodologia** - Principi metodologici, fonti, frequenza aggiornamento e trasparenza
- **Guida alla Lettura** - Come interpretare grafici e dati, cosa non si pu&ograve; concludere, bias noti
- **Dati e Codice** - Dataset, istruzioni per replicare, licenze

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Plotly.js (grafici interattivi con fullscreen)
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
python scripts/generate_delittips.py
python scripts/generate_popolazione.py
python scripts/csv_to_json.py
python scripts/generate_autori_vittime.py
```

## Build

```bash
npm run build
```

Genera il sito statico nella cartella `out/`.

## Licenze

- **Codice**: [AGPL-3.0](LICENSE)
- **Documentazione e testi**: [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)
- **Dati ISTAT**: [CC BY 3.0 IT](https://creativecommons.org/licenses/by/3.0/it/) - elaborati da Osservatorio Criminalita
