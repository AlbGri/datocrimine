"use client";

import { useFetchData } from "@/lib/use-fetch-data";
import { varTriennale, TRIENNALE_PERIODI } from "@/lib/config";
import { fmtNum, fmtPctSigned } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

interface DelittiItalia {
  Anno: number;
  Delitti: number;
  Popolazione: number;
  Tasso_per_1000: number;
}

export function KpiSummary() {
  const { data, loading } = useFetchData<DelittiItalia[]>(
    "/data/delitti_italia.json"
  );

  if (loading)
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[60px] sm:h-[72px] animate-pulse bg-muted rounded" />
        ))}
      </div>
    );
  if (!data || data.length === 0) return null;

  const ultimo = data[data.length - 1];
  const varTasso = varTriennale(
    data.map((d) => ({ anno: d.Anno, tasso: d.Tasso_per_1000 }))
  );

  const items: { label: string; value: string; color?: string; subtitle?: string }[] = [
    {
      label: `Delitti denunciati ${ultimo.Anno}`,
      value: fmtNum(ultimo.Delitti),
    },
    {
      label: `Tasso ${ultimo.Anno}`,
      value: fmtNum(ultimo.Tasso_per_1000, 1),
      subtitle: "per 1.000 ab.",
    },
    ...(varTasso !== null
      ? [
          {
            label: "Variazione tasso delitti",
            value: fmtPctSigned(varTasso),
            color: varTasso < 0 ? "text-green-600" : "text-red-600",
            subtitle: `media ${TRIENNALE_PERIODI}`,
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="py-0 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">{item.label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${item.color ?? ""}`}>{item.value}</p>
            {item.subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">{item.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
