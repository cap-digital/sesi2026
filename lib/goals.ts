import type { CampaignDef } from "./campaigns";
import { daysBetween, monthOf } from "./dates";
import { sumRows } from "./metrics";
import type { Goal, Row } from "./types";

export type GoalStatus = "ahead" | "ontrack" | "behind" | "nodata";

export interface GoalProgress {
  goal: Goal;
  /** janela de vigência da meta (mês recortado pela campanha, ou a campanha toda) */
  window: { start: string; end: string };
  achieved: number;
  spent: number;
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

export function goalWindow(campaign: CampaignDef, goal: Goal) {
  if (!goal.month) return { ...campaign.window };
  const y = campaign.window.start.slice(0, 4);
  const mm = String(goal.month).padStart(2, "0");
  const last = new Date(Date.UTC(Number(y), goal.month, 0))
    .toISOString()
    .slice(8, 10);
  const start = `${y}-${mm}-01`;
  const end = `${y}-${mm}-${last}`;
  return {
    start: start > campaign.window.start ? start : campaign.window.start,
    end: end < campaign.window.end ? end : campaign.window.end,
  };
}

export function rowsForGoal(rows: Row[], campaign: CampaignDef, goal: Goal) {
  const w = goalWindow(campaign, goal);
  return rows.filter(
    (r) =>
      r.platform === goal.platform &&
      (!goal.objective || r.objective === goal.objective) &&
      (!goal.month || monthOf(r.date) === goal.month) &&
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

  const hasData = totals.rows > 0;
  let status: GoalStatus = "nodata";
  if (hasData) {
    const ratio = pacing > 0 ? pctMetric / pacing : 0;
    status = ratio >= 1.05 ? "ahead" : ratio >= 0.85 ? "ontrack" : "behind";
  }

  return {
    goal,
    window,
    achieved,
    spent,
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
  nodata: "Sem dados",
};

/** paleta de status (fixa, nunca usada para séries) */
export const STATUS_COLOR: Record<GoalStatus, string> = {
  ahead: "#0ca30c",
  ontrack: "#0ca30c",
  behind: "#ec835a",
  nodata: "#898781",
};
