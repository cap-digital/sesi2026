"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
/* Rótulos de dados: só entram quando cabem, nunca um sobre o outro    */
/* ------------------------------------------------------------------ */

const LABEL_SIZE = 10.5;
/** largura aproximada do rótulo (Geist ≈ 0,58em por caractere) */
const labelWidth = (text: string) => text.length * LABEL_SIZE * 0.58 + 4;

/** contraste WCAG, para decidir a cor do rótulo dentro da barra */
const chan = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * chan((n >> 16) & 255) +
    0.7152 * chan((n >> 8) & 255) +
    0.0722 * chan(n & 255)
  );
}
/** tinta legível sobre a cor da série (branco só quando passa 4.5:1) */
export function inkOn(bg: string) {
  if (!bg.startsWith("#") || bg.length !== 7) return "#ffffff";
  const l = luminance(bg);
  const white = 1.05 / (l + 0.05);
  return white >= 4.5 ? "#ffffff" : "#141210";
}

/** mede a largura real do container, para saber quanto espaço cada rótulo tem */
function useWidth<T extends HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Passo de rarefação: quantos itens pular para que dois rótulos vizinhos
 * nunca se toquem. Ancorado no fim, para o dia mais recente sempre aparecer.
 */
function labelStride(labels: string[], slot: number) {
  if (slot <= 0) return 1;
  const widest = labels.reduce((m, t) => Math.max(m, labelWidth(t)), 0);
  return Math.max(1, Math.ceil((widest + 8) / slot));
}

/** rótulo acima da barra, desenhado só nos índices que passam no filtro */
function TopLabel({
  visible,
  format,
}: {
  visible: (index: number) => boolean;
  format: (n: number) => string;
}) {
  const Renderer = (props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    value?: number | string;
    index?: number;
  }) => {
    const index = props.index ?? 0;
    const value = Number(props.value ?? 0);
    if (!visible(index) || value <= 0) return null;
    const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
    const y = Number(props.y ?? 0) - 6;
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize={LABEL_SIZE}
        fontWeight={600}
        fill="var(--ink)"
      >
        {format(value)}
      </text>
    );
  };
  return Renderer;
}

/** rótulo dentro do segmento empilhado, só quando o segmento comporta */
function SegmentLabel({
  color,
  visible,
  format,
}: {
  color: string;
  visible: (index: number) => boolean;
  format: (n: number) => string;
}) {
  const ink = inkOn(color);
  const Renderer = (props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    value?: number | string;
    index?: number;
  }) => {
    const index = props.index ?? 0;
    const value = Number(props.value ?? 0);
    if (!visible(index) || value <= 0) return null;

    const w = Number(props.width ?? 0);
    const h = Number(props.height ?? 0);
    const text = format(value);
    // não desenha se o texto não couber com folga dentro do segmento
    if (h < 16 || w < labelWidth(text) + 6) return null;

    return (
      <text
        x={Number(props.x ?? 0) + w / 2}
        y={Number(props.y ?? 0) + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={LABEL_SIZE}
        fontWeight={600}
        fill={ink}
      >
        {text}
      </text>
    );
  };
  return Renderer;
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

export function StackedBars({
  data,
  series,
  format,
  labelFormat,
  height = 268,
  showTotal = true,
  xKey = "date",
  xFormat = fmtDayShort,
  interval = "preserveStartEnd",
}: {
  data: Record<string, number | string>[];
  series: Series[];
  format: (n: number) => string;
  /** versão curta usada nos rótulos desenhados no gráfico */
  labelFormat?: (n: number) => string;
  height?: number;
  showTotal?: boolean;
  xKey?: string;
  xFormat?: (v: string) => string;
  interval?: 0 | "preserveStartEnd";
}) {
  const fmtLabel = labelFormat ?? format;
  const active = series.filter((s) =>
    data.some((d) => Number(d[s.key] ?? 0) > 0)
  );
  const used = active.length ? active : series.slice(0, 1);

  const [ref, width] = useWidth();

  // total por dia: alimenta o rótulo acima da barra
  const withTotals = data.map((d) => ({
    ...d,
    __total: used.reduce((a, s) => a + Number(d[s.key] ?? 0), 0),
  }));

  const plotWidth = Math.max(0, width - 46);
  const slot = data.length ? plotWidth / data.length : 0;
  const stride = labelStride(
    withTotals.map((d) => fmtLabel(Number(d.__total))),
    slot
  );
  // ancorado no fim: o dia mais recente é sempre rotulado
  const visible = (i: number) => (data.length - 1 - i) % stride === 0;

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          data={withTotals}
          margin={{ top: 22, right: 6, bottom: 0, left: -14 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--grid)"
            strokeWidth={1}
          />
          <XAxis
            dataKey={xKey}
            tickFormatter={xFormat}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            minTickGap={8}
            interval={interval}
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
                  title={xFormat(String(label))}
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
              maxBarSize={56}
              isAnimationActive={false}
            >
              {/* valor dentro do segmento, apenas quando há espaço */}
              {used.length > 1 && (
                <LabelList
                  dataKey={s.key}
                  content={SegmentLabel({
                    color: s.color,
                    visible,
                    format: fmtLabel,
                  })}
                />
              )}
              {/* total do dia acima da barra */}
              {i === used.length - 1 && (
                <LabelList
                  dataKey="__total"
                  content={TopLabel({ visible, format: fmtLabel })}
                />
              )}
            </Bar>
          ))}
        </BarChart>
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
            /* percentual dentro do anel, só nas fatias com arco suficiente */
            labelLine={false}
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              percent,
              index,
            }: {
              cx: number;
              cy: number;
              midAngle: number;
              innerRadius: number;
              outerRadius: number;
              percent: number;
              index: number;
            }) => {
              if (!percent || percent < 0.08) return null;
              const rad = -midAngle * (Math.PI / 180);
              const r = (innerRadius + outerRadius) / 2;
              const text = `${Math.round(percent * 100)}%`;
              const band = outerRadius - innerRadius;
              const arc = 2 * Math.PI * r * percent;
              if (band < 15 || arc < labelWidth(text) + 6) return null;
              return (
                <text
                  x={cx + r * Math.cos(rad)}
                  y={cy + r * Math.sin(rad)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={LABEL_SIZE}
                  fontWeight={600}
                  fill={inkOn(data[index]?.color ?? "#000000")}
                >
                  {text}
                </text>
              );
            }}
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
