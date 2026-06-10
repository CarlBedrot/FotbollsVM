export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'vmt_theme';
export const DEFAULT_PREF: ThemePref = 'dark';

/** Map a preference to the concrete theme to apply. */
export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

/** Coerce an arbitrary stored value to a valid preference (default: dark). */
export function normalizeThemePref(value: string | null | undefined): ThemePref {
  return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_PREF;
}
