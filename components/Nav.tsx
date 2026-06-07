'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const TABS = [
  { href: '/', label: 'Loppet' },
  { href: '/tabell', label: 'Tabell' },
  { href: '/matcher', label: 'Matcher' },
  { href: '/statistik', label: 'Statistik' },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="top">
      <Link href="/" className="brand">
        <span className="mark">VM</span>
        <span>
          <h1>VM-tipset <span>2026</span></h1>
        </span>
      </Link>
      <div className="menu-wrap" ref={ref}>
        <button
          className="hamburger"
          aria-label="Meny"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
        {open && (
          <nav className="menu">
            {TABS.map((t) => {
              const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
              return (
                <Link key={t.href} href={t.href} className={active ? 'active' : ''} onClick={() => setOpen(false)}>
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
