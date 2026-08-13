/** Utilitários de data em string YYYY-MM-DD — sem fuso, sem surpresa. */

export const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, delta: number) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + delta);
  return toISO(d);
}

export function clamp(iso: string, min: string, max: string) {
  return iso < min ? min : iso > max ? max : iso;
}

export function daysBetween(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard++ < 800) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export const monthOf = (iso: string) => Number(iso.slice(5, 7));

export interface Range {
  start: string;
  end: string;
}

export interface Preset {
  id: string;
  label: string;
  build: (ctx: { today: string; window: Range }) => Range;
}

/**
 * Presets pedidos: ontem, últimos 7 e últimos 15 dias — sempre recortados
 * pela janela real da campanha, para nunca pedir dia fora do período.
 */
export const PRESETS: Preset[] = [
  {
    id: "yesterday",
    label: "Ontem",
    build: ({ today, window }) => {
      const y = clamp(addDays(today, -1), window.start, window.end);
      return { start: y, end: y };
    },
  },
  {
    id: "7d",
    label: "Últimos 7 dias",
    build: ({ today, window }) => ({
      start: clamp(addDays(today, -6), window.start, window.end),
      end: clamp(today, window.start, window.end),
    }),
  },
  {
    id: "15d",
    label: "Últimos 15 dias",
    build: ({ today, window }) => ({
      start: clamp(addDays(today, -14), window.start, window.end),
      end: clamp(today, window.start, window.end),
    }),
  },
  {
    id: "all",
    label: "Todo o período",
    build: ({ today, window }) => ({
      start: window.start,
      end: clamp(today, window.start, window.end),
    }),
  },
];

export function matchPreset(
  range: Range,
  ctx: { today: string; window: Range }
): string | null {
  for (const p of PRESETS) {
    const r = p.build(ctx);
    if (r.start === range.start && r.end === range.end) return p.id;
  }
  return null;
}
