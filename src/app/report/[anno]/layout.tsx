import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ anno: string }>;
}): Promise<Metadata> {
  const { anno } = await params;
  return pageMetadata(
    `Criminalità in Italia ${anno}: i dati ISTAT`,
    `Report annuale sulla criminalità in Italia: cosa è cambiato nel ${anno}, variazioni per reato e territorio, confronto con gli anni precedenti. Dati ISTAT.`,
    `/report/${anno}`,
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
