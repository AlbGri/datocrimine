import { fraseSintesi } from "@/lib/sintesi";
import { NotaIngiurie } from "@/components/charts/nota-ingiurie";
import delittiItalia from "../../../public/data/delitti_italia.json";

export function SintesiNazionale() {
  const frase = fraseSintesi(delittiItalia.map((d) => ({ anno: d.Anno, tasso: d.Tasso_per_1000 })));
  if (!frase) return null;
  return (
    <div className="space-y-1">
      <p className="text-base sm:text-lg">{frase}</p>
      <NotaIngiurie />
    </div>
  );
}
