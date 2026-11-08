import { varTriennale, TRIENNIO_INIZIALE, TRIENNIO_FINALE } from "@/lib/config";
import { fmtNum, fmtPct, fmtPctSigned } from "@/lib/format";

const ANNO_PRE_COVID = 2019;
// Il 2020 e' il minimo COVID: una serie di aumenti o cali si conta dal 2021
const PRIMO_ANNO_SERIE = 2021;

const variazione = (da: number, a: number) => ((a - da) / da) * 100;

// "dell'11,8%", "dell'8,2%", ma "del 10,5%": conta come si legge il numero
function delPct(valore: number): string {
  const testo = fmtPct(valore);
  const intero = testo.split(",")[0];
  return intero === "1" || intero === "11" || intero.startsWith("8") ? `dell'${testo}` : `del ${testo}`;
}

/**
 * Frase che tiene insieme tendenza lunga e ultimi anni del tasso di delitti denunciati.
 *
 * Args:
 *   serie: tassi per 1.000 abitanti, un elemento per anno.
 *   anno: ultimo anno da considerare (di default l'ultimo della serie).
 *
 * Returns:
 *   La frase, o null se mancano gli anni di confronto.
 */
export function fraseSintesi(
  serie: { anno: number; tasso: number }[],
  anno: number = Math.max(...serie.map((d) => d.anno)),
): string | null {
  const tassi = new Map(serie.filter((d) => d.anno <= anno).map((d) => [d.anno, d.tasso]));
  const tasso = tassi.get(anno);
  const precedente = tassi.get(anno - 1);
  const preCovid = tassi.get(ANNO_PRE_COVID);
  if (tasso === undefined || precedente === undefined || preCovid === undefined) return null;

  // Il confronto fra trienni vale solo quando l'anno chiude il triennio finale
  const lungo =
    anno >= TRIENNIO_FINALE[1]
      ? varTriennale([...tassi].map(([a, t]) => ({ anno: a, tasso: t })))
      : null;
  const inCalo = lungo !== null && lungo < 0;
  const frasi: string[] = [];
  if (lungo !== null) {
    frasi.push(
      `Nel lungo periodo i delitti denunciati sono in ${inCalo ? "calo" : "aumento"}: ` +
        `il tasso medio ${TRIENNIO_FINALE.join("-")} è più ${inCalo ? "basso" : "alto"} ` +
        `${delPct(Math.abs(lungo))} rispetto al ${TRIENNIO_INIZIALE.join("-")}.`,
    );
  }

  // Anni consecutivi nello stesso verso dell'ultimo
  const sale = tasso > precedente;
  let inizio = anno;
  while (inizio - 1 >= PRIMO_ANNO_SERIE && tassi.has(inizio - 1) &&
         (tassi.get(inizio)! > tassi.get(inizio - 1)!) === sale) {
    inizio--;
  }

  const confronti = [`${fmtPctSigned(variazione(precedente, tasso))} sul ${anno - 1}`];
  if (anno - 1 !== ANNO_PRE_COVID) {
    confronti.push(
      `${fmtPctSigned(variazione(preCovid, tasso))} sul ${ANNO_PRE_COVID}, l'ultimo anno prima del COVID`,
    );
  }
  const dato = `${fmtNum(tasso, 1)} ogni 1.000 abitanti, ${confronti.join(" e ")}.`;

  // Senza la frase sul lungo periodo, il soggetto va detto qui
  const soggetto = lungo === null ? " i delitti denunciati" : "";
  if (anno - inizio >= 2) {
    const verbo = sale ? (inCalo ? "risalgono" : "salgono") : "scendono";
    const pero = lungo !== null && sale === inCalo ? " però" : "";
    frasi.push(`Dal ${inizio}${pero}${soggetto} ${verbo} ogni anno: nel ${anno} sono ${dato}`);
  } else {
    frasi.push(`Nel ${anno}${soggetto} sono ${dato}`);
  }

  // Ultimo anno con un valore oltre quello attuale, nel verso dell'ultima variazione
  const oltre = [...tassi]
    .filter(([a, t]) => a < anno && (sale ? t > tasso : t < tasso))
    .map(([a]) => a);
  const estremo = sale ? "alto" : "basso";
  if (oltre.length === 0) {
    frasi.push(`È il valore più ${estremo} della serie, che parte dal ${Math.min(...tassi.keys())}.`);
  } else if (Math.max(...oltre) < anno - 2) {
    frasi.push(`È il valore più ${estremo} dal ${Math.max(...oltre)}.`);
  }

  return frasi.join(" ");
}
