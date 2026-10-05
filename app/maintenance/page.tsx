import type { Metadata } from "next";
import { MaintenanceScreen } from "@/app/components/maintenance-screen";

export const metadata: Metadata = {
  title: "Apkope",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return <MaintenanceScreen />;
}
