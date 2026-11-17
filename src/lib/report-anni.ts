import { readdirSync } from "node:fs";
import { join } from "node:path";

// Un report per ogni report_AAAA.json: quelli degli anni passati restano online
export const ANNI_REPORT = readdirSync(join(process.cwd(), "public/data"))
  .map((file) => file.match(/^report_(\d{4})\.json$/)?.[1])
  .filter((anno): anno is string => anno !== undefined)
  .sort();
