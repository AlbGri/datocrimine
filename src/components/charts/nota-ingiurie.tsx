import Link from "next/link";

export function NotaIngiurie() {
  return (
    <p className="text-sm text-muted-foreground">
      Totale al netto delle ingiurie, depenalizzate nel 2016: così gli anni si confrontano a parità
      di reati.{" "}
      <Link href="/metodologia" className="underline hover:text-foreground">
        Dettagli nella Metodologia
      </Link>
    </p>
  );
}

// Le persone non si sottraggono come i delitti: chi e' denunciato per piu' reati conta una volta
export function NotaIngiuriePersone() {
  return (
    <p className="text-sm text-muted-foreground">
      Fino al 2017 il totale comprende le persone denunciate per ingiuria, depenalizzata nel 2016:
      parte del calo successivo viene da lì. Non si possono togliere, perché chi è denunciato per
      più reati conta una volta sola.
    </p>
  );
}
