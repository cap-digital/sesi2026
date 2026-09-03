import type { CampaignDef } from "./campaigns";
import { daysBetween } from "./dates";
import { sumRows } from "./metrics";
import type { Goal, Row } from "./types";

export type GoalStatus =
  | "ahead"
  | "ontrack"
  | "behind"
  | "notstarted"
  | "nodata";

export interface GoalProgress {
  goal: Goal;
  /** janela de vigência da meta (mês recortado pela campanha, ou a campanha toda) */
  window: { start: string; end: string };
  achieved: number;
  spent: number;
  /** a origem não informou o investimento de parte das linhas desta meta */
  spentMissing: boolean;
  pctMetric: number;
  pctInvest: number;
  /** custo unitário realizado (investimento ÷ métrica DO PRÓPRIO objetivo) */
  cost: number;
  /** custo unitário planejado */
  targetCost: number;
  /** projeção linear até o fim da janela */
  projected: number;
  /** fração da janela já decorrida */
  pacing: number;
  status: GoalStatus;
  hasData: boolean;
}

/**
 * Janela de vigência da meta, em datas.
 *
 * Meta mensal usa a janela declarada na campanha; sem declaração, cai no mês
 * civil recortado pelo período da campanha. Em nenhum caso o nome da campanha
 * entra na conta: uma renomeação na origem ("[AGOSTO- 2026]" que segue
 * entregando em setembro) não desloca uma única linha de mês.
 */
export function goalWindow(campaign: CampaignDef, goal: Goal) {
  if (!goal.month) return { ...campaign.window };

  const declared = campaign.months?.find((m) => m.month === goal.month);
  let start: string;
  let end: string;
  if (declared) {
    start = declared.start;
    end = declared.end;
  } else {
    const y = campaign.window.start.slice(0, 4);
    const mm = String(goal.month).padStart(2, "0");
    const last = new Date(Date.UTC(Number(y), goal.month, 0))
      .toISOString()
      .slice(8, 10);
    start = `${y}-${mm}-01`;
    end = `${y}-${mm}-${last}`;
  }

  return {
    start: start > campaign.window.start ? start : campaign.window.start,
    end: end < campaign.window.end ? end : campaign.window.end,
  };
}

/**
 * Linhas que contam para a meta: plataforma, objetivo e — o ponto crítico — a
 * data da entrega dentro da janela do mês. A coluna Date é a única origem do
 * mês de referência.
 */
export function rowsForGoal(rows: Row[], campaign: CampaignDef, goal: Goal) {
  const w = goalWindow(campaign, goal);
  return rows.filter(
    (r) =>
      r.platform === goal.platform &&
      (!goal.objective || r.objective === goal.objective) &&
      r.date >= w.start &&
      r.date <= w.end
  );
}

export function evaluateGoal(
  rows: Row[],
  campaign: CampaignDef,
  goal: Goal,
  today: string
): GoalProgress {
  const window = goalWindow(campaign, goal);
  const scoped = rowsForGoal(rows, campaign, goal);
  const totals = sumRows(scoped);

  const achieved = totals[goal.metric] as number;
  const spent = totals.investment;
  const spentMissing = spent === 0 && totals.investmentMissing > 0;
  const pctMetric = goal.target > 0 ? achieved / goal.target : 0;
  const pctInvest = goal.investment > 0 ? spent / goal.investment : 0;

  const totalDays = daysBetween(window.start, window.end).length || 1;
  const elapsedDays = Math.min(
    totalDays,
    Math.max(
      0,
      daysBetween(window.start, today < window.end ? today : window.end).length
    )
  );
  const pacing = elapsedDays / totalDays;
  const projected = elapsedDays > 0 ? (achieved / elapsedDays) * totalDays : 0;

  // linha existente mas zerada é o rastro de uma campanha que já parou: não é
  // entrega, e classificar isso como "abaixo do ritmo" mentiria sobre o mês
  const hasData = totals.rows > 0 && (achieved > 0 || spent > 0);
  // meta cujo mês ainda não começou não está "sem dados": não começou
  const notStarted = today < window.start;
  let status: GoalStatus = notStarted ? "notstarted" : "nodata";
  if (hasData) {
    const ratio = pacing > 0 ? pctMetric / pacing : 0;
    status = ratio >= 1.05 ? "ahead" : ratio >= 0.85 ? "ontrack" : "behind";
  }

  return {
    goal,
    window,
    achieved,
    spent,
    spentMissing,
    pctMetric,
    pctInvest,
    cost: achieved > 0 ? spent / achieved : NaN,
    targetCost: goal.target > 0 ? goal.investment / goal.target : NaN,
    projected,
    pacing,
    status,
    hasData,
  };
}

export function evaluateAll(
  rows: Row[],
  campaign: CampaignDef,
  today: string
): GoalProgress[] {
  return campaign.goals.map((g) => evaluateGoal(rows, campaign, g, today));
}

export const STATUS_LABEL: Record<GoalStatus, string> = {
  ahead: "Acima do ritmo",
  ontrack: "No ritmo",
  behind: "Abaixo do ritmo",
  notstarted: "Não iniciada",
  nodata: "Sem dados",
};

/** paleta de status (fixa, nunca usada para séries) */
export const STATUS_COLOR: Record<GoalStatus, string> = {
  ahead: "#0ca30c",
  ontrack: "#0ca30c",
  behind: "#ec835a",
  notstarted: "#898781",
  nodata: "#898781",
};
