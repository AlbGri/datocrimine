"use client";

import { useFetchData } from "@/lib/use-fetch-data";
import { fraseSintesi } from "@/lib/sintesi";
import { NotaIngiurie } from "@/components/charts/nota-ingiurie";

interface DelittiItalia {
  Anno: number;
  Tasso_per_1000: number;
}

export function SintesiNazionale({ anno }: { anno?: number }) {
  const { data, loading } = useFetchData<DelittiItalia[]>("/data/delitti_italia.json");

  if (loading) return <div className="h-20 sm:h-14 animate-pulse bg-muted rounded" />;
  if (!data) return null;

  const frase = fraseSintesi(
    data.map((d) => ({ anno: d.Anno, tasso: d.Tasso_per_1000 })),
    anno,
  );
  if (!frase) return null;
  return (
    <div className="space-y-1">
      <p className="text-base sm:text-lg">{frase}</p>
      <NotaIngiurie />
    </div>
  );
}
