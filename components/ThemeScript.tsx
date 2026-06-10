import { THEME_KEY } from '@/lib/theme';

// Runs before paint so the chosen theme is applied with no flash of the wrong one.
const script = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'dark';var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='system'?(d?'dark':'light'):(p==='light'?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
