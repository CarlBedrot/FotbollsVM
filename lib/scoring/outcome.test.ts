// lib/scoring/outcome.test.ts
import { describe, it, expect } from 'vitest';
import { matchOutcome } from './outcome';
import type { Match } from '../domain/types';

function m(partial: Partial<Match>): Match {
  return {
    id: 'm', stage: 'group', group: 'A',
    homeTeamId: 'h', awayTeamId: 'a',
    status: 'finished', homeScore: 0, awayScore: 0,
    ...partial,
  };
}

describe('matchOutcome', () => {
  it('returns 1 for a home win', () => {
    expect(matchOutcome(m({ homeScore: 2, awayScore: 1 }))).toBe('1');
  });
  it('returns 2 for an away win', () => {
    expect(matchOutcome(m({ homeScore: 0, awayScore: 3 }))).toBe('2');
  });
  it('returns X for a draw', () => {
    expect(matchOutcome(m({ homeScore: 1, awayScore: 1 }))).toBe('X');
  });
  it('returns null when not finished', () => {
    expect(matchOutcome(m({ status: 'scheduled', homeScore: null, awayScore: null }))).toBeNull();
  });
  it('returns null when a score is missing', () => {
    expect(matchOutcome(m({ status: 'finished', homeScore: null, awayScore: 1 }))).toBeNull();
  });
});
