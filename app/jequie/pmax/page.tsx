import { PlatformView } from "@/components/PlatformView";
import { JEQUIE, platformDef } from "@/lib/campaigns";

export const metadata = { title: "Google PMAX" };

export default function Page() {
  return <PlatformView def={platformDef(JEQUIE, "pmax")!} />;
}
