import { PlatformCreativesPage } from "@/components/Creatives";
import { ROBOTICA, platformDef } from "@/lib/campaigns";

export const metadata = { title: "Criativos · Meta Ads" };

export default function Page() {
  return <PlatformCreativesPage def={platformDef(ROBOTICA, "meta")!} />;
}
