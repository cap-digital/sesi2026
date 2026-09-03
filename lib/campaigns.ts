import type { Goal, Platform } from "./types";

export interface PlatformDef {
  id: Platform;
  label: string;
  short: string;
  color: string;
  /** métrica que a plataforma entrega como destaque */
  highlight: "impressions" | "clicks" | "engagement" | "views";
}

/**
 * Janela real de um mês de referência, em datas.
 *
 * O mês de uma linha vem SEMPRE da coluna Date — nunca do nome da campanha.
 * A origem mistura os dois: a mesma campanha "[AGOSTO/SETEMBRO- 2026]" atende
 * dois meses, e a "[PMAX] [...] [AGOSTO- 2026]" segue entregando em setembro.
 * Declarar a janela aqui deixa a contagem imune a qualquer renomeação.
 */
export interface MonthWindow {
  month: number;
  start: string;
  end: string;
}

export interface CampaignDef {
  id: "robotica" | "jequie";
  name: string;
  subtitle: string;
  endpoint: string;
  window: { start: string; end: string };
  platforms: PlatformDef[];
  goals: Goal[];
  /** metas mensais? (Jequié) */
  monthly: boolean;
  /** janelas dos meses de referência, quando as metas são mensais */
  months?: MonthWindow[];
}

/* ------------------------------------------------------------------ */
/* Olimpíada Brasileira de Robótica 2026 — 11/08 a 31/08              */
/* ------------------------------------------------------------------ */

export const ROBOTICA: CampaignDef = {
  id: "robotica",
  name: "Olimpíada Brasileira de Robótica 2026",
  subtitle: "SESI Bahia · OBR 2026",
  endpoint: "SesiRobotica2026",
  window: { start: "2026-08-11", end: "2026-08-31" },
  monthly: false,
  platforms: [
    {
      id: "meta",
      label: "Meta Ads",
      short: "Meta",
      color: "#2a78d6",
      highlight: "impressions",
    },
    {
      id: "display",
      label: "Rede Display",
      short: "Display",
      color: "#d95926",
      highlight: "impressions",
    },
    {
      id: "youtube",
      label: "YouTube",
      short: "YouTube",
      color: "#12876a",
      highlight: "views",
    },
    {
      id: "tiktok",
      label: "TikTok",
      short: "TikTok",
      color: "#4a3aa7",
      highlight: "impressions",
    },
  ],
  goals: [
    {
      id: "display-impr",
      label: "Rede Display",
      platform: "display",
      metric: "impressions",
      metricLabel: "Impressões",
      target: 333333,
      investment: 4000,
    },
    {
      id: "meta-alcance",
      label: "Meta · Alcance",
      platform: "meta",
      objective: "Alcance",
      metric: "impressions",
      metricLabel: "Impressões",
      target: 545455,
      investment: 6000,
    },
    {
      id: "meta-engaj",
      label: "Meta · Engajamento",
      platform: "meta",
      objective: "Engajamento",
      metric: "engagement",
      metricLabel: "Engajamento",
      target: 2778,
      investment: 2500,
    },
    {
      id: "tiktok-impr",
      label: "TikTok",
      platform: "tiktok",
      metric: "impressions",
      metricLabel: "Impressões",
      target: 355274,
      investment: 4618.56,
    },
    {
      id: "youtube-views",
      label: "YouTube",
      platform: "youtube",
      metric: "views",
      metricLabel: "Visualizações",
      target: 21875,
      investment: 3500,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Inauguração Escola SESI Jequié — agosto e setembro                 */
/* ------------------------------------------------------------------ */

export const JEQUIE: CampaignDef = {
  id: "jequie",
  name: "Inauguração Escola SESI Jequié",
  subtitle: "SESI Bahia · Jequié",
  endpoint: "SesiJequie2026",
  window: { start: "2026-08-12", end: "2026-09-30" },
  monthly: true,
  // agosto termina em 31/08 e setembro começa em 01/09: o corte é a data da
  // entrega, não o rótulo do mês no nome da campanha
  months: [
    { month: 8, start: "2026-08-13", end: "2026-08-31" },
    { month: 9, start: "2026-09-01", end: "2026-09-30" },
  ],
  platforms: [
    {
      id: "meta",
      label: "Meta Ads",
      short: "Meta",
      color: "#2a78d6",
      highlight: "impressions",
    },
    {
      id: "pmax",
      label: "Google PMAX",
      short: "PMAX",
      color: "#e0632c",
      highlight: "clicks",
    },
  ],
  goals: [
    // Agosto
    {
      id: "ago-pmax",
      label: "PMAX",
      platform: "pmax",
      month: 8,
      metric: "clicks",
      metricLabel: "Cliques",
      target: 1429,
      investment: 5000,
    },
    {
      id: "ago-meta-alcance",
      label: "Meta · Alcance",
      platform: "meta",
      objective: "Alcance",
      month: 8,
      metric: "impressions",
      metricLabel: "Impressões",
      target: 571429,
      investment: 6000,
    },
    {
      id: "ago-meta-trafego",
      label: "Meta · Tráfego",
      platform: "meta",
      objective: "Tráfego",
      month: 8,
      metric: "clicks",
      metricLabel: "Cliques",
      target: 1333,
      investment: 4000,
    },
    // Setembro
    {
      id: "set-pmax",
      label: "PMAX",
      platform: "pmax",
      month: 9,
      metric: "clicks",
      metricLabel: "Cliques",
      target: 1714,
      investment: 6000,
    },
    {
      id: "set-meta-engaj",
      label: "Meta · Engajamento",
      platform: "meta",
      objective: "Engajamento",
      month: 9,
      metric: "engagement",
      metricLabel: "Engajamento",
      target: 2778,
      investment: 2500,
    },
    {
      id: "set-meta-alcance",
      label: "Meta · Alcance",
      platform: "meta",
      objective: "Alcance",
      month: 9,
      metric: "impressions",
      metricLabel: "Impressões",
      target: 857143,
      investment: 9000,
    },
    {
      id: "set-meta-trafego",
      label: "Meta · Tráfego",
      platform: "meta",
      objective: "Tráfego",
      month: 9,
      metric: "clicks",
      metricLabel: "Cliques",
      target: 1500,
      investment: 4500,
    },
    {
      id: "set-meta-trafego-rmkt",
      label: "Meta · Tráfego RMKT",
      platform: "meta",
      objective: "Tráfego RMKT",
      month: 9,
      metric: "clicks",
      metricLabel: "Cliques",
      target: 857,
      investment: 3000,
    },
  ],
};

export const CAMPAIGNS = { robotica: ROBOTICA, jequie: JEQUIE };

export function platformDef(campaign: CampaignDef, id: Platform) {
  return campaign.platforms.find((p) => p.id === id);
}
