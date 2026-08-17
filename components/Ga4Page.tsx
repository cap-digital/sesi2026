"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDash } from "./DataProvider";
import { StackedBars, type Series } from "./charts";
import {
  Badge,
  ChartCard,
  DataTable,
  EmptyState,
  ErrorBlock,
  KpiCard,
  LoadingBlock,
  PageHeader,
  Segmented,
  StatGrid,
} from "./ui";
import { fmtCompact, fmtDate, fmtInt, fmtPct } from "@/lib/format";
import type { Ga4Event, Ga4Page as Ga4PageRow, Ga4Report } from "@/lib/ga4";

/** 83 → "1m 23s" */
function fmtDuration(seconds: number) {
  const s = Math.round(seconds || 0);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/* ------------------------------------------------------------------ */
/* Destaque da conversão                                               */
/* ------------------------------------------------------------------ */

function ConversionBanner({ report }: { report: Ga4Report }) {
  const p = report.primaryEvent;
  const { totals } = report;

  if (!p) {
    return (
      <EmptyState
        icon="alert"
        title="Nenhuma conversão marcada no GA4"
        description="Marque o evento de envio do formulário como conversão na property para ele aparecer aqui em destaque."
      />
    );
  }

  const perUser = totals.users > 0 ? p.users / totals.users : 0;
  const perSession = totals.sessions > 0 ? p.users / totals.sessions : 0;

  const stats = [
    { label: "Pessoas que enviaram", value: fmtInt(p.users) },
    { label: "Taxa sobre usuários", value: fmtPct(perUser, 1) },
    { label: "Taxa sobre sessões", value: fmtPct(perSession, 1) },
    {
      label: "Marcadas como conversão",
      value: fmtInt(totals.keyEvents),
    },
  ];

  return (
    <div
      className="dots relative overflow-hidden rounded-card p-4 shadow-card sm:p-5"
      style={{
        background:
          "linear-gradient(120deg, var(--brand-deep) 0%, var(--brand) 78%)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
            Conversão do site
          </p>
          <p className="mt-1.5 truncate text-[14px] font-semibold text-white/90">
            {p.name}
          </p>
          <p className="tnum mt-2.5 text-[40px] font-semibold leading-none text-white">
            {fmtInt(p.count)}
          </p>
          <p className="mt-2 text-[11px] text-white/70">
            envios registrados no período
          </p>
        </div>

        {/* stats centralizados na altura do número, separados por divisores */}
        <div className="flex w-full flex-wrap items-center gap-y-5 sm:w-auto sm:flex-nowrap sm:divide-x sm:divide-white/20">
          {stats.map((s) => (
            <div
              key={s.label}
              className="w-1/2 min-w-0 text-left sm:w-auto sm:px-6 sm:text-center sm:first:pl-0 sm:last:pr-0"
            >
              <p className="tnum text-[24px] font-semibold leading-none text-white">
                {s.value}
              </p>
              <p className="mt-2 text-[10px] font-medium uppercase leading-snug tracking-[0.08em] text-white/60">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Série diária                                                        */
/* ------------------------------------------------------------------ */

type DailyMetric = "sessions" | "users" | "primaryEvent";

const DAILY_LABEL: Record<DailyMetric, string> = {
  sessions: "Sessões",
  users: "Usuários",
  primaryEvent: "Envios",
};

function DailyCard({ report }: { report: Ga4Report }) {
  const { days } = useDash();
  const [metric, setMetric] = useState<DailyMetric>("sessions");

  const hasPrimary = report.daily.some((d) => d.primaryEvent > 0);
  const active = metric === "primaryEvent" && !hasPrimary ? "sessions" : metric;

  /** alinha ao eixo do restante do painel: um ponto por dia do filtro */
  const data = useMemo(() => {
    const index = new Map(report.daily.map((d) => [d.date, d]));
    return days.map((date) => ({
      date,
      value: (index.get(date)?.[active] as number) ?? 0,
    }));
  }, [report.daily, days, active]);

  const series: Series[] = [
    { key: "value", label: DAILY_LABEL[active], color: "var(--brand)" },
  ];

  const options = (
    ["sessions", "users", ...(hasPrimary ? (["primaryEvent"] as const) : [])] as DailyMetric[]
  ).map((id) => ({ id, label: DAILY_LABEL[id] }));

  return (
    <ChartCard
      title="Evolução diária"
      hint={`${DAILY_LABEL[active]} por dia · ${days.length} dias`}
      controls={
        <Segmented
          ariaLabel="Métrica do gráfico"
          value={active}
          onChange={(id) => setMetric(id as DailyMetric)}
          options={options}
        />
      }
      table={
        <DataTable
          columns={[
            {
              key: "date",
              header: "Dia",
              render: (r: { date: string }) => fmtDate(r.date),
            },
            {
              key: "value",
              header: DAILY_LABEL[active],
              align: "right",
              render: (r: { value: number }) => fmtInt(r.value),
            },
          ]}
          rows={data}
          caption={`${DAILY_LABEL[active]} por dia`}
          maxHeight={300}
        />
      }
    >
      {data.some((d) => d.value > 0) ? (
        <StackedBars
          data={data}
          series={series}
          format={fmtInt}
          labelFormat={fmtCompact}
        />
      ) : (
        <EmptyState icon="chart" title="Sem sessões no período" />
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function Ga4Page() {
  const { range, campaign } = useDash();
  const [report, setReport] = useState<Ga4Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ga4?start=${range.start}&end=${range.end}`
      );
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setReport(json as Ga4Report);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "falha ao consultar o GA4");
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <PageHeader
      eyebrow={campaign.subtitle}
      title="Google Analytics 4"
      description="Comportamento no site da campanha: audiência, engajamento e envios do formulário."
    />
  );

  if (loading && !report) {
    return (
      <>
        {header}
        <LoadingBlock />
      </>
    );
  }

  if (error && !report) {
    return (
      <>
        {header}
        <ErrorBlock message={error} onRetry={load} />
      </>
    );
  }

  if (!report) return header;

  const { totals } = report;
  const noData = totals.sessions === 0;

  return (
    <>
      {header}

      {report.dataFrom && (
        <p className="mb-4 text-[11px] text-muted">
          Dados do site de {fmtDate(report.dataFrom)} a{" "}
          {fmtDate(report.dataTo ?? report.dataFrom)}.
        </p>
      )}

      <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
        <ConversionBanner report={report} />

        <StatGrid cols={5}>
          <KpiCard
            label="Usuários"
            value={fmtInt(totals.users)}
            accentColor="var(--brand)"
          />
          <KpiCard label="Sessões" value={fmtInt(totals.sessions)} />
          <KpiCard
            label="Visualizações"
            value={fmtInt(totals.pageViews)}
          />
          <KpiCard
            label="Taxa de engajamento"
            value={fmtPct(totals.engagementRate, 1)}
            hint={`${fmtInt(totals.engagedSessions)} sessões engajadas`}
          />
          <KpiCard
            label="Duração média"
            value={fmtDuration(totals.avgSessionDuration)}
            hint="por sessão"
          />
        </StatGrid>

        {noData ? (
          <EmptyState
            icon="clock"
            title="Sem sessões no período selecionado"
            description="Ajuste o filtro de datas para um intervalo em que o site já recebia acesso."
          />
        ) : (
          <>
            <DailyCard report={report} />

            <div className="grid gap-3 lg:grid-cols-2">
              <ChartCard title="Eventos" hint="todos os eventos coletados no período">
                <DataTable
                  columns={[
                    {
                      key: "name",
                      header: "Evento",
                      render: (r: Ga4Event) => (
                        <span className="flex items-center gap-1.5">
                          <span className="truncate">{r.name}</span>
                          {r.isKeyEvent && (
                            <Badge color="var(--accent)">conversão</Badge>
                          )}
                        </span>
                      ),
                    },
                    {
                      key: "count",
                      header: "Eventos",
                      align: "right",
                      render: (r: Ga4Event) => fmtInt(r.count),
                    },
                    {
                      key: "users",
                      header: "Usuários",
                      align: "right",
                      render: (r: Ga4Event) => fmtInt(r.users),
                    },
                  ]}
                  rows={report.events}
                  caption="Eventos do período"
                  maxHeight={340}
                />
              </ChartCard>

              <ChartCard title="Páginas" hint="mais vistas no período">
                <DataTable
                  columns={[
                    {
                      key: "path",
                      header: "Página",
                      render: (r: Ga4PageRow) => r.path,
                    },
                    {
                      key: "views",
                      header: "Views",
                      align: "right",
                      render: (r: Ga4PageRow) => fmtInt(r.views),
                    },
                    {
                      key: "users",
                      header: "Usuários",
                      align: "right",
                      render: (r: Ga4PageRow) => fmtInt(r.users),
                    },
                  ]}
                  rows={report.pages}
                  caption="Páginas mais vistas"
                  maxHeight={340}
                />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </>
  );
}
