"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCompact, fmtDayShort } from "@/lib/format";

const AXIS = {
  stroke: "var(--muted)",
  fontSize: 11,
  fontFamily: "inherit",
};

export interface Series {
  key: string;
  label: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                            */
/* ------------------------------------------------------------------ */

function TooltipBox({
  title,
  items,
  total,
}: {
  title: string;
  items: { label: string; color: string; value: string }[];
  total?: string;
}) {
  return (
    <div className="pointer-events-none min-w-[152px] rounded-xl border border-hairline bg-surface/97 p-2.5 shadow-float backdrop-blur">
      <p className="mb-1.5 text-[11px] font-semibold text-ink">{title}</p>
      <ul className="space-y-1">
        {items.map((i) => (
          <li
            key={i.label}
            className="flex items-center justify-between gap-3 text-[11px]"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-ink2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: i.color }}
              />
              <span className="truncate">{i.label}</span>
            </span>
            <span className="tnum shrink-0 font-semibold text-ink">
              {i.value}
            </span>
          </li>
        ))}
      </ul>
      {total && (
        <p className="mt-1.5 flex items-center justify-between gap-3 border-t border-hairline pt-1.5 text-[11px]">
          <span className="text-muted">Total</span>
          <span className="tnum font-semibold text-ink">{total}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Série temporal empilhada por plataforma/objetivo                    */
/* ------------------------------------------------------------------ */

export function DailyStackedBars({
  data,
  series,
  format,
  height = 268,
  showTotal = true,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  format: (n: number) => string;
  height?: number;
  showTotal?: boolean;
}) {
  const active = series.filter((s) =>
    data.some((d) => Number(d[s.key] ?? 0) > 0)
  );
  const used = active.length ? active : series.slice(0, 1);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 6, right: 6, bottom: 0, left: -14 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--grid)"
            strokeWidth={1}
          />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDayShort}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            minTickGap={14}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={fmtCompact}
          />
          <Tooltip
            cursor={{ fill: "var(--grid)", fillOpacity: 0.45 }}
            content={({ active: on, payload, label }) => {
              if (!on || !payload?.length) return null;
              const items = payload
                .filter((p) => Number(p.value ?? 0) > 0)
                .map((p) => ({
                  label:
                    used.find((s) => s.key === p.dataKey)?.label ??
                    String(p.dataKey),
                  color: String(p.color ?? p.fill),
                  value: format(Number(p.value ?? 0)),
                }));
              if (!items.length) return null;
              const sum = payload.reduce(
                (a, p) => a + Number(p.value ?? 0),
                0
              );
              return (
                <TooltipBox
                  title={fmtDayShort(String(label))}
                  items={items}
                  total={
                    showTotal && items.length > 1 ? format(sum) : undefined
                  }
                />
              );
            }}
          />
          {used.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={s.color}
              /* 2px de superfície separando os segmentos empilhados */
              stroke="var(--surface)"
              strokeWidth={2}
              radius={i === used.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={44}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linha (uma métrica, uma ou mais séries, um único eixo)              */
/* ------------------------------------------------------------------ */

export function DailyLines({
  data,
  series,
  format,
  height = 240,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  format: (n: number) => string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDayShort}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            minTickGap={14}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={fmtCompact}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <TooltipBox
                  title={fmtDayShort(String(label))}
                  items={payload.map((p) => ({
                    label:
                      series.find((s) => s.key === p.dataKey)?.label ??
                      String(p.dataKey),
                    color: String(p.color ?? p.stroke),
                    value: format(Number(p.value ?? 0)),
                  }))}
                />
              );
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4.5,
                strokeWidth: 2,
                stroke: "var(--surface)",
              }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking horizontal com rótulo direto                               */
/* ------------------------------------------------------------------ */

export function RankBars({
  data,
  format,
  color = "var(--brand)",
}: {
  data: { label: string; value: number; color?: string }[];
  format: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[11.5px] font-medium text-ink2">
              {d.label}
            </span>
            <span className="tnum shrink-0 text-[11.5px] font-semibold text-ink">
              {format(d.value)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-surface2">
            <span
              className="block h-full rounded-pill transition-[width] duration-500"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color ?? color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Funil de retenção de vídeo — uma série, uma cor                     */
/* ------------------------------------------------------------------ */

export function FunnelBars({
  steps,
  color,
  format,
}: {
  steps: { label: string; value: number }[];
  color: string;
  format: (n: number) => string;
}) {
  const base = steps[0]?.value || 0;
  return (
    <ul className="space-y-2.5">
      {steps.map((s) => {
        const pct = base > 0 ? s.value / base : 0;
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-medium text-ink2">
                {s.label}
              </span>
              <span className="tnum text-[11.5px] text-ink">
                <span className="font-semibold">{format(s.value)}</span>
                {base > 0 && (
                  <span className="ml-1.5 text-muted">
                    {(pct * 100).toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-pill bg-surface2">
              <span
                className="block h-full rounded-pill transition-[width] duration-500"
                style={{ width: `${pct * 100}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Rosca para parte-do-todo (≤ 6 fatias)                              */
/* ------------------------------------------------------------------ */

export function SplitDonut({
  data,
  format,
  height = 210,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[];
  format: (n: number) => string;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const item = data.find((d) => d.label === p.name);
              return (
                <TooltipBox
                  title={String(p.name)}
                  items={[
                    {
                      label: "Valor",
                      color: item?.color ?? "var(--brand)",
                      value: `${format(Number(p.value ?? 0))}${
                        total > 0
                          ? ` · ${((Number(p.value) / total) * 100).toFixed(1)}%`
                          : ""
                      }`,
                    },
                  ]}
                />
              );
            }}
          />
          <Pie
            data={data.map((d) => ({ name: d.label, value: d.value }))}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-lg font-semibold leading-none text-ink">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="mt-1 text-[10px] uppercase tracking-wide text-muted">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barras agrupadas — faixa etária × gênero (categorias ordenadas)     */
/* ------------------------------------------------------------------ */

export function GroupedBars({
  data,
  series,
  format,
  height = 250,
  xKey = "label",
}: {
  data: Record<string, number | string>[];
  series: Series[];
  format: (n: number) => string;
  height?: number;
  xKey?: string;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey={xKey}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={fmtCompact}
          />
          <Tooltip
            cursor={{ fill: "var(--grid)", fillOpacity: 0.45 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <TooltipBox
                  title={String(label)}
                  items={payload.map((p) => ({
                    label:
                      series.find((s) => s.key === p.dataKey)?.label ??
                      String(p.dataKey),
                    color: String(p.color ?? p.fill),
                    value: format(Number(p.value ?? 0)),
                  }))}
                />
              );
            }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
