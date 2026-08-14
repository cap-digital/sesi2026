"use client";

import { useMemo, useState } from "react";
import { useDash } from "./DataProvider";
import { Badge, Card, EmptyState, PageHeader, Segmented } from "./ui";
import {
  OBJECTIVE_METRIC,
  creatives as buildCreatives,
  investmentOrNull,
} from "@/lib/metrics";
import type { Creative } from "@/lib/metrics";
import { ctr } from "@/lib/metrics";
import {
  fmtBRL,
  fmtBRLOrDash,
  fmtCost,
  fmtDate,
  fmtInt,
  fmtPct,
} from "@/lib/format";
import { driveImageFallback } from "@/lib/normalize";
import type { Platform, Row } from "@/lib/types";
import type { PlatformDef } from "@/lib/campaigns";

function Thumb({ c, accent }: { c: Creative; accent: string }) {
  const [src, setSrc] = useState(c.creative);
  const [broken, setBroken] = useState(false);
  const link = c.permalink ?? c.videoUrl;

  /** cadeia de fallback antes de desistir do preview */
  const onError = () => {
    // YouTube: proporção original → thumbnail padrão
    if (src?.includes("/oardefault.jpg")) {
      setSrc(src.replace("/oardefault.jpg", "/hqdefault.jpg"));
      return;
    }
    // Drive: lh3 → endpoint de thumbnail do próprio drive
    if (src?.includes("lh3.googleusercontent.com/d/")) {
      const alt = driveImageFallback(src);
      if (alt) {
        setSrc(alt);
        return;
      }
    }
    setBroken(true);
  };

  const inner = broken || !src ? (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface2 text-muted">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-6 w-6"
      >
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="M4.5 17l4.5-4 3.5 3 3-2.5 4 3.5" />
      </svg>
      <span className="text-[10px]">sem preview</span>
    </div>
  ) : (
    // previews vêm de CDNs externas variáveis (fbcdn, googlesyndication, tiktok):
    // <img> puro evita configurar remotePatterns para cada host
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Preview do criativo ${c.ad}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      /* peças verticais (Shorts, stories) são recortadas um pouco acima do
         centro, onde normalmente fica a mensagem principal */
      className="h-full w-full bg-surface2 object-cover object-[50%_30%] transition duration-300 group-hover:scale-[1.03]"
    />
  );

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-card">
      {inner}
      {c.videoUrl && !broken && (
        <span
          aria-hidden
          className="absolute bottom-2 left-2 flex h-6 items-center gap-1 rounded-pill bg-black/55 px-2 text-[10px] font-semibold text-white backdrop-blur-sm"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          vídeo
        </span>
      )}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 flex h-7 items-center gap-1 rounded-pill bg-surface/92 px-2 text-[10px] font-semibold text-ink shadow-sm backdrop-blur transition hover:text-brand"
          style={{ boxShadow: `0 0 0 1px ${accent}22` }}
        >
          Abrir
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-3 w-3"
          >
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="tnum mt-0.5 truncate text-[13px] font-semibold text-ink">
        {value}
      </p>
    </div>
  );
}

