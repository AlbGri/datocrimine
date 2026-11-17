"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  id?: string;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  id,
  children,
}: CollapsibleSectionProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  // Un link a /pagina#id apre la sezione: la home porta alla tabella delle province gia' aperta
  useEffect(() => {
    if (id && ref.current && window.location.hash === `#${id}`) {
      ref.current.open = true;
      ref.current.scrollIntoView();
    }
  }, [id]);

  return (
    <details ref={ref} id={id} open={defaultOpen || undefined} className="group">
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
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}
