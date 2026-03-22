import { ReportContent } from "@/components/report/report-content";

export function generateStaticParams() {
  return [{ anno: "2024" }];
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ anno: string }>;
}) {
  const { anno } = await params;
  return <ReportContent anno={anno} />;
}
