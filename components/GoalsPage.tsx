"use client";

import { useMemo } from "react";
import { useDash } from "./DataProvider";
import { GoalsBoard } from "./blocks";
import { KpiCard, PageHeader, StatGrid } from "./ui";
import { evaluateAll } from "@/lib/goals";
import { daysBetween } from "@/lib/dates";
import { fmtBRL, fmtPct } from "@/lib/format";

export function GoalsPage() {
  const { allRows, campaign, today } = useDash();

  const progress = useMemo(
    () => evaluateAll(allRows, campaign, today),
    [allRows, campaign, today]
  );

  const planned = progress.reduce((a, g) => a + g.goal.investment, 0);
  const spent = progress.reduce((a, g) => a + g.spent, 0);

  const totalDays = daysBetween(
    campaign.window.start,
    campaign.window.end
  ).length;
  const elapsed = Math.min(
    totalDays,
    daysBetween(
      campaign.window.start,
      today < campaign.window.end ? today : campaign.window.end
    ).length
  );

  // metas de meses futuros não entram na conta de ritmo
  const started = progress.filter((g) => g.status !== "notstarted");
  const onTrack = started.filter(
    (g) => g.status === "ahead" || g.status === "ontrack"
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={campaign.subtitle}
        title="Progresso de meta"
        description="Entrega e verba de cada meta contratada, com ritmo esperado e projeção até o fim do período."
      />

      <div className="mb-6">
        <StatGrid cols={4}>
          <KpiCard
            label="Verba planejada"
            value={fmtBRL(planned)}
            accentColor="var(--brand)"
          />
          <KpiCard
            label="Investido"
            value={fmtBRL(spent)}
            hint={`${fmtPct(planned ? spent / planned : 0, 1)} da verba`}
          />
          <KpiCard
            label="Período decorrido"
            value={`${elapsed} de ${totalDays} dias`}
            hint={fmtPct(totalDays ? elapsed / totalDays : 0, 0)}
          />
          <KpiCard
            label="Metas no ritmo"
            value={`${onTrack} de ${started.length}`}
            hint={
              started.length < progress.length
                ? `${progress.length - started.length} ainda não iniciada(s)`
                : undefined
            }
          />
        </StatGrid>
      </div>

      <GoalsBoard color="var(--brand)" />
    </>
  );
}
