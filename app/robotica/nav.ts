import type { NavItem } from "@/components/Nav";

export const ROBOTICA_ART = {
  gradient: "linear-gradient(135deg,#5e2116 0%,#8f2f1a 48%,#e09a3c 100%)",
  pattern: "circuit" as const,
  chip: "#fbe8c4",
  eyebrow: "OBR 2026",
};

const sub = (base: string): NavItem["children"] => [
  { href: base, label: "Visão geral" },
  { href: `${base}/criativos`, label: "Criativos" },
];

export const ROBOTICA_NAV: NavItem[] = [
  { href: "/robotica", label: "Overview", icon: "overview" },
  { href: "/robotica/metas", label: "Progresso de meta", icon: "target" },
  {
    href: "/robotica/meta",
    label: "Meta Ads",
    icon: "meta",
    color: "#2a78d6",
    children: sub("/robotica/meta"),
  },
  {
    href: "/robotica/display",
    label: "Rede Display",
    icon: "display",
    color: "#d95926",
    children: sub("/robotica/display"),
  },
  {
    href: "/robotica/youtube",
    label: "YouTube",
    icon: "youtube",
    color: "#12876a",
    children: sub("/robotica/youtube"),
  },
  {
    href: "/robotica/tiktok",
    label: "TikTok",
    icon: "tiktok",
    color: "#4a3aa7",
    children: sub("/robotica/tiktok"),
  },
];
