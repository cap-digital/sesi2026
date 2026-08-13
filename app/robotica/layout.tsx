import type { Metadata } from "next";
import { DataProvider } from "@/components/DataProvider";
import { SidebarShell } from "@/components/Shell";
import { ROBOTICA } from "@/lib/campaigns";
import { ROBOTICA_ART, ROBOTICA_NAV } from "./nav";

export const metadata: Metadata = {
  title: {
    default: "OBR 2026",
    template: "%s · OBR 2026",
  },
  description:
    "Painel de mídia da Olimpíada Brasileira de Robótica 2026 — SESI Bahia.",
};

export default function RoboticaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider campaign={ROBOTICA}>
      <SidebarShell
        nav={ROBOTICA_NAV}
        art={ROBOTICA_ART}
        themeClass="theme-robotica"
      >
        {children}
      </SidebarShell>
    </DataProvider>
  );
}
