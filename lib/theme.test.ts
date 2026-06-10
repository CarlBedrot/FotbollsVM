import { describe, it, expect } from 'vitest';
import { resolveTheme, normalizeThemePref } from './theme';

describe('resolveTheme', () => {
  it('returns the explicit choice for light and dark', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('normalizeThemePref', () => {
  it('keeps valid stored preferences', () => {
    expect(normalizeThemePref('light')).toBe('light');
    expect(normalizeThemePref('dark')).toBe('dark');
    expect(normalizeThemePref('system')).toBe('system');
  });

  it('falls back to dark for missing or unknown values', () => {
    expect(normalizeThemePref(null)).toBe('dark');
    expect(normalizeThemePref('chartreuse')).toBe('dark');
  });
});
