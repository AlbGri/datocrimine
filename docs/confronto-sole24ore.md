# Confronto dati ISTAT vs Sole 24 Ore - Indice della Criminalita 2025

Validazione incrociata dei dati del progetto (fonte ISTAT DCCV_DELITTIPS e DCCV_AUTVITTPS) contro i numeri pubblicati dal Sole 24 Ore nell'[Indice della Criminalita 2025](https://lab24.ilsole24ore.com/indice-della-criminalita/), basato sulla banca dati interforze del Ministero dell'Interno (SDI/SSD).

**Data confronto**: marzo 2026
**Edizione Sole 24 Ore**: 2025 (dati riferiti al 2024)

## Fonti a confronto

| | Progetto (ISTAT) | Sole 24 Ore |
|---|---|---|
| **Fonte primaria** | ISTAT esploradati.istat.it | Ministero dell'Interno (SDI/SSD) |
| **Dataset delitti** | DCCV_DELITTIPS (DF_1, DF_2, DF_8, DF_9) | Banca dati interforze (esclusiva) |
| **Dataset autori** | DCCV_AUTVITTPS (DF_7) | Banca dati interforze (esclusiva) |
| **Formato** | SDMX REST API, scaricabile | Non scaricabile, solo articolo |
| **Replicabilita** | Completa (script in `scripts/`) | Non replicabile |

I dati ISTAT e quelli del Ministero dell'Interno hanno la stessa origine (denunce delle forze di polizia tramite sistema SDI/SSD). ISTAT riceve i microdati dal Ministero e li elabora per la pubblicazione statistica. Le differenze possono derivare da: tempi diversi di consolidamento, classificazioni marginalmente diverse, popolazioni di riferimento diverse per il calcolo dei tassi.

---

## 1. Delitti totali - livello nazionale

### Dati di riferimento

```
File: public/data/delitti_italia.json
Struttura record:
{
  "Anno": 2024,
  "Delitti": 2399347,
  "Popolazione": 58971230,
  "Tasso_per_1000": 40.69
}
```

### Confronto

| Dato | Sole 24 Ore | ISTAT (nostro) | Scarto |
|---|---|---|---|
| Delitti 2024 | ~2.380.000 ("2,38 milioni") | 2.399.347 | +0,8% |
| Delitti 2023 | (non esplicito) | 2.341.574 | - |
| Delitti 2014 | (non esplicito) | 2.812.936 | - |
| Var. 2024/2023 | +1,7% | +2,47% | **+0,77 p.p.** |
| Var. 2024/2014 | -15% | -14,70% | -0,30 p.p. |

### Calcolo variazioni (replicabile)

```python
# Da delitti_italia.json
delitti_2024 = 2_399_347
delitti_2023 = 2_341_574
delitti_2014 = 2_812_936

var_2024_vs_2023 = (delitti_2024 - delitti_2023) / delitti_2023 * 100  # +2.47%
var_2024_vs_2014 = (delitti_2024 - delitti_2014) / delitti_2014 * 100  # -14.70%
```

### Note

- Il Sole arrotonda il totale a "2,38 milioni". Il dato ISTAT e piu preciso: 2.399.347.
- La variazione +1,7% del Sole diverge dal nostro +2,47%. Possibili cause: il Ministero potrebbe aver consolidato il dato 2023 con una cifra diversa rispetto a ISTAT, oppure il Sole usa un perimetro reati leggermente diverso. La direzione del trend e comunque concorde.

---

## 2. Delitti per provincia - tassi e totali 2024

### Dati di riferimento

```
File: public/data/delitti_province.json
Struttura record:
{
  "REF_AREA": "ITC11",
  "Territorio": "Milano",
  "Anno": 2024,
  "Delitti": 226860,
  "Regione": "Lombardia",
  "Popolazione": 3245459,
  "Tasso_per_1000": 69.90
}
```

### Top 5 (province con piu reati per 100k ab.)