export function CreativeCard({
  c,
  accent,
  platformLabel,
}: {
  c: Creative;
  accent: string;
  platformLabel?: string;
}) {
  const def = OBJECTIVE_METRIC[c.objective];
  const primary = c.totals[def.metric] as number;

  // não repete Impressões/Cliques quando eles já são a métrica-alvo do objetivo
  const cells: { label: string; value: string }[] = [
    {
      label: "Investimento",
      value: fmtBRLOrDash(investmentOrNull(c.totals)),
    },
    { label: "Impressões", value: fmtInt(c.totals.impressions) },
    { label: "Cliques", value: fmtInt(c.totals.clicks) },
    { label: "CTR", value: fmtPct(ctr(c.totals)) },
  ];
  if (def.metric !== "impressions" && def.metric !== "clicks") {
    cells.push({ label: def.metricLabel, value: fmtInt(primary) });
  }
  cells.push({ label: def.costLabel, value: fmtCost(def.cost(c.totals)) });

  return (
    <Card className="group flex flex-col overflow-hidden p-0 transition hover:shadow-float">
      <Thumb c={c} accent={accent} />
      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {platformLabel && (
            <Badge color={accent}>{platformLabel}</Badge>
          )}
          <Badge>{c.objective}</Badge>
        </div>
        <h3
          className="text-[13px] font-semibold leading-snug text-ink"
          title={c.ad}
        >
          {c.ad}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-muted" title={c.adset}>
          {c.adset}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-hairline pt-3">
          {cells.map((cell) => (
            <Metric key={cell.label} label={cell.label} value={cell.value} />
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Banner de resumo do conjunto de criativos                           */
/* ------------------------------------------------------------------ */

function BannerStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/60">
        {label}
      </p>
      <p className="tnum mt-1 truncate text-[20px] font-semibold leading-none text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-1 truncate text-[10.5px] text-white/60" title={sub}>
          {sub}
        </p>
      )}
    </div>
  );
}

function CreativesBanner({
  list,
  periodLabel,
}: {
  list: Creative[];
  periodLabel: string;
}) {
  const t = list.reduce(
    (a, c) => {
      a.investment += c.totals.investment;
      a.impressions += c.totals.impressions;
      a.clicks += c.totals.clicks;
      a.engagement += c.totals.engagement;
      a.views += c.totals.views;
      if (c.totals.impressions > 0) a.live += 1;
      return a;
    },
    {
      investment: 0,
      impressions: 0,
      clicks: 0,
      engagement: 0,
      views: 0,
      live: 0,
    }
  );

  // peça de melhor CTR entre as que tiveram entrega relevante
  const best = list
    .filter((c) => c.totals.impressions >= 100)
    .map((c) => ({ c, v: c.totals.clicks / c.totals.impressions }))
    .sort((a, b) => b.v - a.v)[0];

  const stats: { label: string; value: string; sub?: string }[] = [
    {
      label: "Anúncios veiculados",
      value: fmtInt(t.live),
      sub: t.live !== list.length ? `${list.length} peças no total` : undefined,
    },
    { label: "Investido", value: fmtBRL(t.investment) },
    { label: "Impressões", value: fmtInt(t.impressions) },
    {
      label: "Cliques",
      value: fmtInt(t.clicks),
      sub: t.impressions ? `CTR ${fmtPct(t.clicks / t.impressions)}` : undefined,
    },
  ];

  if (t.engagement > 0) {
    stats.push({
      label: "Engajamento",
      value: fmtInt(t.engagement),
      sub: `CPE ${fmtCost(t.investment / t.engagement)}`,
    });
  }
  if (t.views > 0) {
    stats.push({
      label: "Visualizações",
      value: fmtInt(t.views),
      sub: `CPV ${fmtCost(t.investment / t.views)}`,
    });
  }

  return (
    <div
      className="dots relative overflow-hidden rounded-card p-4 shadow-card sm:p-5"
      style={{
        background:
          "linear-gradient(120deg, var(--brand-deep) 0%, var(--brand) 78%)",
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
          Resumo dos criativos
        </p>
        <p className="tnum text-[10.5px] text-white/60">{periodLabel}</p>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <BannerStat key={s.label} {...s} />
        ))}
      </div>

      {best && (
        <p className="mt-4 truncate border-t border-white/15 pt-3 text-[11px] text-white/70">
          Melhor CTR:{" "}
          <strong className="font-semibold text-white">{best.c.ad}</strong>{" "}
          <span className="tnum">({fmtPct(best.v)})</span>
        </p>
      )}
    </div>
  );
}

type SortId = "investment" | "impressions" | "clicks" | "engagement" | "views";

const SORTS: { id: SortId; label: string }[] = [
  { id: "investment", label: "Investimento" },
  { id: "impressions", label: "Impressões" },
  { id: "clicks", label: "Cliques" },
  { id: "engagement", label: "Engajamento" },
  { id: "views", label: "Views" },
];

