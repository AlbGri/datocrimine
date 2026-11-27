import Link from "next/link";

export function NotaIngiurie() {
  return (
    <p className="text-sm text-muted-foreground">
      Il totale esclude le ingiurie, depenalizzate nel 2016, per confrontare gli anni a parità di
      reati.{" "}
      <Link href="/metodologia" className="rimando">
        Dettagli nella Metodologia
      </Link>
    </p>
  );
}

// Le persone non si sottraggono come i delitti: chi e' denunciato per piu' reati conta una volta
export function NotaIngiuriePersone() {
  return (
    <p className="text-sm text-muted-foreground">
      Fino al 2017 il totale comprende le persone denunciate per ingiuria, depenalizzata nel 2016,
      e parte del calo successivo viene da lì. Non si possono togliere, perché chi è denunciato per
      più reati conta una volta sola.
    </p>
  );
}
