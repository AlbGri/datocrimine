import Link from "next/link";

/** Minigrafico in SVG scritto in costruzione, con la base a zero: una variazione del 2% resta piatta. */
function Minigrafico({ valori }: { valori: number[] }) {
  const max = Math.max(...valori);
  const x = (i: number) => (2 + (i * 96) / (valori.length - 1)).toFixed(1);
  const y = (v: number) => (22 - (v * 19) / max).toFixed(1);
  const tratto = { fill: "none", stroke: "var(--s1)", vectorEffect: "non-scaling-stroke" } as const;
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="mt-auto h-6 w-full overflow-visible"
    >
      <path
        d={`M${valori.map((v, i) => `${x(i)} ${y(v)}`).join("L")}`}
        style={{ ...tratto, strokeWidth: 1.5, strokeLinejoin: "round" }}
      />
      {/* punto finale: un tratto di lunghezza zero non si deforma quando il riquadro si allarga */}
      <path
        d={`M98 ${y(valori[valori.length - 1])}h0`}
        style={{ ...tratto, strokeWidth: 5, strokeLinecap: "round" }}
      />
    </svg>
  );
}

interface RiquadroProps {
  titolo: string;
  href: string;
  id?: string;
  /** Numero principale, gia' formattato; con unita' facoltativa accanto */
  numero?: string;
  unita?: string;
  /** Variazione o riga descrittiva */
  nota: string;
  valori?: number[];
}

/** Riquadro dello stile comune: tutto il riquadro e' il link. */
export function Riquadro({ titolo, href, id, numero, unita, nota, valori }: RiquadroProps) {
  return (
    <Link
      id={id}
      href={href}
      className="group flex scroll-mt-16 flex-col gap-0.5 rounded-md border bg-card px-2.5 pt-2.5 pb-2.5 hover:border-foreground max-[760px]:shrink-0 max-[760px]:grow-0 max-[760px]:basis-[46%] max-[760px]:snap-start [.larghi_&]:max-[760px]:basis-[72%]"
    >
      <span className="font-serif text-[1.08rem] leading-[1.2] font-bold decoration-evidenza decoration-3 underline-offset-3 group-hover:underline group-focus-visible:underline">
        {titolo}
      </span>
      {numero ? (
        <span className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-[1.3rem] leading-[1.2] font-bold">
            {numero}
            {unita && (
              <small className="ml-1 text-[0.88rem] font-normal text-muted-foreground">{unita}</small>
            )}
          </span>
          <span className="text-[0.88rem] text-muted-foreground">{nota}</span>
        </span>
      ) : (
        <span className="line-clamp-2 text-[0.88rem] text-muted-foreground">{nota}</span>
      )}
      {valori && <Minigrafico valori={valori} />}
    </Link>
  );
}

interface FilaProps {
  titolo: string;
  /** Unita' di misura dei riquadri, scritta una volta sola accanto al titolo */
  unita?: string;
  /** Riquadri di solo testo: piu' larghi */
  larghi?: boolean;
  children: React.ReactNode;
}

/** Fila a tutta larghezza sul computer, striscia da scorrere col dito sul telefono. */
export function Fila({ titolo, unita, larghi, children }: FilaProps) {
  return (
    <section className={larghi ? "larghi" : undefined}>
      <h2 className="mb-1.5 text-[1.05rem] font-medium text-muted-foreground">
        {titolo}
        {unita && <small className="ml-1.5 font-sans text-[0.85rem]">{unita}</small>}
      </h2>
      <div
        className={`grid gap-2 ${larghi ? "grid-cols-[repeat(auto-fit,minmax(210px,1fr))]" : "grid-cols-[repeat(auto-fit,minmax(134px,1fr))]"} max-[760px]:-mx-3 max-[760px]:flex max-[760px]:snap-x max-[760px]:snap-proximity max-[760px]:overflow-x-auto max-[760px]:px-3 max-[760px]:pb-1.5`}
      >
        {children}
      </div>
    </section>
  );
}
