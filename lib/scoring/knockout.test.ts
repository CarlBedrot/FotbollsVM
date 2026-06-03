// lib/scoring/knockout.test.ts
import { describe, it, expect } from 'vitest';
import { finalists, champion, bronzeWinner } from './knockout';
import type { Match } from '../domain/types';

function ko(id: string, stage: Match['stage'], home: string | null, away: string | null, status: Match['status'], hs: number | null, as: number | null): Match {
  return { id, stage, group: null, homeTeamId: home, awayTeamId: away, status, homeScore: hs, awayScore: as };
}

describe('knockout derivations', () => {
  it('returns the two finalists once both teams are assigned', () => {
    const matches = [ko('f', 'final', 'X', 'Y', 'scheduled', null, null)];
    expect(finalists(matches).sort()).toEqual(['X', 'Y']);
  });
  it('returns no finalists before the final is set', () => {
    expect(finalists([ko('f', 'final', null, null, 'scheduled', null, null)])).toEqual([]);
    expect(finalists([])).toEqual([]);
  });
  it('returns champion only when the final is finished', () => {
    expect(champion([ko('f', 'final', 'X', 'Y', 'finished', 2, 1)])).toBe('X');
    expect(champion([ko('f', 'final', 'X', 'Y', 'scheduled', null, null)])).toBeNull();
    expect(champion([])).toBeNull();
  });
  it('returns bronze winner only when the bronze match is finished', () => {
    expect(bronzeWinner([ko('b', 'bronze', 'P', 'Q', 'finished', 0, 3)])).toBe('Q');
    expect(bronzeWinner([ko('b', 'bronze', 'P', 'Q', 'scheduled', null, null)])).toBeNull();
  });
});
