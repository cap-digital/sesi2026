export type Platform = "meta" | "display" | "youtube" | "tiktok" | "pmax";

export type Objective =
  | "Alcance"
  | "Engajamento"
  | "Tráfego"
  | "Views"
  | "Conversão"
  | "Performance Max"
  | "Outros";

/** Linha normalizada — todas as plataformas convergem para este formato. */
export interface Row {
  date: string; // YYYY-MM-DD (data local Brasil)
  platform: Platform;
  campaign: string;
  objective: Objective;
  adset: string;
  ad: string;
  creative: string | null;
  permalink: string | null;
  videoUrl: string | null;
  videoTitle: string | null;
  age: string | null;
  gender: string | null;

  investment: number; // coluna "Investimento" (nunca spend)
  /** a origem não informou o investimento desta linha (célula de erro) */
  investmentMissing: boolean;
  impressions: number;
  clicks: number;
  linkClicks: number;
  engagement: number;
  views: number;
  reactions: number;
  comments: number;
  saves: number;
  shares: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
}

export interface Totals {
  investment: number;
  /** linhas cujo investimento a origem não informou */
  investmentMissing: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  engagement: number;
  views: number;
  reactions: number;
  comments: number;
  saves: number;
  shares: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  rows: number;
}

export interface Dataset {
  rows: Row[];
  /** "hoje" segundo o servidor da API, não o relógio do cliente */
  today: string;
  fetchedAt: string;
  /** plataformas que responderam sem nenhuma linha */
  emptyPlatforms: Platform[];
  /** primeira e última data presentes nos dados (nada de janela fixa) */
  firstDate: string;
  lastDate: string;
  /** blocos da resposta que o painel ainda não sabe ler — nada é descartado
   *  em silêncio: a tela avisa para que o mapeamento seja adicionado */
  unknownSources: { key: string; rows: number }[];
}

export type GoalMetric =
  | "impressions"
  | "clicks"
  | "engagement"
  | "views"
  | "investment";

export interface Goal {
  id: string;
  label: string;
  platform: Platform;
  /** filtro extra por objetivo, quando a meta é por objetivo dentro da plataforma */
  objective?: Objective;
  /** mês da meta (1-12) — usado em Jequié, onde as metas são mensais */
  month?: number;
  metric: GoalMetric;
  metricLabel: string;
  target: number;
  investment: number;
}
