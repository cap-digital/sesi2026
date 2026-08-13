import type { Metadata } from "next";
import { DataProvider } from "@/components/DataProvider";
import { TopbarShell } from "@/components/Shell";
import { JEQUIE } from "@/lib/campaigns";
import { JEQUIE_ART, JEQUIE_NAV } from "./nav";

export const metadata: Metadata = {
  title: {
    default: "Jequié",
    template: "%s · Jequié",
  },
  description:
    "Painel de mídia da inauguração da Escola SESI Jequié — Meta Ads e Google PMAX.",
};

export default function JequieLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider campaign={JEQUIE}>
      <TopbarShell nav={JEQUIE_NAV} art={JEQUIE_ART} themeClass="theme-jequie">
        {children}
      </TopbarShell>
    </DataProvider>
  );
}
