'use client';
import { useEffect, useState } from 'react';
import { THEME_KEY, normalizeThemePref, resolveTheme, type ThemePref } from '@/lib/theme';

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Ljust' },
  { value: 'dark', label: 'Mörkt' },
  { value: 'system', label: 'System' },
];

function apply(pref: ThemePref) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', resolveTheme(pref, dark));
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>('dark');

  useEffect(() => {
    setPref(normalizeThemePref(localStorage.getItem(THEME_KEY)));
    // keep "system" live when the OS theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (normalizeThemePref(localStorage.getItem(THEME_KEY)) === 'system') apply('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function choose(p: ThemePref) {
    setPref(p);
    localStorage.setItem(THEME_KEY, p);
    apply(p);
  }

  return (
    <div className="seg" role="group" aria-label="Tema">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`seg-btn ${pref === o.value ? 'on' : ''}`.trim()}
          aria-pressed={pref === o.value}
          onClick={() => choose(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
