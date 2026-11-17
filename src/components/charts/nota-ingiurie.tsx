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
