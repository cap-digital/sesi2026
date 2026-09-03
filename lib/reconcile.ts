import type { CampaignDef } from "./campaigns";
import type { Dataset, Row } from "./types";

/**
 * Reconciliação com o total informado pela plataforma.
 *
 * O relatório do PMAX chega em nível de asset e não fecha com o total da
 * campanha no Google Ads: parte dos cliques não recebe atribuição a nenhum
 * asset. A diferença é entrega real, mas a origem não diz de que dia nem de
 * que peça ela veio.
 *
 * O rateio distribui essa diferença proporcionalmente à distribuição que a
 * própria campanha teve na janela — a base é a curva medida, não uma escolha
 * de datas. É um modelo declarado, não medição: a curva diária fica contínua e
 * o total fecha com a plataforma, mas nenhuma linha ganha número inventado
 * fora da proporção que ela já tinha.
 */
export interface Reconciliation {
  /** rótulo para conferência */
  label: string;
  platform: Row["platform"];
  /** métrica reconciliada — a soma das linhas passa a bater com `total` */
  metric: "clicks" | "linkClicks" | "impressions";
  window: { start: string; end: string };
  /** total da janela segundo o relatório de campanha da plataforma */
  total: number;
}

export interface ReconciliationResult {
  label: string;
  metric: string;
  measured: number;
  total: number;
  /** quanto foi rateado (0 = base já fechava com a plataforma) */
  delta: number;
}

/**
 * Reparte `delta` entre os pesos por maior resto, para a soma dos inteiros
 * fechar exatamente em `delta` — sem sobra de arredondamento.
 */
function apportion(weights: number[], delta: number): number[] {
  const totalWeight = weights.reduce((a, w) => a + w, 0);
  if (totalWeight <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (w / totalWeight) * delta);
  const floors = exact.map(Math.floor);
  let rest = delta - floors.reduce((a, n) => a + n, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const out = [...floors];
  for (const { i } of order) {
    if (rest <= 0) break;
    out[i] += 1;
    rest -= 1;
  }
  return out;
}

/**
 * Aplica as reconciliações da campanha. Devolve linhas novas — as originais
 * não são mutadas — e o resumo do que foi rateado, para conferência.
 */
export function reconcile(
  rows: Row[],
  campaign: CampaignDef
): { rows: Row[]; applied: ReconciliationResult[] } {
  const specs = campaign.reconcile;
  if (!specs?.length) return { rows, applied: [] };

  let out = rows;
  const applied: ReconciliationResult[] = [];

  for (const spec of specs) {
    const idx: number[] = [];
    for (let i = 0; i < out.length; i++) {
      const r = out[i];
      if (
        r.platform === spec.platform &&
        r.date >= spec.window.start &&
        r.date <= spec.window.end
      ) {
        idx.push(i);
      }
    }

    const measured = idx.reduce((a, i) => a + out[i][spec.metric], 0);
    const delta = Math.round(spec.total - measured);
    applied.push({
      label: spec.label,
      metric: spec.metric,
      measured,
      total: spec.total,
      delta,
    });

    // base já fecha (ou passou) o total da plataforma: nada a ratear
    if (delta <= 0 || !idx.length) continue;

    const share = apportion(
      idx.map((i) => out[i][spec.metric]),
      delta
    );
    const next = [...out];
    idx.forEach((i, k) => {
      if (!share[k]) return;
      next[i] = { ...next[i], [spec.metric]: next[i][spec.metric] + share[k] };
    });
    out = next;
  }

  return { rows: out, applied };
}

/** Dataset com as reconciliações da campanha já aplicadas. */
export function reconcileDataset(
  dataset: Dataset,
  campaign: CampaignDef
): Dataset {
  const { rows, applied } = reconcile(dataset.rows, campaign);
  return { ...dataset, rows, reconciled: applied };
}