export function CreativesGrid({
  rows,
  platforms,
  accent,
  showPlatformFilter = false,
  emptyTitle = "Nenhum criativo no período",
  emptyDescription,
}: {
  rows: Row[];
  /** definições das plataformas presentes (cor + rótulo) */
  platforms: PlatformDef[];
  accent: string;
  showPlatformFilter?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [sort, setSort] = useState<SortId>("investment");
  const [platform, setPlatform] = useState<Platform | "all">("all");

  const list = useMemo(() => {
    const scoped =
      platform === "all" ? rows : rows.filter((r) => r.platform === platform);
    const items = buildCreatives(scoped);
    return items.sort(
      (a, b) => (b.totals[sort] as number) - (a.totals[sort] as number)
    );
  }, [rows, platform, sort]);

  const sortOptions = useMemo(() => {
    // só oferece ordenação por métricas que a seleção realmente tem
    const totals = buildCreatives(rows);
    return SORTS.filter(
      (s) =>
        s.id === "investment" ||
        totals.some((c) => (c.totals[s.id] as number) > 0)
    );
  }, [rows]);

  const { range } = useDash();
  const periodLabel = `${fmtDate(range.start)} – ${fmtDate(range.end)}`;

  return (
    <div className="space-y-4">
      {list.length > 0 && (
        <CreativesBanner list={list} periodLabel={periodLabel} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 max-w-full items-center gap-2">
          {showPlatformFilter && platforms.length > 1 && (
            <Segmented
              ariaLabel="Filtrar por plataforma"
              value={platform}
              onChange={setPlatform}
              options={[
                { id: "all" as const, label: "Todas" },
                ...platforms.map((p) => ({ id: p.id, label: p.short })),
              ]}
            />
          )}
        </div>
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <span className="shrink-0 text-[11px] text-muted">Ordenar por</span>
          <Segmented
            ariaLabel="Ordenar criativos"
            value={sort}
            onChange={setSort}
            options={sortOptions}
          />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="image"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <>
          <p className="text-[11px] text-muted">
            {list.length} {list.length === 1 ? "criativo" : "criativos"} no
            período
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((c) => {
              const def = platforms.find((p) => p.id === c.platform);
              return (
                <CreativeCard
                  key={c.key}
                  c={c}
                  accent={def?.color ?? accent}
                  platformLabel={
                    showPlatformFilter || platforms.length > 1
                      ? def?.short
                      : undefined
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Páginas prontas                                                     */
/* ------------------------------------------------------------------ */

export function PlatformCreativesPage({ def }: { def: PlatformDef }) {
  const { rows, allRows } = useDash();
  const scoped = useMemo(
    () => rows.filter((r) => r.platform === def.id),
    [rows, def.id]
  );
  const everHadData = useMemo(
    () => allRows.some((r) => r.platform === def.id),
    [allRows, def.id]
  );

  return (
    <>
      <PageHeader
        eyebrow={def.label}
        title="Criativos"
        description="Peças em veiculação com preview, entrega e custo por objetivo."
      />
      {!everHadData ? (
        <EmptyState
          icon="clock"
          title={`Criativos de ${def.label} ainda não disponíveis`}
          description="Assim que a veiculação começar, as peças aparecem aqui com preview e métricas."
        />
      ) : (
        <CreativesGrid
          rows={scoped}
          platforms={[def]}
          accent={def.color}
          emptyDescription="Nenhuma peça teve entrega no intervalo selecionado."
        />
      )}
    </>
  );
}

export function AllCreativesPage() {
  const { rows, campaign } = useDash();
  return (
    <>
      <PageHeader
        eyebrow="Campanha"
        title="Criativos"
        description="Todas as peças do período, com filtro por plataforma."
      />
      <CreativesGrid
        rows={rows}
        platforms={campaign.platforms}
        accent="var(--brand)"
        showPlatformFilter
        emptyDescription="Nenhuma peça teve entrega no intervalo selecionado."
      />
    </>
  );
}
