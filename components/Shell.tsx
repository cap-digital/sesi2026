"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useDash } from "./DataProvider";
import { DateRangeBar } from "./DateRangeBar";
import { PillLink, SidebarItem, type NavItem } from "./Nav";
import { SesiLogo } from "./Logo";
import { ErrorBlock, LoadingBlock } from "./ui";
import { fmtDate } from "@/lib/format";

interface BrandArt {
  gradient: string;
  pattern: "circuit" | "dots";
  chip: string;
  eyebrow: string;
}

function BackHome({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition ${
        tone === "light"
          ? "text-white/75 hover:text-white"
          : "text-muted hover:text-brand"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3"
      >
        <path d="M14 6l-6 6 6 6" />
      </svg>
      Campanhas
    </Link>
  );
}

/** Cabeçalho de identidade da campanha (banner com gradiente + textura). */
function BrandBlock({ art, compact = false }: { art: BrandArt; compact?: boolean }) {
  const { campaign } = useDash();
  return (
    <div
      className={`relative overflow-hidden ${art.pattern} ${
        compact ? "px-3.5 py-3" : "px-4 py-4"
      }`}
      style={{ background: art.gradient }}
    >
      <div className="flex items-start justify-between gap-2">
        <SesiLogo height={compact ? 20 : 23} priority />
        <span
          className="rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ background: `${art.chip}26`, color: art.chip }}
        >
          {art.eyebrow}
        </span>
      </div>
      <p
        className={`mt-2.5 font-bold uppercase leading-[1.15] tracking-tight text-white ${
          compact ? "text-[13px]" : "text-[15px]"
        }`}
      >
        {campaign.name}
      </p>
      <p className="tnum mt-1 text-[10.5px] text-white/70">
        {fmtDate(campaign.window.start)} – {fmtDate(campaign.window.end)}
      </p>
    </div>
  );
}

function Body({
  children,
  stickyTop,
  stickyFilters = true,
}: {
  children: React.ReactNode;
  stickyTop: string;
  /** no Jequié só a topbar acompanha a rolagem; o filtro rola com a página */
  stickyFilters?: boolean;
}) {
  const { loading, error, refresh } = useDash();
  return (
    <>
      <DateRangeBar sticky={stickyFilters} topClass={stickyTop} />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (
        <div className="animate-fade-up">{children}</div>
      )}
    </>
  );
}

function MenuButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-hairline bg-surface text-ink2 transition hover:text-brand lg:hidden"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="h-4.5 w-4.5"
        style={{ width: 18, height: 18 }}
      >
        {open ? (
          <path d="M6 6l12 12M18 6L6 18" />
        ) : (
          <path d="M4 7h16M4 12h16M4 17h16" />
        )}
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar flutuante (Robótica)                                        */
/* ------------------------------------------------------------------ */

export function SidebarShell({
  nav,
  art,
  themeClass,
  children,
}: {
  nav: NavItem[];
  art: BrandArt;
  themeClass: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navList = (onNavigate?: () => void) => (
    <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-2.5">
      <ul className="space-y-0.5">
        {nav.slice(0, 2).map((i) => (
          <SidebarItem key={i.href} item={i} onNavigate={onNavigate} />
        ))}
      </ul>
      <p className="px-2.5 pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        Plataformas
      </p>
      <ul className="space-y-0.5">
        {nav.slice(2).map((i) => (
          <SidebarItem key={i.href} item={i} onNavigate={onNavigate} />
        ))}
      </ul>
    </nav>
  );

  return (
    <div className={`${themeClass} min-h-screen bg-page`}>
      {/* topbar mobile */}
      <div className="sticky top-0 z-40 flex h-[54px] items-center justify-between gap-3 border-b border-hairline bg-surface/90 px-3 backdrop-blur-md lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-8 shrink-0 items-center justify-center rounded-lg px-2"
            style={{ background: art.gradient }}
          >
            <SesiLogo height={15} priority />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold leading-tight text-ink">
              {art.eyebrow}
            </span>
            <BackHome />
          </span>
        </div>
        <MenuButton open={open} onClick={() => setOpen((v) => !v)} />
      </div>

      {/* sidebar desktop — flutuante, com rolagem interna (à prova de zoom) */}
      <aside className="fixed bottom-3 left-3 top-3 z-40 hidden w-[236px] flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-float lg:flex">
        <BrandBlock art={art} />
        {navList()}
        <div className="border-t border-hairline px-3 py-2.5">
          <BackHome />
        </div>
      </aside>

      {/* drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-brandDeep/40 backdrop-blur-sm"
          />
          <div className="absolute bottom-2 left-2 top-2 flex w-[268px] max-w-[86vw] flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-float">
            <BrandBlock art={art} compact />
            {navList(() => setOpen(false))}
            <div className="border-t border-hairline px-3 py-2.5">
              <BackHome />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-[252px]">
        <main className="mx-auto w-full max-w-[1280px] px-3 pb-14 pt-3 sm:px-4">
          <Body stickyTop="top-[60px] lg:top-3">{children}</Body>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topbar flutuante em pílula (Jequié)                                 */
/* ------------------------------------------------------------------ */

export function TopbarShell({
  nav,
  art,
  themeClass,
  children,
}: {
  nav: NavItem[];
  art: BrandArt;
  themeClass: string;
  children: React.ReactNode;
}) {
  const { campaign } = useDash();

  return (
    <div className={`${themeClass} min-h-screen bg-page`}>
      {/* faixa de identidade */}
      <div
        className={`relative overflow-hidden ${art.pattern}`}
        style={{ background: art.gradient }}
      >
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <SesiLogo height={26} priority />
            <span
              aria-hidden
              className="h-8 w-px shrink-0"
              style={{ background: "rgba(255,255,255,0.22)" }}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold uppercase leading-tight tracking-tight text-white sm:text-[16px]">
                {campaign.name}
              </p>
              <p className="tnum mt-0.5 text-[10.5px] text-white/70">
                {fmtDate(campaign.window.start)} –{" "}
                {fmtDate(campaign.window.end)} ·{" "}
                {campaign.platforms.map((p) => p.label).join(" + ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="hidden rounded-pill px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] sm:block"
              style={{ background: `${art.chip}26`, color: art.chip }}
            >
              {art.eyebrow}
            </span>
            <BackHome tone="light" />
          </div>
        </div>
      </div>

      {/* navegação em pílula: sobrepõe a faixa e gruda no topo ao rolar.
          O sticky precisa ser filho direto do contêiner alto da página —
          dentro de um wrapper curto ele rolaria embora. */}
      <div className="sticky top-2 z-40 -mt-3 px-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1280px] justify-center">
          {/* min-w-0 é necessário: sem ele o min-width:auto do flex impede o
              max-w-full de limitar, e a pílula empurra a largura da página */}
          <div className="scroll-thin flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-pill border border-hairline bg-surface/95 p-1.5 shadow-float backdrop-blur-md">
            {nav.map((i) => (
              <PillLink key={i.href} item={i} />
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1280px] px-3 pb-14 pt-4 sm:px-6">
        <Body stickyTop="top-[64px]" stickyFilters={false}>
          {children}
        </Body>
      </main>
    </div>
  );
}
