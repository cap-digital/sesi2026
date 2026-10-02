import type { Objective, Row, Totals } from "./types";

export const EMPTY_TOTALS: Totals = {
  investment: 0,
  investmentMissing: 0,
  impressions: 0,
  clicks: 0,
  linkClicks: 0,
  engagement: 0,
  views: 0,
  reactions: 0,
  comments: 0,
  saves: 0,
  shares: 0,
  p25: 0,
  p50: 0,
  p75: 0,
  p100: 0,
  rows: 0,
};

const SUM_KEYS = [
  "investment",
  "impressions",
  "clicks",
  "linkClicks",
  "engagement",
  "views",
  "reactions",
  "comments",
  "saves",
  "shares",
  "p25",
  "p50",
  "p75",
  "p100",
] as const;

export function sumRows(rows: Row[]): Totals {
  const t: Totals = { ...EMPTY_TOTALS };
  for (const r of rows) {
    for (const k of SUM_KEYS) t[k] += r[k];
    if (r.investmentMissing) t.investmentMissing += 1;
    t.rows += 1;
  }
  return t;
}

/**
 * Investimento com zero ambíguo resolvido: quando a origem não informou o
 * valor, "R$ 0,00" mentiria — devolve null para a UI mostrar "—".
 */
export function investmentOrNull(t: Totals): number | null {
  return t.investment === 0 && t.investmentMissing > 0 ? null : t.investment;
}

const div = (a: number, b: number) => (b > 0 ? a / b : NaN);

export const ctr = (t: Totals) => div(t.clicks, t.impressions);
export const linkCtr = (t: Totals) => div(t.linkClicks, t.impressions);
export const cpc = (t: Totals) => div(t.investment, t.clicks);
export const cpcLink = (t: Totals) => div(t.investment, t.linkClicks);
export const cpm = (t: Totals) => div(t.investment * 1000, t.impressions);
export const cpv = (t: Totals) => div(t.investment, t.views);
export const cpe = (t: Totals) => div(t.investment, t.engagement);
export const engRate = (t: Totals) => div(t.engagement, t.impressions);
export const vtr = (t: Totals) => div(t.views, t.impressions);
export const completionRate = (t: Totals) => div(t.p100, t.views);

/**
 * Métrica-alvo de cada objetivo. Custos SEMPRE se calculam dentro do próprio
 * objetivo: o CPE da campanha de engajamento usa só o engajamento e o
 * investimento dela, nunca os totais da conta.
 */
export const OBJECTIVE_METRIC: Record<
  Objective,
  {
    metric: keyof Totals;
    metricLabel: string;
    costLabel: string;
    cost: (t: Totals) => number;
    costHint: string;
  }
> = {
  Alcance: {
    metric: "impressions",
    metricLabel: "Impressões",
    costLabel: "CPM",
    cost: cpm,
    costHint: "Investimento ÷ impressões × 1.000 (só campanhas de alcance)",
  },
  Engajamento: {
    metric: "engagement",
    metricLabel: "Engajamento",
    costLabel: "CPE",
    cost: cpe,
    costHint: "Investimento ÷ engajamentos (só campanhas de engajamento)",
  },
  Tráfego: {
    metric: "clicks",
    metricLabel: "Cliques",
    costLabel: "CPC",
    cost: cpc,
    costHint: "Investimento ÷ cliques (só campanhas de tráfego)",
  },
  "Tráfego RMKT": {
    metric: "clicks",
    metricLabel: "Cliques",
    costLabel: "CPC",
    cost: cpc,
    costHint: "Investimento ÷ cliques (só campanhas de remarketing)",
  },
  Views: {
    metric: "views",
    metricLabel: "Visualizações",
    costLabel: "CPV",
    cost: cpv,
    costHint: "Investimento ÷ visualizações (só campanhas de views)",
  },
  Conversão: {
    metric: "clicks",
    metricLabel: "Cliques",
    costLabel: "CPC",
    cost: cpc,
    costHint: "Investimento ÷ cliques (só campanhas de conversão)",
  },
  "Performance Max": {
    metric: "clicks",
    metricLabel: "Cliques",
    costLabel: "CPC",
    cost: cpc,
    costHint: "Investimento ÷ cliques (só campanhas PMAX)",
  },
  Outros: {
    metric: "impressions",
    metricLabel: "Impressões",
    costLabel: "CPM",
    cost: cpm,
    costHint: "Investimento ÷ impressões × 1.000",
  },
};

/**
 * Métrica-alvo com a régua de clique da plataforma: no Meta o contratado em
 * tráfego e tráfego RMKT é o clique no link, não o clique em qualquer área.
 */
