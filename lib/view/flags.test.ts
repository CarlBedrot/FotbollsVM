import { describe, it, expect } from 'vitest';
import { flagFor, flagCodeFor } from './flags';

describe('flagFor', () => {
  it('maps team names to emoji', () => {
    expect(flagFor('Mexico')).toBe('🇲🇽');
    expect(flagFor('Bosnia & Herzegovina')).toBe('🇧🇦');
  });
  it('is empty for knockout placeholders', () => {
    expect(flagFor('1A')).toBe('');
  });
});

describe('flagCodeFor', () => {
  it('derives the flagcdn code from the emoji', () => {
    expect(flagCodeFor('Mexico')).toBe('mx');
    expect(flagCodeFor('South Africa')).toBe('za');
    expect(flagCodeFor('Bosnia & Herzegovina')).toBe('ba');
    expect(flagCodeFor('Sweden')).toBe('se');
  });
  it('uses subdivision codes for the UK nations', () => {
    expect(flagCodeFor('England')).toBe('gb-eng');
    expect(flagCodeFor('Scotland')).toBe('gb-sct');
  });
  it('is empty for placeholders and unknown teams', () => {
    expect(flagCodeFor('1A')).toBe('');
    expect(flagCodeFor('Winner Group A')).toBe('');
  });
});
