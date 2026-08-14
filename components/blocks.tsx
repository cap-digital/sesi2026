"use client";

import { useMemo, useState } from "react";
import { useDash } from "./DataProvider";
import {
  Badge,
  Card,
  ChartCard,
  Column,
  DataTable,
  EmptyState,
  KpiCard,
  Legend,
  ProgressMeter,
  Segmented,
  StatGrid,
} from "./ui";
import { StackedBars, RankBars, type Series } from "./charts";
import {
  OBJECTIVE_METRIC,
  byObjective,
  cpm,
  ctr,
  daily,
  groupBy,
  investmentOrNull,
  sumRows,
} from "@/lib/metrics";
import type { ObjectiveSlice } from "@/lib/metrics";
import { STATUS_COLOR, STATUS_LABEL, evaluateAll } from "@/lib/goals";
import type { GoalProgress } from "@/lib/goals";
import {
  MONTH_NAMES,
  fmtBRL,
  fmtBRLCompact,
  fmtBRLLabel,
  fmtBRLOrDash,
  fmtCompact,
  fmtCost,
  fmtDate,
  fmtInt,
  fmtPct,
} from "@/lib/format";
import type { Platform, Row, Totals } from "@/lib/types";
import { platformDef } from "@/lib/campaigns";

/* ------------------------------------------------------------------ */
/* Linha de KPIs de volume                                            */
/* ------------------------------------------------------------------ */

export function VolumeKpis({
  totals,
  accent,
  extra = [],
  items: custom,
}: {
  totals: Totals;
  accent: string;
  extra?: { label: string; value: string; hint?: string }[];
  /** substitui o conjunto padrão de KPIs (usado quando a plataforma pede
   *  outras métricas de destaque) */
  items?: { label: string; value: string; hint?: string }[];
}) {
  const items =
    custom ?? [
      { label: "Investimento", value: fmtBRLOrDash(investmentOrNull(totals)) },
      { label: "Impressões", value: fmtInt(totals.impressions) },
      { label: "Cliques", value: fmtInt(totals.clicks) },
      { label: "CTR", value: fmtPct(ctr(totals)) },
      ...extra,
    ];
  const cols = items.length >= 6 ? 6 : items.length === 5 ? 5 : 4;
  return (
    <StatGrid cols={cols}>
      {items.map((i, idx) => (
        <KpiCard
          key={i.label}
          label={i.label}
          value={i.value}
          hint={i.hint}
          accentColor={idx === 0 ? accent : undefined}
        />
      ))}
    </StatGrid>
  );
}

/* ------------------------------------------------------------------ */
/* Eficiência por objetivo — cada custo com o investimento do próprio  */
/* objetivo, nunca com o total da conta                                */
/* ------------------------------------------------------------------ */

