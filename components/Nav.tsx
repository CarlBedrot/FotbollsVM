'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Loppet' },
  { href: '/tabell', label: 'Tabell' },
  { href: '/matcher', label: 'Matcher' },
  { href: '/statistik', label: 'Statistik' },
  { href: '/tips', label: 'Mitt tips' },
];

export function Nav() {
  const path = usePathname();
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
      <Link href="/" className="flex items-center gap-3 no-underline text-ink">
        <span className="w-11 h-11 rounded-full bg-white border-[3px] border-ink" style={{ boxShadow: '3px 3px 0 #1c1c22' }} />
        <span className="anton text-3xl leading-none">VM-TIPSET <span className="text-vmred">2026</span></span>
      </Link>
      <nav className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`retro-tab no-underline text-ink ${active ? 'retro-tab-active !text-white' : ''}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
