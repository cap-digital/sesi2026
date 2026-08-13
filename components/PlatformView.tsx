"use client";

import { useMemo } from "react";
import { useDash } from "./DataProvider";
import {
  CampaignTable,
  DailyMetricCard,
  ObjectiveEfficiency,
  RankCard,
  VolumeKpis,
} from "./blocks";
import { FunnelBars, GroupedBars, SplitDonut, type Series } from "./charts";
import {
  Card,
  ChartCard,
  DataTable,
  EmptyState,
  Legend,
  PageHeader,
  SectionTitle,
} from "./ui";
import { ctr, groupBy, sumRows, vtr } from "@/lib/metrics";
import {
  fmtBRLCompact,
  fmtCompact,
  fmtCost,
  fmtInt,
  fmtPct,
} from "@/lib/format";
import type { PlatformDef } from "@/lib/campaigns";
import type { Objective, Row } from "@/lib/types";

/* paleta categórica validada (light) — ordem fixa por objetivo */
const OBJECTIVE_COLORS: Record<Objective, string> = {
  Alcance: "#2a78d6",
  Engajamento: "#d95926",
  Views: "#12876a",
  Tráfego: "#4a3aa7",
  "Performance Max": "#2a78d6",
  Outros: "#898781",
};

const GENDER_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  unknown: "Não informado",
};
const GENDER_ORDER = ["female", "male", "unknown"];
const ageLabel = (a: string) =>
  /unknown|desconhec/i.test(a) ? "Não informado" : a;
const GENDER_COLOR: Record<string, string> = {
  female: "#2a78d6",
  male: "#d95926",
  unknown: "#898781",
};

function objectiveSeries(rows: Row[]): Series[] {
  const seen = new Set<Objective>();
  for (const r of rows) seen.add(r.objective);
  return [...seen].map((o) => ({
    key: o,
    label: o,
    color: OBJECTIVE_COLORS[o],
  }));
}

/* ------------------------------------------------------------------ */
/* Demografia (Meta)                                                   */
/* ------------------------------------------------------------------ */

