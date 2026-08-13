import Image from "next/image";
import logo from "@/public/sesi-logo.png";

/**
 * O logotipo SESI é branco com fundo transparente — nunca deve ser usado
 * sobre superfície clara. Use <SesiLogo> só dentro de áreas escuras/coloridas,
 * ou <SesiBadge>, que já garante o fundo.
 */
export function SesiLogo({
  height = 26,
  className = "",
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={logo}
      alt="SESI"
      height={height}
      width={Math.round((height * logo.width) / logo.height)}
      priority={priority}
      className={`w-auto shrink-0 ${className}`}
      style={{ height }}
    />
  );
}

/** Logotipo dentro de um bloco com fundo — seguro sobre qualquer superfície. */
export function SesiBadge({
  height = 36,
  background = "linear-gradient(135deg,#00519E,#002A52)",
  logoHeight,
  className = "",
  priority = false,
}: {
  height?: number;
  background?: string;
  logoHeight?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[26%] ${className}`}
      style={{
        width: height * 1.5,
        height,
        background,
      }}
    >
      <SesiLogo height={logoHeight ?? height * 0.42} priority={priority} />
    </span>
  );
}

export function SesiLockup({
  subtitle,
  background,
}: {
  subtitle?: string;
  background?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <SesiBadge height={38} background={background} priority />
      <span className="leading-tight">
        <span className="block text-[14px] font-semibold tracking-tight text-brand">
          SESI Bahia
        </span>
        {subtitle && (
          <span className="block text-[10.5px] font-medium text-muted">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
