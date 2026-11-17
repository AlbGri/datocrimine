import { ReportContent } from "@/components/report/report-content";
import { ANNI_REPORT } from "@/lib/report-anni";

export function generateStaticParams() {
  return ANNI_REPORT.map((anno) => ({ anno }));
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ anno: string }>;
}) {
  const { anno } = await params;
  return <ReportContent anno={anno} />;
}
