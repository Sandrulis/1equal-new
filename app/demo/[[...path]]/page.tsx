import type { Metadata } from "next";

export const revalidate = 3600;
import { redirect } from "next/navigation";
import { DashboardApp } from "@/app/components/dashboard-app";
import { parseDashboardPath } from "@/app/lib/dashboard-path";
import { absolutePublicUrl } from "@/app/lib/public-metadata";

export const metadata: Metadata = {
  title: "Demo",
  alternates: { canonical: absolutePublicUrl("/demo") },
  robots: { index: false, follow: false },
};

export default async function DemoPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const route = parseDashboardPath(path);
  if (!route || route.view === "admin") redirect("/demo");
  return <DashboardApp basePath="/demo" seedDemo />;
}
