import { PlatformView } from "@/components/PlatformView";
import { ROBOTICA, platformDef } from "@/lib/campaigns";

export const metadata = { title: "YouTube" };

export default function Page() {
  return <PlatformView def={platformDef(ROBOTICA, "youtube")!} />;
}
