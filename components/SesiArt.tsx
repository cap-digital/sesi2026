/** Motivos da identidade institucional SESI: ondas sobrepostas e círculo em quadrantes. */

export const SESI_QUADRANT = {
  yellow: "#f5c243",
  teal: "#2e8b8b",
  green: "#3aa34a",
  blue: "#2b4a9b",
};

/** Ondas suaves sobrepostas — assinatura do site institucional. */
export function Waves({
  className = "",
  tone = "light",
}: {
  className?: string;
  /** light: ondas claras sobre fundo escuro · dark: ondas cinza sobre fundo claro */
  tone?: "light" | "dark";
}) {
  const a = tone === "light" ? "rgba(255,255,255,0.10)" : "rgba(15,32,51,0.05)";
  const b = tone === "light" ? "rgba(255,255,255,0.07)" : "rgba(15,32,51,0.035)";
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 420"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-full w-full ${className}`}
    >
      <path
        d="M0 268C220 190 470 150 720 196c250 46 460 132 720 96v128H0z"
        fill={a}
      />
      <path
        d="M0 352C260 250 520 300 780 330c260 30 470-6 660-84v174H0z"
        fill={b}
      />
    </svg>
  );
}

/** Círculo dividido em quatro quadrantes coloridos. */
export function QuadrantCircle({
  size = 220,
  className = "",
  opacity = 1,
}: {
  size?: number;
  className?: string;
  opacity?: number;
}) {
  const r = 50;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ opacity }}
    >
      <path d={`M50 50 L50 0 A${r} ${r} 0 0 1 100 50 Z`} fill={SESI_QUADRANT.yellow} />
      <path d={`M50 50 L100 50 A${r} ${r} 0 0 1 50 100 Z`} fill={SESI_QUADRANT.teal} />
      <path d={`M50 50 L50 100 A${r} ${r} 0 0 1 0 50 Z`} fill={SESI_QUADRANT.green} />
      <path d={`M50 50 L0 50 A${r} ${r} 0 0 1 50 0 Z`} fill={SESI_QUADRANT.blue} />
    </svg>
  );
}

/** Faixa de quatro cores institucionais. */
export function QuadrantBar({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex h-1 w-full overflow-hidden ${className}`}>
      {Object.values(SESI_QUADRANT).map((c) => (
        <span key={c} className="h-full flex-1" style={{ background: c }} />
      ))}
    </span>
  );
}
