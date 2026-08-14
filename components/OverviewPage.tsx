"use client";

import { useMemo } from "react";
import { useDash } from "./DataProvider";
import {
  CampaignTable,
  DailyMetricCard,
  GoalsSummary,
  MissingInvestmentNotice,
  ObjectiveEfficiency,
  PendingPlatforms,
  RankCard,
  VolumeKpis,
  usePlatformSeries,
} from "./blocks";
import { Card, PageHeader, SectionTitle } from "./ui";
import { groupBy, sumRows } from "@/lib/metrics";
import { fmtBRLCompact, fmtInt } from "@/lib/format";

export function OverviewPage({ title = "Visão geral" }: { title?: string }) {
  const { rows, totals, campaign, refreshing } = useDash();
  const series = usePlatformSeries();

  const extra = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    if (totals.engagement > 0)
      out.push({ label: "Engajamento", value: fmtInt(totals.engagement) });
    if (totals.views > 0)
      out.push({ label: "Visualizações", value: fmtInt(totals.views) });
    return out;
  }, [totals]);

  const platformRank = useMemo(() => {
    const map = groupBy(rows, (r) => r.platform);
    return campaign.platforms
      .map((p) => ({
        label: p.label,
        value: sumRows(map.get(p.id) ?? []).investment,
        color: p.color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [rows, campaign.platforms]);

  return (
    <>
      <PageHeader
        eyebrow={campaign.subtitle}
        title={title}
        description="Investimento, entrega e eficiência das plataformas no período selecionado."
      />

      <PendingPlatforms />
      <MissingInvestmentNotice rows={rows} />

      <div className="space-y-6">
        <VolumeKpis totals={totals} accent="var(--brand)" extra={extra} />

        <DailyMetricCard
          rows={rows}
          series={series}
          seriesKey={(r) => r.platform}
          title="Evolução diária por plataforma"
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <RankCard
            title="Investimento por plataforma"
            data={platformRank}
            format={fmtBRLCompact}
          />
          <GoalsSummary color="var(--brand)" />
        </div>

        <section>
          <SectionTitle
            title="Eficiência por objetivo"
            hint="métrica-alvo e custo de cada objetivo"
          />
          <ObjectiveEfficiency rows={rows} color="var(--brand)" />
        </section>

        <section>
          <SectionTitle title="Campanhas" hint="desempenho no período" />
          <Card className={`p-3.5 sm:p-4 ${refreshing ? "opacity-50" : ""}`}>
            <CampaignTable rows={rows} />
          </Card>
        </section>
      </div>
    </>
  );
}
