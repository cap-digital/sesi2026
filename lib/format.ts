const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const brlCompactish = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export const fmtInt = (n: number) => int.format(Math.round(n || 0));

export const fmtBRL = (n: number) => brlCompactish.format(n || 0);

/**
 * Custos unitários: valores acima de R$ 1 (CPM, CPC) ficam com 2 casas;
 * abaixo disso (CPV, CPE) ganham a terceira casa para não zerar.
 */
export const fmtCost = (n: number) => {
  if (!isFinite(n) || n === 0) return "—";
  return Math.abs(n) >= 1 ? brlCompactish.format(n) : cents.format(n);
};

export const fmtPct = (n: number, digits = 2) =>
  !isFinite(n)
    ? "—"
    : `${new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format((n || 0) * 100)}%`;

export function fmtCompact(n: number) {
  const v = Math.abs(n || 0);
  if (v >= 1_000_000) return `${dec1.format(n / 1_000_000)}M`;
  if (v >= 1_000) return `${dec1.format(n / 1_000)}k`;
  return int.format(n || 0);
}

/**
 * Dinheiro em versão curta, para rótulo desenhado dentro ou acima da barra:
 * quanto menor a etiqueta, mais rótulos cabem sem colidir.
 */
export function fmtBRLLabel(n: number) {
  const v = Math.abs(n || 0);
  if (v >= 1000) return `R$ ${dec1.format(n / 1000)}k`;
  if (v >= 10) return `R$ ${int.format(n)}`;
  return brlCompactish.format(n || 0);
}

export function fmtBRLCompact(n: number) {
  const v = Math.abs(n || 0);
  if (v >= 1_000_000) return `R$ ${dec1.format(n / 1_000_000)}M`;
  if (v >= 1_000) return `R$ ${dec1.format(n / 1_000)}k`;
  return brl.format(n || 0);
}

/** "2026-08-13" -> "13/08" */
export const fmtDayShort = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/** "2026-08-13" -> "13 de agosto de 2026" */
export const fmtDateLong = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
