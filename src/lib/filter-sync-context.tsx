"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Broadcast {
  filterType: string;
  value: string;
  version: number;
}

interface FilterSyncContextType {
  broadcast: Broadcast | null;
  sync: (filterType: string, value: string) => void;
}

const FilterSyncContext = createContext<FilterSyncContextType | null>(null);

export function FilterSyncProvider({ children }: { children: ReactNode }) {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const versionRef = useRef(0);

  const sync = useCallback((filterType: string, value: string) => {
    versionRef.current += 1;
    setBroadcast({ filterType, value, version: versionRef.current });
  }, []);

  return (
    <FilterSyncContext.Provider value={{ broadcast, sync }}>
      {children}
    </FilterSyncContext.Provider>
  );
}

/**
 * Hook per sincronizzare un filtro locale con il broadcast di pagina.
 * Restituisce un componente SyncButton da posizionare accanto al selettore.
 */
export function useFilterSync(
  filterType: string,
  currentValue: string,
  setValue: (v: string) => void
) {
  const ctx = useContext(FilterSyncContext);
  const appliedVersion = useRef(0);

  useEffect(() => {
    if (
      ctx?.broadcast &&
      ctx.broadcast.filterType === filterType &&
      ctx.broadcast.version > appliedVersion.current
    ) {
      appliedVersion.current = ctx.broadcast.version;
      setValue(ctx.broadcast.value);
    }
  }, [ctx?.broadcast, filterType, setValue]);

  const handleSync = useCallback(() => {
    ctx?.sync(filterType, currentValue);
  }, [ctx, filterType, currentValue]);

  return { handleSync, enabled: ctx !== null };
}

export function SyncButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  if (disabled) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Applica a tutti i grafici"
      className="ml-1.5 inline-flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </button>
  );
}