| Rank | Provincia | Sole (tasso/100k) | ISTAT (tasso/100k) | Sole (totale) | ISTAT (totale) | Scarto tasso | Scarto totale |
|---|---|---|---|---|---|---|---|
| 1 | Milano | 6.952,3 | 6.990 | 225.786 | 226.860 | +0,5% | +0,5% |
| 2 | Firenze | 6.507,8 | 6.564 | 64.392 | 64.908 | +0,9% | +0,8% |
| 3 | Roma | 6.401,9 | 6.432 | 270.407 | 271.779 | +0,5% | +0,5% |
| 4 | Bologna | 6.055,3 | 6.116 | 61.816 | 62.233 | +1,0% | +0,7% |
| 5 | Rimini | 5.995,6 | 6.047 | 20.425 | 20.549 | +0,9% | +0,6% |

### Bottom 5 (province con meno reati per 100k ab.)

| Rank | Provincia | Sole (tasso/100k) | ISTAT (tasso/100k) | Sole (totale) | ISTAT (totale) | Scarto tasso | Scarto totale |
|---|---|---|---|---|---|---|---|
| 102 | Sondrio | 2.318,3 | 2.342 | 4.151 | 4.190 | +1,0% | +0,9% |
| 103 | Enna | 2.309,9 | 2.324 | 3.520 | 3.569 | +0,6% | +1,4% |
| 104 | Benevento | 2.222,6 | 2.227 | 5.771 | 5.822 | +0,2% | +0,9% |
| 105 | Potenza | 1.983,0 | 1.988 | 6.758 | 6.824 | +0,3% | +1,0% |
| 106 | Oristano | 1.572,7 | 1.584 | 2.326 | 2.361 | +0,7% | +1,5% |

### Altre province citate nell'articolo

| Provincia | Sole (tasso/100k) | ISTAT (tasso/100k) | Scarto |
|---|---|---|---|
| Napoli | 4.479 | 4.484 | +0,1% |
| Palermo | 3.936 | 3.943 | +0,2% |

### Calcolo (replicabile)

```python
import json

with open("public/data/delitti_province.json") as f:
    province = json.load(f)

# Filtra anno 2024, cerca Milano
milano_2024 = [p for p in province if p["Territorio"] == "Milano" and p["Anno"] == 2024][0]
print(f"Delitti: {milano_2024['Delitti']}")              # 226860
print(f"Popolazione: {milano_2024['Popolazione']}")      # 3245459
print(f"Tasso/1000: {milano_2024['Tasso_per_1000']}")    # 69.90
print(f"Tasso/100k: {milano_2024['Tasso_per_1000'] * 100}")  # 6990.0
```

### Note

- Il ranking delle 106 province e identico tra le due fonti.
- I dati ISTAT sono sistematicamente piu alti dello 0,2-1,5%. La differenza piu probabile e nella popolazione usata come denominatore: ISTAT usa la popolazione residente al 1 gennaio (fonte DCIS_POPRES1), il Ministero potrebbe usare una stima diversa.
- Anche il numeratore (totale delitti) mostra scarti minimi ma consistenti (~+0,5% ISTAT), suggerendo un perimetro di reati leggermente diverso o dati consolidati in momenti diversi.

---

## 3. Variazioni anno su anno (2024 vs 2023) per provincia

### Dati di riferimento

```python
import json

with open("public/data/delitti_province.json") as f:
    province = json.load(f)

def variazione(territorio):
    d24 = [p for p in province if p["Territorio"] == territorio and p["Anno"] == 2024][0]
    d23 = [p for p in province if p["Territorio"] == territorio and p["Anno"] == 2023][0]
    var = (d24["Delitti"] - d23["Delitti"]) / d23["Delitti"] * 100
    return d23["Delitti"], d24["Delitti"], var

# Esempio: Milano
# 2023: 230,337 -> 2024: 226,860 = -1.51%
```

### Confronto

