"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Primära flikarna. Sekundärt (profil, inställningar, admin, logga ut)
// bor under avataren i toppraden.
const TABS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Loppet",
    icon: <path d="M6 21V4m0 0l9 2.5L11 9l4 2.5L6 14" />,
  },
  {
    href: "/tabell",
    label: "Tabell",
    icon: <path d="M4 6h16M4 12h16M4 18h11" />,
  },
  {
    href: "/matcher",
    label: "Matcher",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5l4-3z" />
      </>
    ),
  },
  {
    href: "/statistik",
    label: "Statistik",
    icon: <path d="M5 20V11M12 20V4M19 20v-6" />,
  },
  {
    href: "/mitt-tips",
    label: "Mitt tips",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M12 6v12" />
      </>
    ),
  },
  {
    href: "/utveckling",
    label: "Utveckling",
    icon: (
      <>
        <path d="M4 19V5" />
        <path d="M4 16l5-5 4 3 7-8" />
      </>
    ),
  },
];

function isActive(path: string, href: string): boolean {
  return href === "/" ? path === "/" : path.startsWith(href);
}

/** Flytande glas-dock i botten — appens primära navigering. Route-medveten
 *  via usePathname; respekterar safe-area-inset så den inte krockar med
 *  hemindikatorn på iOS. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Huvudnavigering">
      {TABS.map((t) => {
        const active = isActive(path, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`bn-tab ${active ? "active" : ""}`.trim()}
            aria-current={active ? "page" : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
