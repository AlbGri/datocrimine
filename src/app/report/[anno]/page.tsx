import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReportContent, type ReportData } from "@/components/report/report-content";
import { ANNI_REPORT } from "@/lib/report-anni";

export function generateStaticParams() {
  return ANNI_REPORT.map((anno) => ({ anno }));
}

// Letto in costruzione, cosi' il testo del report e' nell'HTML e non solo dopo il caricamento
export default async function ReportPage({
  params,
}: {
  params: Promise<{ anno: string }>;
}) {
  const { anno } = await params;
  const data: ReportData = JSON.parse(
    readFileSync(join(process.cwd(), "public/data", `report_${anno}.json`), "utf-8"),
  );
  return <ReportContent anno={anno} data={data} />;
}
