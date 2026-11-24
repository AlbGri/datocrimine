"use client";

import { useState } from "react";
import { ChevronRight } from "@/components/icone";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  // I figli si montano alla prima apertura: una sezione chiusa non scarica dati ne' disegna grafici
  const [montata, setMontata] = useState(defaultOpen);

  return (
    <details
      open={defaultOpen || undefined}
      onToggle={(e) => e.currentTarget.open && setMontata(true)}
      className="group"
    >
      <summary className="cursor-pointer list-none select-none">
        <div className="flex items-center gap-2">
          <ChevronRight
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90"
            aria-hidden="true"
          />
          <h2 className="text-xl sm:text-2xl font-semibold text-primary inline">
            {title}
          </h2>
        </div>
        {description && (
          <p className="mt-1 ml-7 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </summary>
      <div className="mt-3 space-y-3">{montata && children}</div>
    </details>
  );
}
