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
    <div className="top">
      <Link href="/" className="brand">
        <span className="mark">VM</span>
        <span>
          <h1>VM-tipset <span>2026</span></h1>
        </span>
      </Link>
      <nav className="tabs">
        {TABS.map((t) => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={active ? 'active' : ''}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