function ObjectiveCard({
  slice,
  color,
}: {
  slice: ObjectiveSlice;
  color: string;
}) {
  const t = slice.totals;
  return (
    <Card className="p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge color={color}>{slice.objective}</Badge>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            {slice.campaigns.length}{" "}
            {slice.campaigns.length === 1 ? "campanha" : "campanhas"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted">
            {slice.costLabel}
          </p>
          <p className="tnum text-xl font-semibold leading-none text-ink">
            {fmtCost(slice.costValue)}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-hairline pt-3 text-[11px]">
        {[
          { label: slice.primaryLabel, value: fmtInt(slice.primaryValue) },
          {
            label: "Investimento",
            value: fmtBRLOrDash(investmentOrNull(t)),
          },
          // não repete a métrica-alvo (ex.: impressões no objetivo de alcance)
          slice.primaryLabel === "Impressões"
            ? { label: "Cliques", value: fmtInt(t.clicks) }
            : { label: "Impressões", value: fmtInt(t.impressions) },
          { label: "CTR", value: fmtPct(ctr(t)) },
        ].map((row) => (
          <div key={row.label}>
            <dt className="uppercase tracking-wide text-muted">{row.label}</dt>
            <dd className="tnum mt-0.5 text-[13px] font-semibold text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function ObjectiveEfficiency({
  rows,
  color,
}: {
  rows: Row[];
  color: string;
}) {
  const slices = useMemo(() => byObjective(rows), [rows]);
  if (!slices.length) {
    return (
      <EmptyState
        icon="chart"
        title="Sem campanhas no período"
        description="Ajuste o filtro de datas para ver a eficiência por objetivo."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {slices.map((s) => (
        <ObjectiveCard key={s.objective} slice={s} color={color} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Série diária com seletor de métrica                                 */
/* ------------------------------------------------------------------ */

type MetricId = "investment" | "impressions" | "clicks" | "engagement" | "views";

const METRIC_DEFS: Record<
  MetricId,
  {
    label: string;
    format: (n: number) => string;
    /** versão curta, para o rótulo desenhado sobre a barra */
    labelFormat: (n: number) => string;
  }
> = {
  investment: {
    label: "Investimento",
    format: fmtBRLCompact,
    labelFormat: fmtBRLLabel,
  },
  impressions: {
    label: "Impressões",
    format: fmtCompact,
    labelFormat: fmtCompact,
  },
  clicks: { label: "Cliques", format: fmtCompact, labelFormat: fmtCompact },
  engagement: {
    label: "Engajamento",
    format: fmtCompact,
    labelFormat: fmtCompact,
  },
  views: {
    label: "Visualizações",
    format: fmtCompact,
    labelFormat: fmtCompact,
  },
};

export function DailyMetricCard({
  rows,
  series,
  seriesKey,
  title = "Evolução diária",
  hint,
}: {
  rows: Row[];
  series: Series[];
  seriesKey: (r: Row) => string;
  title?: string;
  hint?: string;
}) {
  const { days, refreshing } = useDash();
  const totals = useMemo(() => sumRows(rows), [rows]);

  const available = useMemo(() => {
    const ids: MetricId[] = ["investment", "impressions", "clicks"];
    if (totals.engagement > 0) ids.push("engagement");
    if (totals.views > 0) ids.push("views");
    return ids;
  }, [totals]);

  const [metric, setMetric] = useState<MetricId>("investment");
  const active = available.includes(metric) ? metric : "investment";
  const def = METRIC_DEFS[active];

  const data = useMemo(
    () => daily(rows, days, active, seriesKey),
    [rows, days, active, seriesKey]
  );

  const usedSeries = useMemo(
    () => series.filter((s) => data.some((d) => Number(d[s.key] ?? 0) > 0)),
    [series, data]
  );

  const tableColumns: Column<Record<string, number | string>>[] = [
    {
      key: "date",
      header: "Dia",
      render: (r) => fmtDate(String(r.date)),
    },
    ...usedSeries.map((s) => ({
      key: s.key,
      header: s.label,
      align: "right" as const,
      render: (r: Record<string, number | string>) =>
        def.format(Number(r[s.key] ?? 0)),
    })),
    {
      key: "total",
      header: "Total",
      align: "right" as const,
      render: (r) =>
        def.format(
          usedSeries.reduce((a, s) => a + Number(r[s.key] ?? 0), 0)
        ),
    },
  ];

  return (
    <ChartCard
      title={title}
      hint={hint ?? `${def.label} por dia · ${days.length} dias`}
      dimmed={refreshing}
      controls={
        <Segmented
          ariaLabel="Métrica do gráfico"
          value={active}
          onChange={(id) => setMetric(id as MetricId)}
          options={available.map((id) => ({
            id,
            label: METRIC_DEFS[id].label,
          }))}
        />
      }
      legend={
        usedSeries.length > 1 ? (
          <Legend
            items={usedSeries.map((s) => ({ label: s.label, color: s.color }))}
          />
        ) : undefined
      }
      table={
        <DataTable
          columns={tableColumns}
          rows={data}
          caption={`${def.label} por dia`}
          maxHeight={300}
        />
      }
    >
      {data.length === 0 || usedSeries.length === 0 ? (
        <EmptyState
          icon="chart"
          title="Sem entrega no período"
          description="Escolha outro intervalo de datas para ver a evolução diária."
        />
      ) : (
        <StackedBars
          data={data}
          series={usedSeries}
          format={def.format}
          labelFormat={def.labelFormat}
        />
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking (plataformas, campanhas, conjuntos)                         */
/* ------------------------------------------------------------------ */

export function RankCard({
  title,
  hint,
  data,
  format,
  color,
}: {
  title: string;
  hint?: string;
  data: { label: string; value: number; color?: string }[];
  format: (n: number) => string;
  color?: string;
}) {
  const { refreshing } = useDash();
  return (
    <ChartCard
      title={title}
      hint={hint}
      dimmed={refreshing}
      table={
        <DataTable
          columns={[
            {
              key: "label",
              header: "Item",
              render: (r: { label: string; color?: string }) => r.label,
              dot: (r) => r.color ?? color,
            },
            {
              key: "value",
              header: "Valor",
              align: "right",
              render: (r: { value: number }) => format(r.value),
            },
          ]}
          rows={data}
          caption={title}
        />
      }
    >
      {data.some((d) => d.value > 0) ? (
        <RankBars data={data} format={format} color={color} />
      ) : (
        <EmptyState icon="chart" title="Sem entrega no período" />
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Metas                                                              */
/* ------------------------------------------------------------------ */

/** rótulo e escala do custo unitário conforme a métrica da meta */
const GOAL_COST: Record<
  string,
  { label: string; scale: number }
> = {
  impressions: { label: "CPM", scale: 1000 },
  clicks: { label: "CPC", scale: 1 },
  engagement: { label: "CPE", scale: 1 },
  views: { label: "CPV", scale: 1 },
  investment: { label: "Custo", scale: 1 },
};

function GoalRow({ g, color }: { g: GoalProgress; color: string }) {
  const statusColor = STATUS_COLOR[g.status];
  const better = g.cost <= g.targetCost;
  const cost = GOAL_COST[g.goal.metric] ?? GOAL_COST.investment;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{g.goal.label}</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            {g.goal.metricLabel} · {fmtDate(g.window.start)} a{" "}
            {fmtDate(g.window.end)}
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `${statusColor}18`, color: statusColor }}
        >
          <StatusIcon status={g.status} />
          {STATUS_LABEL[g.status]}
        </span>
      </div>

      {/* meta da métrica */}
      <div className="mt-3.5">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="tnum text-[15px] font-semibold text-ink">
            {fmtInt(g.achieved)}
            <span className="ml-1 text-[11px] font-normal text-muted">
              / {fmtInt(g.goal.target)}
            </span>
          </span>
          <span className="tnum text-[13px] font-semibold" style={{ color }}>
            {fmtPct(g.pctMetric, 1)}
          </span>
        </div>
        <ProgressMeter
          pct={g.pctMetric}
          color={color}
          pacing={g.pacing}
          label={`${g.goal.label} — ${g.goal.metricLabel}`}
        />
      </div>

      {/* meta de investimento */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="tnum text-[12px] font-medium text-ink2">
            {g.spentMissing ? "—" : fmtBRL(g.spent)}
            <span className="ml-1 text-[11px] font-normal text-muted">
              / {fmtBRL(g.goal.investment)}
            </span>
          </span>
          <span className="tnum text-[11px] text-muted">
            {g.spentMissing
              ? "investimento não informado"
              : `${fmtPct(g.pctInvest, 1)} da verba`}
          </span>
        </div>
        <ProgressMeter
          pct={g.pctInvest}
          color="var(--muted)"
          height={6}
          label={`${g.goal.label} — investimento`}
        />
      </div>

      <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-hairline pt-3 text-[11px]">
        <div>
          <dt className="uppercase tracking-wide text-muted">
            {cost.label} real
          </dt>
          <dd className="tnum mt-0.5 font-semibold text-ink">
            {fmtCost(g.cost * cost.scale)}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-muted">
            {cost.label} previsto
          </dt>
          <dd className="tnum mt-0.5 font-semibold text-ink">
            {fmtCost(g.targetCost * cost.scale)}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-muted">Projeção</dt>
          <dd className="tnum mt-0.5 font-semibold text-ink">
            {g.hasData ? fmtInt(g.projected) : "—"}
          </dd>
        </div>
      </dl>
      {g.hasData && !g.spentMissing && isFinite(g.cost) && isFinite(g.targetCost) && (
        <p className="mt-2 text-[10.5px] leading-snug text-muted">
          {better
            ? `Custo ${fmtPct(1 - g.cost / g.targetCost, 0)} abaixo do previsto por ${g.goal.metricLabel.toLowerCase()}.`
            : `Custo ${fmtPct(g.cost / g.targetCost - 1, 0)} acima do previsto por ${g.goal.metricLabel.toLowerCase()}.`}
        </p>
      )}
    </Card>
  );
}

function StatusIcon({ status }: { status: GoalProgress["status"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-3 w-3",
  };
  if (status === "behind")
    return (
      <svg {...common}>
        <path d="M12 8v5M12 16.5h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  if (status === "notstarted")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  if (status === "nodata")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12h6" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M20 6.5L9.5 17 4 11.5" />
    </svg>
  );
}

export function GoalsBoard({ color }: { color: string }) {
  const { allRows, campaign, today } = useDash();
  const progress = useMemo(
    () => evaluateAll(allRows, campaign, today),
    [allRows, campaign, today]
  );

  const groups = campaign.monthly
    ? [...groupByMonth(progress).entries()].sort((a, b) => a[0] - b[0])
    : [[0, progress] as [number, GoalProgress[]]];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <p className="text-[11px] leading-relaxed text-muted">
          Acumulado de {fmtDate(campaign.window.start)} a{" "}
          {fmtDate(campaign.window.end)}. O traço vertical na barra marca o{" "}
          <strong>ritmo esperado</strong> para hoje ({fmtDate(today)}).
        </p>
      </Card>

      {groups.map(([month, list]) => {
        const totalTarget = list.reduce((a, g) => a + g.goal.investment, 0);
        const totalSpent = list.reduce((a, g) => a + g.spent, 0);
        return (
          <section key={month}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                {month ? MONTH_NAMES[month - 1] : "Metas da campanha"}
              </h2>
              <p className="tnum text-[11px] text-muted">
                {fmtBRL(totalSpent)} de {fmtBRL(totalTarget)} investidos
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {list.map((g) => (
                <GoalRow key={g.goal.id} g={g} color={color} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function groupByMonth(list: GoalProgress[]) {
  const map = new Map<number, GoalProgress[]>();
  for (const g of list) {
    const m = g.goal.month ?? 0;
    const arr = map.get(m);
    if (arr) arr.push(g);
    else map.set(m, [g]);
  }
  return map;
}

/** Resumo compacto de metas para a visão geral. */
export function GoalsSummary({ color }: { color: string }) {
  const { allRows, campaign, today } = useDash();
  const progress = useMemo(
    () => evaluateAll(allRows, campaign, today),
    [allRows, campaign, today]
  );

  return (
    <ChartCard
      title="Progresso das metas"
      hint="acumulado da campanha · traço = ritmo esperado"
      table={
        <DataTable
          columns={[
            {
              key: "label",
              header: "Meta",
              render: (g: GoalProgress) => g.goal.label,
            },
            {
              key: "metric",
              header: "Métrica",
              render: (g: GoalProgress) => g.goal.metricLabel,
            },
            {
              key: "achieved",
              header: "Realizado",
              align: "right",
              render: (g: GoalProgress) => fmtInt(g.achieved),
            },
            {
              key: "target",
              header: "Meta",
              align: "right",
              render: (g: GoalProgress) => fmtInt(g.goal.target),
            },
            {
              key: "pct",
              header: "%",
              align: "right",
              render: (g: GoalProgress) => fmtPct(g.pctMetric, 1),
            },
          ]}
          rows={progress}
          caption="Progresso das metas"
        />
      }
    >
      <ul className="space-y-3.5">
        {progress.map((g) => (
          <li key={g.goal.id}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-[11.5px] font-medium text-ink2">
                {g.goal.label}
                {g.goal.month ? (
                  <span className="ml-1.5 text-[10px] text-muted">
                    {MONTH_NAMES[g.goal.month - 1].slice(0, 3)}
                  </span>
                ) : null}
              </span>
              <span className="tnum text-[11.5px] text-ink">
                <span className="font-semibold">{fmtCompact(g.achieved)}</span>
                <span className="text-muted"> / {fmtCompact(g.goal.target)}</span>
                <span
                  className="ml-2 font-semibold"
                  style={{ color: STATUS_COLOR[g.status] }}
                >
                  {fmtPct(g.pctMetric, 0)}
                </span>
              </span>
            </div>
            <ProgressMeter
              pct={g.pctMetric}
              color={color}
              pacing={g.pacing}
              height={8}
              label={`${g.goal.label} — ${g.goal.metricLabel}`}
            />
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Aviso de plataforma sem dados                                       */
/* ------------------------------------------------------------------ */

export function PendingPlatforms() {
  const { emptyPlatforms, campaign } = useDash();
  if (!emptyPlatforms.length) return null;
  const labels = emptyPlatforms
    .map((p) => platformDef(campaign, p)?.label ?? p)
    .join(", ");
  return (
    <Card className="mb-4 flex items-start gap-3 p-3.5">
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ background: "#ec835a1f", color: "#b95a30" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-3.5 w-3.5"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      </span>
      <p className="text-[11.5px] leading-relaxed text-ink2">
        <strong className="font-semibold text-ink">Aguardando veiculação:</strong>{" "}
        {labels}. As metas já estão configuradas e os painéis são preenchidos
        automaticamente quando a entrega começar.
      </p>
    </Card>
  );
}

/** Aviso quando a origem não informou o investimento de alguma campanha. */
export function MissingInvestmentNotice({ rows }: { rows: Row[] }) {
  const affected = useMemo(() => {
    const map = groupBy(
      rows.filter((r) => r.investmentMissing),
      (r) => r.campaign
    );
    return [...map.keys()];
  }, [rows]);

  if (!affected.length) return null;

  return (
    <Card className="mb-4 flex items-start gap-3 p-3.5">
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ background: "#ec835a1f", color: "#b95a30" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M12 8v5M12 16.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <p className="text-[11.5px] leading-relaxed text-ink2">
        <strong className="font-semibold text-ink">
          Investimento não informado
        </strong>{" "}
        {affected.length === 1 ? "na campanha" : "nas campanhas"}{" "}
        {affected.map((c) => (
          <span key={c} className="text-ink">
            {c}
          </span>
        ))}
        . A entrega está contabilizada, mas o custo dessa campanha aparece como
        indisponível até o valor ser informado.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tabela de campanhas com custo por objetivo                          */
/* ------------------------------------------------------------------ */

export function CampaignTable({
  rows,
  variant,
}: {
  rows: Row[];
  /** no TikTok as colunas de meio viram visualizações e CPM */
  variant?: Platform;
}) {
  const videoView = variant === "tiktok";
  const list = useMemo(() => {
    const map = groupBy(rows, (r) => r.campaign);
    return [...map.entries()]
      .map(([campaign, list]) => {
        const totals = sumRows(list);
        const objective = list[0].objective;
        const def = OBJECTIVE_METRIC[objective];
        return {
          campaign,
          objective,
          totals,
          primary: totals[def.metric] as number,
          primaryLabel: def.metricLabel,
          costLabel: def.costLabel,
          cost: def.cost(totals),
        };
      })
      .sort((a, b) => b.totals.investment - a.totals.investment);
  }, [rows]);

  if (!list.length) return <EmptyState icon="chart" title="Sem campanhas no período" />;

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-hairline text-muted">
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Campanha
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Objetivo
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Investimento
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Impressões
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              {videoView ? "Visualizações" : "Cliques"}
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              {videoView ? "CPM" : "CTR"}
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Métrica-alvo
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Custo
            </th>
          </tr>
        </thead>
        <tbody className="tnum">
          {list.map((r) => (
            <tr
              key={r.campaign}
              className="border-b border-hairline/60 last:border-0"
            >
              <td className="max-w-[280px] px-2 py-2 text-left text-ink2">
                <span className="block truncate" title={r.campaign}>
                  {r.campaign}
                </span>
              </td>
              <td className="px-2 py-2 text-left">
                <span className="text-ink2">{r.objective}</span>
              </td>
              <td className="px-2 py-2 text-right font-semibold text-ink">
                {fmtBRLOrDash(investmentOrNull(r.totals))}
              </td>
              <td className="px-2 py-2 text-right text-ink2">
                {fmtInt(r.totals.impressions)}
              </td>
              <td className="px-2 py-2 text-right text-ink2">
                {fmtInt(videoView ? r.totals.views : r.totals.clicks)}
              </td>
              <td className="px-2 py-2 text-right text-ink2">
                {videoView ? fmtCost(cpm(r.totals)) : fmtPct(ctr(r.totals))}
              </td>
              <td className="px-2 py-2 text-right text-ink2">
                {fmtInt(r.primary)}{" "}
                <span className="text-[10px] text-muted">{r.primaryLabel}</span>
              </td>
              <td className="px-2 py-2 text-right font-semibold text-ink">
                {fmtCost(r.cost)}{" "}
                <span className="text-[10px] font-normal text-muted">
                  {r.costLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Série por plataforma (usada na visão geral)                         */
/* ------------------------------------------------------------------ */

export function usePlatformSeries(): Series[] {
  const { campaign } = useDash();
  return campaign.platforms.map((p) => ({
    key: p.id,
    label: p.short,
    color: p.color,
  }));
}

export const platformKey = (r: Row) => r.platform as Platform as string;
