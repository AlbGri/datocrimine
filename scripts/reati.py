"""Etichette e gerarchia dei codici reato ISTAT, fonte unica per tutta la pipeline.

Etichette: forma breve dei nomi della codelist ISTAT di DELITTIPS. I codici CP***
(solo AUTVITTPS) sono articoli del codice penale: 572, 612-bis, 612-ter.

Gerarchia: il totale ISTAT e' la somma dei codici che non sono sottotipi di un altro.
La verifica sul raw e' in tests/test_reati.py: se ISTAT cambia classificazione, fallisce.
"""

ETICHETTE: dict[str, str] = {
    "TOT": "Totale",
    # Omicidi
    "INTENHOM": "Omicidi volontari consumati",
    "MAFIAHOM": "Omicidi di tipo mafioso",
    "ROBBHOM": "Omicidi a scopo di furto o rapina",
    "TERRORHOM": "Omicidi a scopo terroristico",
    "INFANTHOM": "Infanticidi",
    "MASSMURD": "Stragi",
    "ATTEMPHOM": "Tentati omicidi",
    "MANSHOM": "Omicidi preterintenzionali",
    "UNINTHOM": "Omicidi colposi",
    "ROADHOM": "Omicidi colposi da incidente stradale",
    # Violenza contro la persona
    "CULPINJU": "Lesioni dolose",
    "BLOWS": "Percosse",
    "MENACE": "Minacce",
    "KIDNAPP": "Sequestri di persona",
    "OFFENCE": "Ingiurie",
    "CP572": "Maltrattamenti in famiglia",
    "CP612BIS": "Atti persecutori (stalking)",
    # Reati sessuali e contro minori
    "RAPE": "Violenze sessuali",
    "RAPEUN18": "Atti sessuali con minorenne",
    "CORRUPUN18": "Corruzione di minorenne",
    "PORNO": "Pornografia minorile",
    "CP612TER": "Diffusione illecita di immagini sessuali",
    "PROSTI": "Sfruttamento e favoreggiamento della prostituzione",
    # Furti
    "THEFT": "Furti",
    "BAGTHEF": "Furti con strappo",
    "PICKTHEF": "Furti con destrezza",
    "BURGTHEF": "Furti in abitazioni",
    "SHOPTHEF": "Furti in esercizi commerciali",
    "VEHITHEF": "Furti in auto in sosta",
    "ARTTHEF": "Furti di opere d'arte",
    "TRUCKTHEF": "Furti di automezzi pesanti",
    "MOPETHEF": "Furti di ciclomotori",
    "MOTORTHEF": "Furti di motocicli",
    "CARTHEF": "Furti di autovetture",
    # Rapine
    "ROBBER": "Rapine",
    "HOUSEROB": "Rapine in abitazione",
    "BANKROB": "Rapine in banca",
    "POSTROB": "Rapine in uffici postali",
    "SHOPROB": "Rapine in esercizi commerciali",
    "STREETROB": "Rapine in pubblica via",
    # Altri reati contro il patrimonio
    "EXTORT": "Estorsioni",
    "USURY": "Usura",
    "RECEIV": "Ricettazione",
    "DAMAGE": "Danneggiamenti",
    "DAMARS": "Danneggiamento seguito da incendio",
    "ARSON": "Incendi",
    "FOREARS": "Incendi boschivi",
    # Frodi e informatica
    "SWINCYB": "Truffe e frodi informatiche",
    "CYBERCRIM": "Delitti informatici",
    "COUNTER": "Contraffazione di marchi",
    "INTPROP": "Violazione della proprietà intellettuale",
    # Criminalita' organizzata e altro
    "CRIMASS": "Associazione per delinquere",
    "MAFIASS": "Associazione di tipo mafioso",
    "MONEYLAU": "Riciclaggio",
    "DRUG": "Stupefacenti",
    "SMUGGL": "Contrabbando",
    "ATTACK": "Attentati",
    "OTHCRIM": "Altri delitti",
}

# Padre -> sottotipi. Gli altri codici sono voci autonome, anche quando il nome suggerisce
# il contrario (DAMARS non e' dentro ARSON, RAPEUN18 non e' dentro RAPE).
GERARCHIA: dict[str, frozenset[str]] = {
    "THEFT": frozenset({
        "BAGTHEF", "PICKTHEF", "BURGTHEF", "SHOPTHEF", "VEHITHEF",
        "ARTTHEF", "TRUCKTHEF", "MOPETHEF", "MOTORTHEF", "CARTHEF",
    }),
    "ROBBER": frozenset({"HOUSEROB", "BANKROB", "POSTROB", "SHOPROB", "STREETROB"}),
    "INTENHOM": frozenset({"MAFIAHOM", "ROBBHOM", "TERRORHOM"}),
    "ARSON": frozenset({"FOREARS"}),
    "UNINTHOM": frozenset({"ROADHOM"}),
}

SOTTOTIPI: frozenset[str] = frozenset().union(*GERARCHIA.values())
