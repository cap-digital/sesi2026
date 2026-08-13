"use client";

import { useDash } from "./DataProvider";
import { PRESETS, clamp } from "@/lib/dates";
import { fmtDate } from "@/lib/format";

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-pill border border-hairline bg-surface px-3 py-1.5 sm:flex-none">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="tnum w-full min-w-0 border-0 bg-transparent p-0 text-xs font-medium text-ink outline-none focus:ring-0 sm:w-[104px]"
        aria-label={`${label} do período`}
      />
    </label>
  );
}

export function DateRangeBar({
  sticky = true,
  topClass = "top-[62px] lg:top-3",
}: {
  sticky?: boolean;
  /** offset do sticky — evita sobreposição com a barra de navegação */
  topClass?: string;
}) {
  const {
    range,
    setRange,
    presetId,
    applyPreset,
    campaign,
    today,
    refresh,
    refreshing,
    stale,
  } = useDash();

  const min = campaign.window.start;
  const max = campaign.window.end;

  const setStart = (v: string) => {
    const start = clamp(v, min, max);
    setRange({ start, end: range.end < start ? start : range.end });
  };
  const setEnd = (v: string) => {
    const end = clamp(v, min, max);
    setRange({ start: range.start > end ? end : range.start, end });
  };

  return (
    <div
      className={`${
        sticky ? `sticky z-30 ${topClass}` : ""
      } mb-4 rounded-card border border-hairline bg-surface/95 p-2 shadow-card backdrop-blur-md`}
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="scroll-thin -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
          {PRESETS.map((p) => {
            const active = presetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "border border-hairline bg-surface text-ink2 hover:border-brand/40 hover:text-brand"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stale && (
            <span
              title="A origem dos dados não respondeu; exibindo a última carga bem-sucedida."
              className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-medium"
              style={{ background: "#ec835a1f", color: "#b95a30" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-3 w-3"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5V12l3 2" />
              </svg>
              Última carga disponível
            </span>
          )}
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <DateField
              label="Início"
              value={range.start}
              min={min}
              max={max}
              onChange={setStart}
            />
            <span aria-hidden className="text-muted">
              –
            </span>
            <DateField
              label="Fim"
              value={range.end}
              min={min}
              max={max}
              onChange={setEnd}
            />
          </div>

          <button
            onClick={refresh}
            disabled={refreshing}
            title={`Atualizar dados · hoje ${fmtDate(today)}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
            aria-label="Atualizar dados"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            >
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 4.5V11h-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
