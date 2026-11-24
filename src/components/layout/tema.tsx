"use client";

import { useEffect } from "react";
import { Pulsante } from "@/components/ui/pulsante";
import { CHIAVE_TEMA } from "@/lib/config";
import { aggiornaColoreBarra, EVENTO_TEMA, useTemaScuro } from "@/lib/tema";

const avvisa = () => document.dispatchEvent(new Event(EVENTO_TEMA));

/** Pulsante del tema: un cerchio per meta' pieno e la parola del tema a cui si passa */
export function Tema() {
  const scuro = useTemaScuro();

  useEffect(() => {
    aggiornaColoreBarra();
    // Finche' non si sceglie, il tema segue il sistema anche quando cambia a pagina aperta
    const sistema = matchMedia("(prefers-color-scheme: dark)");
    const cambiaSistema = () => {
      if (!document.documentElement.dataset.tema) avvisa();
    };
    sistema.addEventListener("change", cambiaSistema);
    return () => sistema.removeEventListener("change", cambiaSistema);
  }, []);

  const arrivo = scuro ? "chiaro" : "scuro";
  const cambia = () => {
    document.documentElement.dataset.tema = arrivo;
    try {
      localStorage.setItem(CHIAVE_TEMA, arrivo);
    } catch {
      // Senza memoria del browser la scelta vale fino alla prossima pagina
    }
    aggiornaColoreBarra();
    avvisa();
  };

  return (
    <Pulsante
      onClick={cambia}
      aria-label={`Passa al tema ${arrivo}`}
      className="px-[9px] py-1 text-[0.88rem] whitespace-nowrap max-[760px]:ml-auto"
    >
      <i
        aria-hidden="true"
        className="mr-1.5 inline-block size-3 rounded-full border-[1.5px] border-foreground bg-[linear-gradient(90deg,var(--foreground)_50%,transparent_50%)] align-[-1px] max-[760px]:mr-0"
      />
      <span className="max-[760px]:hidden">{scuro ? "Chiaro" : "Scuro"}</span>
    </Pulsante>
  );
}
