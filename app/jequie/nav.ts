import type { NavItem } from "@/components/Nav";

export const JEQUIE_ART = {
  gradient: "linear-gradient(135deg,#101a5c 0%,#1b2a8c 52%,#3446bd 100%)",
  pattern: "dots" as const,
  chip: "#8dc63f",
  eyebrow: "Nova Escola",
};

export const JEQUIE_NAV: NavItem[] = [
  { href: "/jequie", label: "Visão geral", icon: "overview" },
  { href: "/jequie/meta", label: "Meta Ads", icon: "meta", color: "#2a78d6" },
  {
    href: "/jequie/pmax",
    label: "Google PMAX",
    icon: "google",
    color: "#e0632c",
  },
  { href: "/jequie/criativos", label: "Criativos", icon: "images" },
  { href: "/jequie/metas", label: "Progresso de meta", icon: "target" },
];