function Demographics({ rows }: { rows: Row[] }) {
  const { refreshing } = useDash();

  const genders = useMemo(() => {
    const map = groupBy(
      rows.filter((r) => r.gender),
      (r) => r.gender as string
    );
    return [...map.entries()]
      .map(([g, list]) => ({
        key: g,
        label: GENDER_LABEL[g] ?? g,
        value: sumRows(list).impressions,
        color: GENDER_COLOR[g] ?? "#898781",
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => GENDER_ORDER.indexOf(a.key) - GENDER_ORDER.indexOf(b.key));
  }, [rows]);

  const ages = useMemo(() => {
    const buckets = new Map<string, Record<string, number>>();
    for (const r of rows) {
      if (!r.age) continue;
      const b = buckets.get(r.age) ?? {};
      const key = r.gender ?? "unknown";
      b[key] = (b[key] ?? 0) + r.impressions;
      buckets.set(r.age, b);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, v]) => ({ label: ageLabel(label), ...v }));
  }, [rows]);

  const ageSeries: Series[] = useMemo(() => {
    const keys = new Set<string>();
    for (const a of ages)
      for (const k of Object.keys(a)) if (k !== "label") keys.add(k);
    return ["female", "male", "unknown"]
      .filter((k) => keys.has(k))
      .map((k) => ({
        key: k,
        label: GENDER_LABEL[k] ?? k,
        color: GENDER_COLOR[k],
      }));
  }, [ages]);

  const totalImpr = genders.reduce((a, g) => a + g.value, 0);
  if (!genders.length) return null;

  return (
    <section>
      <SectionTitle
        title="Perfil de audiência"
        hint="impressões por gênero e faixa etária"
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <ChartCard
          title="Por gênero"
          hint="participação nas impressões"
          dimmed={refreshing}
          legend={
            <Legend
              items={genders.map((g) => ({ label: g.label, color: g.color }))}
            />
          }
          table={
            <DataTable
              columns={[
                {
                  key: "label",
                  header: "Gênero",
                  render: (r: { label: string; color: string }) => r.label,
                  dot: (r) => r.color,
                },
                {
                  key: "value",
                  header: "Impressões",
                  align: "right",
                  render: (r: { value: number }) => fmtInt(r.value),
                },
                {
                  key: "pct",
                  header: "Part.",
                  align: "right",
                  render: (r: { value: number }) =>
                    fmtPct(totalImpr ? r.value / totalImpr : 0, 1),
                },
              ]}
              rows={genders}
              caption="Impressões por gênero"
            />
          }
        >
          <SplitDonut
            data={genders}
            format={fmtInt}
            centerValue={fmtCompact(totalImpr)}
            centerLabel="impressões"
          />
        </ChartCard>

        <ChartCard
          title="Por faixa etária"
          hint="impressões por faixa e gênero"
          dimmed={refreshing}
          legend={<Legend items={ageSeries} />}
          table={
            <DataTable
              columns={[
                {
                  key: "label",
                  header: "Faixa",
                  render: (r: Record<string, number | string>) =>
                    String(r.label),
                },
                ...ageSeries.map((s) => ({
                  key: s.key,
                  header: s.label,
                  align: "right" as const,
                  render: (r: Record<string, number | string>) =>
                    fmtInt(Number(r[s.key] ?? 0)),
                })),
              ]}
              rows={ages}
              caption="Impressões por faixa etária"
            />
          }
        >
          <GroupedBars data={ages} series={ageSeries} format={fmtInt} />
        </ChartCard>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Retenção de vídeo                                                   */
/* ------------------------------------------------------------------ */

function VideoRetention({
  rows,
  color,
}: {
  rows: Row[];
  color: string;
}) {
  const t = useMemo(() => sumRows(rows), [rows]);
  if (t.p25 + t.p50 + t.p75 + t.p100 <= 0) return null;

  // o funil parte de quem assistiu 25% — thruplay/views é contado por outra
  // régua e pode ficar abaixo do primeiro quartil
  const steps = [
    { label: "25% assistido", value: t.p25 },
    { label: "50% assistido", value: t.p50 },
    { label: "75% assistido", value: t.p75 },
    { label: "100% assistido", value: t.p100 },
  ].filter((s) => s.value > 0);

  const completion = t.p25 > 0 ? t.p100 / t.p25 : NaN;

  return (
    <ChartCard
      title="Retenção de vídeo"
      hint={`assistiram até o fim ${fmtPct(completion, 1)} · VTR ${fmtPct(
        vtr(t),
        2
      )}`}
      table={
        <DataTable
          columns={[
            {
              key: "label",
              header: "Etapa",
              render: (r: { label: string }) => r.label,
            },
            {
              key: "value",
              header: "Visualizações",
              align: "right",
              render: (r: { value: number }) => fmtInt(r.value),
            },
          ]}
          rows={steps}
          caption="Retenção de vídeo"
        />
      }
    >
      <>
        <FunnelBars steps={steps} color={color} format={fmtInt} />
        {t.views > 0 && (
          <p className="mt-3 border-t border-hairline pt-2.5 text-[11px] text-muted">
            Visualizações contabilizadas:{" "}
            <strong className="tnum font-semibold text-ink">
              {fmtInt(t.views)}
            </strong>
          </p>
        )}
      </>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Visão geral de plataforma                                           */
/* ------------------------------------------------------------------ */

export function PlatformView({ def }: { def: PlatformDef }) {
  const { rows: allPeriodRows, allRows, refreshing } = useDash();

  const rows = useMemo(
    () => allPeriodRows.filter((r) => r.platform === def.id),
    [allPeriodRows, def.id]
  );
  const platformEverHadData = useMemo(
    () => allRows.some((r) => r.platform === def.id),
    [allRows, def.id]
  );

  const totals = useMemo(() => sumRows(rows), [rows]);
  const series = useMemo(() => objectiveSeries(rows), [rows]);

  const adsets = useMemo(() => {
    const map = groupBy(rows, (r) => r.adset);
    return [...map.entries()]
      .map(([label, list]) => ({
        label,
        value: sumRows(list).investment,
        color: def.color,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows, def.color]);

  const extra = useMemo(() => {
    const out: { label: string; value: string; hint?: string }[] = [];
    if (totals.engagement > 0) {
      out.push({
        label: "Engajamento",
        value: fmtInt(totals.engagement),
      });
    }
    if (totals.views > 0) {
      out.push({ label: "Visualizações", value: fmtInt(totals.views) });
    }
    return out.slice(0, 1);
  }, [totals]);

  if (!platformEverHadData) {
    return (
      <>
        <PageHeader
          eyebrow="Plataforma"
          title={def.label}
          description="Visão geral de desempenho."
        />
        <EmptyState
          icon="clock"
          title={`${def.label} ainda sem dados`}
          description="Ainda não há entrega registrada nesta plataforma. A meta já está configurada e o painel é preenchido automaticamente quando a veiculação começar."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title={def.label}
        description="Volume, eficiência por objetivo e evolução diária no período selecionado."
      />

      <div className="space-y-6">
        <VolumeKpis totals={totals} accent={def.color} extra={extra} />

        <section>
          <SectionTitle
            title="Eficiência por objetivo"
            hint="métrica-alvo e custo de cada objetivo"
          />
          <ObjectiveEfficiency rows={rows} color={def.color} />
        </section>

        <DailyMetricCard
          rows={rows}
          series={series}
          seriesKey={(r) => r.objective}
          title="Evolução diária por objetivo"
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <RankCard
            title="Investimento por conjunto"
            hint="top 8 conjuntos de anúncio"
            data={adsets}
            format={fmtBRLCompact}
            color={def.color}
          />
          <VideoRetention rows={rows} color={def.color} />
          {totals.impressions > 0 && (
            <Card className="p-3.5 sm:p-4">
              <SectionTitle title="Taxas da plataforma" hint="somando todos os objetivos" />
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3.5 text-[11px]">
                <Rate label="CTR" value={fmtPct(ctr(totals))} />
                <Rate
                  label="CTR no link"
                  value={fmtPct(
                    totals.impressions
                      ? totals.linkClicks / totals.impressions
                      : 0
                  )}
                />
                <Rate
                  label="CPM"
                  value={fmtCost(
                    totals.impressions
                      ? (totals.investment * 1000) / totals.impressions
                      : NaN
                  )}
                />
                <Rate
                  label="CPC"
                  value={fmtCost(
                    totals.clicks ? totals.investment / totals.clicks : NaN
                  )}
                />
              </dl>
            </Card>
          )}
        </div>

        {def.id === "meta" && <Demographics rows={rows} />}

        <section>
          <SectionTitle
            title="Campanhas"
            hint="métrica-alvo e custo calculados por objetivo"
          />
          <Card className={`p-3.5 sm:p-4 ${refreshing ? "opacity-50" : ""}`}>
            <CampaignTable rows={rows} />
          </Card>
        </section>
      </div>
    </>
  );
}

function Rate({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-muted">{label}</dt>
      <dd className="tnum mt-0.5 text-[15px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

export { OBJECTIVE_COLORS };