| Provincia | Sole (var. 2024/2023) | ISTAT 2023 | ISTAT 2024 | ISTAT var. | Scarto |
|---|---|---|---|---|---|
| Milano | -2,00% | 230.337 | 226.860 | -1,51% | +0,49 p.p. |
| Firenze | +7,40% | 59.953 | 64.908 | +8,26% | +0,86 p.p. |
| Roma | +5,29% | 256.832 | 271.779 | +5,82% | +0,53 p.p. |
| Bologna | +9,59% | 56.409 | 62.233 | +10,32% | +0,73 p.p. |
| Rimini | +0,03% | 20.543 | 20.549 | +0,03% | 0,00 p.p. |
| Sondrio | -1,10% | 4.237 | 4.190 | -1,11% | -0,01 p.p. |
| Enna | -3,06% | 3.682 | 3.569 | -3,07% | -0,01 p.p. |
| Benevento | -3,78% | 6.051 | 5.822 | -3,79% | -0,01 p.p. |
| Potenza | +1,70% | 6.710 | 6.824 | +1,70% | 0,00 p.p. |
| Oristano | -1,36% | 2.394 | 2.361 | -1,38% | -0,02 p.p. |

### Note

- Le variazioni per le province minori (Rimini, Sondrio, Enna, Benevento, Potenza, Oristano) sono quasi identiche (scarto < 0,02 p.p.).
- Le grandi province mostrano scarti maggiori (0,5-0,9 p.p.), probabilmente perche il numeratore (totale delitti) differisce di piu in valore assoluto tra le due fonti.
- La direzione (crescita/calo) e sempre concorde.

---

## 4. Reati specifici per provincia (da dati raw)

Questi dati provengono dai CSV grezzi ISTAT (DCCV_DELITTIPS DF_2, numeri assoluti per provincia). Non sono esposti nei JSON del frontend ma sono disponibili nei file sorgente.

### Dati di riferimento

```
File: data/raw/delittips/delittips_2.csv (DF_2: province, numeri assoluti)
Codici reato ISTAT:
- PICKTHEF = Furti con destrezza
- STREETROB = Rapine in pubblica via
```

### Confronto

| Provincia | Reato | Sole 24 Ore | ISTAT raw | Scarto |
|---|---|---|---|---|
| Bologna | Rapine in pubblica via | 701 | **701** | **0 (identico)** |
| Firenze | Furti con destrezza | 11.051 | 11.090 | +39 (+0,4%) |
| Roma | Furti con destrezza | 33.431 | 33.468 | +37 (+0,1%) |
| Roma | Rapine in pubblica via | 2.008 | 2.016 | +8 (+0,4%) |

### Note

- Il dato delle rapine in pubblica via a Bologna e perfettamente identico (701).
- I furti con destrezza mostrano scarti minimi (37-39 unita su migliaia), compatibili con rettifiche marginali tra le due fonti.

---

## 5. Persone denunciate/arrestate - livello nazionale

### Dati di riferimento

```
File: public/data/autori_vittime_trend.json
Struttura record:
{
  "data_type": "OFFEND",
  "codice_reato": "PICKTHEF",
  "reato": "Furti con destrezza",
  "anno": 2024,
  "totale": 2177,
  "stranieri": 1327,
  "minori": 291,
  "maschi": 1224,
  "femmine": 953,
  "pct_stranieri": 61.0,
  "pct_maschi": 56.2,
  "pct_femmine": 43.8,
  "pct_minori": 13.4
}
```

### Confronto

| Dato | Sole 24 Ore | ISTAT (somma per reato) | Confrontabile? |
|---|---|---|---|
| Totale denunciati/arrestati 2024 | 828.714 | ~584.514 | **No** |
| Minori segnalati 2024 | 38.247 | ~36.501 | **Parziale** |
| Stranieri denunciati 2024 | 287.396 | ~218.105 | **No** |

### Perche i numeri non sono confrontabili

