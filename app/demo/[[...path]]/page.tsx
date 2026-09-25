import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardApp } from "@/app/components/dashboard-app";
import { parseDashboardPath } from "@/app/lib/dashboard-path";

export const metadata: Metadata = {
  title: "Demo",
  robots: { index: false, follow: false },
};

export default async function DemoPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  if (!parseDashboardPath(path)) redirect("/demo");
  return <DashboardApp basePath="/demo" />;
}
