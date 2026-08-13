"use client";

import { useId, useState } from "react";

/* ------------------------------------------------------------------ */
/* Superfícies                                                         */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={`rounded-card border border-hairline bg-surface shadow-card ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-5">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink2">
          {description}
        </p>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* KPI                                                                 */
/* ------------------------------------------------------------------ */

export function StatGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
}) {
  const map = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6",
  } as const;
  return (
    <div className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${map[cols]}`}>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accentColor,
  footer,
}: {
  label: string;
  value: string;
  hint?: string;
  accentColor?: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-3.5 sm:p-4">
      {accentColor && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: accentColor }}
        />
      )}
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-ink sm:text-[26px]">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-muted">{hint}</p>}
      {footer && <div className="mt-2">{footer}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Controles                                                           */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="scroll-thin flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-pill border border-hairline bg-surface2 p-1"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-brand text-white shadow-sm"
                : "text-ink2 hover:bg-surface hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({
  children,
  color,
  tone = "soft",
}: {
  children: React.ReactNode;
  color?: string;
  tone?: "soft" | "solid" | "outline";
}) {
  if (tone === "solid") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold text-white"
        style={{ background: color ?? "var(--brand)" }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-medium"
      style={{
        borderColor: color ? `${color}44` : "var(--line)",
        background: color ? `${color}12` : "var(--surface-2)",
        color: color ?? "var(--ink-2)",
      }}
    >
      {color && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progresso                                                           */
/* ------------------------------------------------------------------ */

export function ProgressMeter({
  pct,
  color,
  pacing,
  height = 10,
  label,
}: {
  pct: number;
  color: string;
  /** marca do ritmo esperado (0–1) */
  pacing?: number;
  height?: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, pct || 0));
  return (
    <div
      className="relative w-full overflow-hidden rounded-pill bg-surface2"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span
        className="absolute left-0 top-0 h-full rounded-pill transition-[width] duration-500 ease-out"
        style={{ width: `${clamped * 100}%`, background: color }}
      />
      {pacing !== undefined && pacing > 0 && pacing < 1 && (
        <span
          aria-hidden
          title="ritmo esperado"
          className="absolute top-0 h-full w-[2px] bg-ink/45"
          style={{ left: `calc(${Math.min(100, pacing * 100)}% - 1px)` }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  description,
  icon = "clock",
}: {
  title: string;
  description?: string;
  icon?: "clock" | "chart" | "image" | "alert";
}) {
  const paths: Record<string, React.ReactNode> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4M12.5 15V8M17 15v-6" />
      </>
    ),
    image: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="M4.5 17l4.5-4 3.5 3 3-2.5 4 3.5" />
      </>
    ),
    alert: (
      <>
        <path d="M12 4.5l8.5 15h-17z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    ),
  };
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-hairline bg-surface2/60 px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {paths[icon]}
        </svg>
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-grid/70 ${className}`}
      aria-hidden
    />
  );
}

export function LoadingBlock() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      <Skeleton className="h-[300px]" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-[240px]" />
        <Skeleton className="h-[240px]" />
      </div>
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-6 text-center">
      <p className="text-sm font-semibold text-ink">
        Não foi possível carregar os dados
      </p>
      <p className="mx-auto mt-1 max-w-md break-words text-xs text-muted">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-pill bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Tentar novamente
        </button>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tabela (gêmea acessível de todo gráfico)                            */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  /** cor do marcador de série, quando a linha representa uma série */
  dot?: (row: T) => string | undefined;
}

export function DataTable<T>({
  columns,
  rows,
  caption,
  maxHeight,
}: {
  columns: Column<T>[];
  rows: T[];
  caption?: string;
  maxHeight?: number;
}) {
  return (
    <div
      className="scroll-thin -mx-1 overflow-auto px-1"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full min-w-[420px] border-collapse text-xs">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`sticky top-0 z-[1] bg-surface px-2 py-2 font-medium text-muted ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tnum">
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-hairline/60 last:border-0">
              {columns.map((c) => {
                const dot = c.dot?.(r);
                return (
                  <td
                    key={c.key}
                    className={`px-2 py-1.5 text-ink2 ${
                      c.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {dot ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: dot }}
                        />
                        <span className="truncate">{c.render(r)}</span>
                      </span>
                    ) : (
                      c.render(r)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão de gráfico com alternância gráfico/tabela                    */
/* ------------------------------------------------------------------ */

export function ChartCard({
  title,
  hint,
  controls,
  legend,
  table,
  children,
  className = "",
  dimmed = false,
}: {
  title: string;
  hint?: string;
  controls?: React.ReactNode;
  legend?: React.ReactNode;
  table?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** mantém o render anterior esmaecido durante o refetch */
  dimmed?: boolean;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const id = useId();
  return (
    <Card className={`p-3.5 sm:p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-ink">
            {title}
          </h3>
          {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
        </div>
        <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {controls}
          {table && (
            <div className="flex shrink-0 rounded-pill border border-hairline bg-surface2 p-0.5">
              {(["chart", "table"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  aria-controls={id}
                  title={v === "chart" ? "Ver gráfico" : "Ver tabela"}
                  className={`rounded-pill px-2 py-1 text-[11px] font-medium transition ${
                    view === v
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {v === "chart" ? "Gráfico" : "Tabela"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {legend && <div className="mb-2">{legend}</div>}
      <div
        id={id}
        className={`transition-opacity duration-200 ${
          dimmed ? "opacity-50" : "opacity-100"
        }`}
      >
        {view === "chart" || !table ? children : table}
      </div>
    </Card>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-[11px] text-ink2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