export function objectiveMetric(objective: Objective, linkClicks = false) {
  const def = OBJECTIVE_METRIC[objective];
  if (!linkClicks || def.metric !== "clicks") return def;
  return {
    metric: "linkClicks" as const,
    metricLabel: "Cliques no link",
    costLabel: "CPC no link",
    cost: cpcLink,
    costHint: def.costHint.replace("÷ cliques", "÷ cliques no link"),
  };
}

export interface ObjectiveSlice {
  objective: Objective;
  totals: Totals;
  primaryValue: number;
  primaryLabel: string;
  costLabel: string;
  costValue: number;
  costHint: string;
  campaigns: string[];
}

/**
 * Agrupa por objetivo e calcula o custo de cada um com o seu próprio
 * investimento. Objetivo não reconhecido ("Outros") é separado por campanha:
 * dois tipos novos e diferentes nunca dividem o mesmo cartão de custo.
 */
export function byObjective(
  rows: Row[],
  linkClicks = false
): ObjectiveSlice[] {
  const groups = new Map<string, Row[]>();
  const keyOf = (r: Row) =>
    r.objective === "Outros" ? `Outros|${r.campaign}` : r.objective;
  for (const r of rows) {
    const k = keyOf(r);
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }
  const order: Objective[] = [
    "Alcance",
    "Engajamento",
    "Tráfego",
    "Tráfego RMKT",
    "Views",
    "Conversão",
    "Performance Max",
    "Outros",
  ];
  return [...groups.entries()]
    .sort(
      (a, b) =>
        order.indexOf(a[1][0].objective) - order.indexOf(b[1][0].objective)
    )
    .map(([, list]) => {
      const objective = list[0].objective;
      const totals = sumRows(list);
      const def = objectiveMetric(objective, linkClicks);
      return {
        objective,
        totals,
        primaryValue: totals[def.metric] as number,
        primaryLabel: def.metricLabel,
        costLabel: def.costLabel,
        costValue: def.cost(totals),
        costHint: def.costHint,
        campaigns: [...new Set(list.map((r) => r.campaign))],
      };
    });
}

export function groupBy<K>(rows: Row[], key: (r: Row) => K) {
  const map = new Map<K, Row[]>();
  for (const r of rows) {
    const arr = map.get(key(r));
    if (arr) arr.push(r);
    else map.set(key(r), [r]);
  }
  return map;
}

export interface DailyPoint {
  date: string;
  [series: string]: number | string;
}

/** Série temporal empilhável: uma chave por série, um ponto por dia do intervalo. */
export function daily(
  rows: Row[],
  days: string[],
  metric: keyof Totals,
  seriesKey: (r: Row) => string
): DailyPoint[] {
  const index = new Map<string, DailyPoint>();
  for (const d of days) index.set(d, { date: d });
  for (const r of rows) {
    const point = index.get(r.date);
    if (!point) continue;
    const k = seriesKey(r);
    point[k] = ((point[k] as number) ?? 0) + (r[metric as keyof Row] as number);
  }
  return days.map((d) => index.get(d)!);
}

/** Agrupa criativos por anúncio, somando as quebras (idade/gênero) da mesma peça. */
export interface Creative {
  key: string;
  ad: string;
  adset: string;
  campaign: string;
  objective: Objective;
  platform: Row["platform"];
  creative: string | null;
  permalink: string | null;
  videoUrl: string | null;
  totals: Totals;
}

export function creatives(rows: Row[]): Creative[] {
  const map = new Map<string, Creative>();
  for (const r of rows) {
    const key = `${r.platform}|${r.campaign}|${r.adset}|${r.ad}`;
    let c = map.get(key);
    if (!c) {
      c = {
        key,
        ad: r.ad,
        adset: r.adset,
        campaign: r.campaign,
        objective: r.objective,
        platform: r.platform,
        creative: r.creative,
        permalink: r.permalink,
        videoUrl: r.videoUrl,
        totals: { ...EMPTY_TOTALS },
      };
      map.set(key, c);
    }
    if (!c.creative && r.creative) c.creative = r.creative;
    if (!c.permalink && r.permalink) c.permalink = r.permalink;
    if (!c.videoUrl && r.videoUrl) c.videoUrl = r.videoUrl;
    for (const k of SUM_KEYS) c.totals[k] += r[k];
    if (r.investmentMissing) c.totals.investmentMissing += 1;
    c.totals.rows += 1;
  }
  return [...map.values()].sort(
    (a, b) => b.totals.investment - a.totals.investment
  );
}