Il Sole usa il dato **TOT** (totale complessivo) del Ministero dell'Interno. ISTAT non pubblica il TOT per gli anni 2023-2024 (criticita nota del dataset DCCV_AUTVITTPS). I numeri sopra sono ottenuti sommando i singoli reati nel JSON, ma questa somma e **strutturalmente inferiore** al totale reale per due motivi:

1. **Reati non mutuamente esclusivi**: una persona denunciata per piu reati viene contata una sola volta nel TOT del Ministero, ma piu volte nella somma per reato.
2. **Sottoinsieme di reati**: il dataset ISTAT AUTVITTPS copre un sottoinsieme dei reati totali, non tutti quelli registrati nella banca dati interforze.

Paradossalmente, il primo fattore gonfia la somma e il secondo la riduce, ma il secondo prevale nettamente.

### Calcolo (replicabile)

```python
import json

with open("public/data/autori_vittime_trend.json") as f:
    data = json.load(f)

# Somma autori 2024 per tutti i reati (NON e il totale reale)
autori_2024 = [d for d in data if d["data_type"] == "OFFEND" and d["anno"] == 2024]
totale_somma = sum(d["totale"] for d in autori_2024)
stranieri_somma = sum(d["stranieri"] for d in autori_2024 if d["stranieri"] is not None)
minori_somma = sum(d["minori"] for d in autori_2024 if d["minori"] is not None)

print(f"Somma totale: {totale_somma}")       # ~584.514 (NON confrontabile con 828.714)
print(f"Somma stranieri: {stranieri_somma}")  # ~218.105 (NON confrontabile con 287.396)
print(f"Somma minori: {minori_somma}")        # ~36.501
```

---

## 6. Dati qualitativi dall'articolo

L'articolo del Sole cita anche affermazioni non numeriche verificabili contro i nostri dati:

| Affermazione Sole 24 Ore | Verifica ISTAT |
|---|---|
| "Quarto anno consecutivo di aumento delle denunce" | Confermato: 2021 < 2022 < 2023 < 2024 nel nostro dataset |
| "Illeciti oltre i livelli 2018" | Confermato: 2024 (2.399.347) > 2018 (2.340.003) |
| "Milano: 618 denunce al giorno" | Confermato: 226.860 / 366 = 619,8 (2024 e bisestile) |
| "Stranieri > 1/3 dei segnalati" | Non verificabile con i nostri dati (TOT assente) |
| "47,9% crimini nelle 14 citta metropolitane" | Verificabile sommando le 14 province metropolitane dal nostro JSON |

---

## Conclusioni

1. **Delitti provinciali (tassi e totali)**: alta coerenza. Ranking identico su 106 province. Scarti sistematici dello 0,2-1,5%, attribuibili a differenze nella popolazione usata come denominatore e/o nel perimetro esatto dei reati conteggiati.

2. **Reati specifici per provincia**: quasi identici. In un caso (rapine Bologna) il dato e perfettamente uguale. Scarti residui nell'ordine di poche decine su migliaia.

3. **Variazioni anno su anno**: direzione sempre concorde. Scarti nelle grandi province (0,5-0,9 p.p.) probabilmente amplificati dalle differenze nei valori assoluti di base.

4. **Persone denunciate**: non confrontabile. Il Ministero dell'Interno fornisce un totale aggregato (828.714) che ISTAT non pubblica per 2023-2024. Questa e una limitazione nota del dataset ISTAT.

5. **Affidabilita complessiva**: i dati ISTAT del progetto sono coerenti con la fonte del Ministero dell'Interno usata dal Sole 24 Ore. Le differenze sono marginali, sistematiche e spiegabili. Il ranking provinciale e identico.

---

*Confronto effettuato a marzo 2026. Fonte Sole 24 Ore: [Indice della Criminalita 2025](https://lab24.ilsole24ore.com/indice-della-criminalita/). Fonte ISTAT: DCCV_DELITTIPS e DCCV_AUTVITTPS scaricati via API SDMX REST da esploradati.istat.it.*
