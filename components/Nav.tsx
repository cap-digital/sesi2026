"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLeaf {
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  color?: string;
  children?: NavLeaf[];
}

export type IconName =
  | "overview"
  | "target"
  | "meta"
  | "display"
  | "youtube"
  | "tiktok"
  | "google"
  | "images";

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const shapes: Record<IconName, React.ReactNode> = {
    overview: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    meta: (
      <>
        <path d="M3 15.5c0-4.5 2-8 4.6-8 2.1 0 3.3 1.9 4.4 4 1.1-2.1 2.3-4 4.4-4C19 7.5 21 11 21 15.5c0 1.7-.9 2.8-2.3 2.8-2.6 0-4-4.3-6.7-8.8" />
        <path d="M12 10.5C9.3 15 7.9 18.3 5.3 18.3 3.9 18.3 3 17.2 3 15.5" />
      </>
    ),
    display: (
      <>
        <rect x="3" y="4.5" width="18" height="12" rx="2" />
        <path d="M9 20h6M12 16.5V20" />
      </>
    ),
    youtube: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
        <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
      </>
    ),
    tiktok: (
      <>
        <path d="M14 4v9.2a3.6 3.6 0 1 1-3.1-3.57" />
        <path d="M14 4c.4 2.2 1.9 3.6 4.2 3.8" />
      </>
    ),
    google: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17M3.5 12h17" />
      </>
    ),
    images: (
      <>
        <rect x="3.5" y="5.5" width="13" height="13" rx="2" />
        <path d="M20.5 8.5v9a3 3 0 0 1-3 3H8" />
        <circle cx="8.6" cy="10.2" r="1.3" />
        <path d="M4.2 16.4l3.6-3.2 3 2.6 2.4-2 3.3 2.9" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...p}>
      {shapes[name]}
    </svg>
  );
}

export function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Item de navegação da sidebar, com subitens quando a seção está ativa. */
export function SidebarItem({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const exact = !item.children;
  const active = isActive(pathname, item.href, exact);
  const sectionActive = isActive(pathname, item.href);

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
          active
            ? "bg-brand text-white shadow-sm"
            : "text-ink2 hover:bg-surface2 hover:text-ink"
        }`}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={
            active
              ? { background: "rgba(255,255,255,0.18)" }
              : item.color
              ? { background: `${item.color}18`, color: item.color }
              : undefined
          }
        >
          <Icon name={item.icon} className="h-[15px] w-[15px]" />
        </span>
        <span className="truncate">{item.label}</span>
      </Link>

      {item.children && sectionActive && (
        <ul className="mb-1 ml-[18px] mt-1 space-y-0.5 border-l border-hairline pl-2.5">
          {item.children.map((c) => {
            const leafActive = pathname === c.href;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  aria-current={leafActive ? "page" : undefined}
                  className={`block truncate rounded-lg px-2 py-1.5 text-[12px] transition ${
                    leafActive
                      ? "bg-surface2 font-semibold text-brand"
                      : "text-muted hover:bg-surface2 hover:text-ink2"
                  }`}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** Pílula da topbar (Jequié). */
export function PillLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href, item.href.split("/").length <= 2);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-pill px-3 py-2 text-[12.5px] font-medium transition ${
        active
          ? "bg-brand text-white shadow-sm"
          : "text-ink2 hover:bg-surface2 hover:text-ink"
      }`}
    >
      <Icon name={item.icon} className="h-[15px] w-[15px]" />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}
