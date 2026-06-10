import { describe, it, expect } from 'vitest';
import { impliedProbabilities, favouriteOutcome, oddsFor, type OddsBook } from './load';

const MX_ZA = { '1': 1.55, X: 4.2, '2': 6.5 } as const;

describe('impliedProbabilities', () => {
  it('normalises the overround away so the probabilities sum to 1', () => {
    const p = impliedProbabilities(MX_ZA);
    expect(p['1'] + p.X + p['2']).toBeCloseTo(1, 10);
  });
  it('gives the favourite the highest probability', () => {
    const p = impliedProbabilities(MX_ZA);
    expect(p['1']).toBeGreaterThan(p.X);
    expect(p['1']).toBeGreaterThan(p['2']);
  });
  it('is uniform for equal odds', () => {
    const p = impliedProbabilities({ '1': 3, X: 3, '2': 3 });
    expect(p['1']).toBeCloseTo(1 / 3);
    expect(p.X).toBeCloseTo(1 / 3);
  });
});

describe('favouriteOutcome', () => {
  it('is the outcome with the lowest odds', () => {
    expect(favouriteOutcome(MX_ZA)).toBe('1');
    expect(favouriteOutcome({ '1': 5.5, X: 3.9, '2': 1.7 })).toBe('2');
  });
});

describe('oddsFor', () => {
  const book: OddsBook = {
    source: 'test',
    matchOdds: {
      G001: { '1': 1.55, X: 4.2, '2': 6.5 },
      BAD1: { '1': 0, X: 4.2, '2': 6.5 },
      BAD2: { '1': 1, X: 4.2, '2': 6.5 },
    },
  };
  it('returns the odds for a known match', () => {
    expect(oddsFor(book, 'G001')).toEqual({ '1': 1.55, X: 4.2, '2': 6.5 });
  });
  it('is null for matches without odds', () => {
    expect(oddsFor(book, 'G999')).toBeNull();
  });
  it('rejects malformed odds (must all be > 1)', () => {
    expect(oddsFor(book, 'BAD1')).toBeNull();
    expect(oddsFor(book, 'BAD2')).toBeNull();
  });
});
