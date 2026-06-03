// lib/results/buildStandings.test.ts
import { describe, it, expect } from 'vitest';
import type { Match, Prediction, Team } from '../domain/types';
import { buildStandings } from './buildStandings';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
];
const matches: Match[] = [
  { id: 'm1', stage: 'group', group: 'A', homeTeamId: 't1', awayTeamId: 't2', status: 'finished', homeScore: 1, awayScore: 0 },
];
const predictions: Prediction[] = [
  { userId: 'a', matchPicks: { m1: '1' }, bonus: {} }, // correct → 1p
  { userId: 'b', matchPicks: { m1: '2' }, bonus: {} }, // wrong → 0p
];

describe('buildStandings', () => {
  it('ranks users and carries breakdown + totals', () => {
    const standings = buildStandings(
      { teams, matches, predictions },
      { a: { submittedAt: 1 }, b: { submittedAt: 2 } },
      {},
    );
    const a = standings.find((s) => s.userId === 'a')!;
    const b = standings.find((s) => s.userId === 'b')!;
    expect(a.rank).toBe(1);
    expect(a.totalPoints).toBe(1);
    expect(a.matchPoints).toBe(1);
    expect(b.rank).toBe(2);
    expect(b.totalPoints).toBe(0);
    expect(a.breakdown.matchPoints).toBe(1);
  });

  it('fills prevRank from the previous run, null when new', () => {
    const standings = buildStandings(
      { teams, matches, predictions },
      { a: { submittedAt: 1 }, b: { submittedAt: 2 } },
      { a: 2, b: 1 }, // previously b was 1st, a was 2nd
    );
    expect(standings.find((s) => s.userId === 'a')!.prevRank).toBe(2);
    expect(standings.find((s) => s.userId === 'b')!.prevRank).toBe(1);
  });

  it('prevRank is null for a user not in the previous run', () => {
    const standings = buildStandings(
      { teams, matches, predictions },
      { a: { submittedAt: 1 }, b: { submittedAt: 2 } },
      { a: 1 },
    );
    expect(standings.find((s) => s.userId === 'b')!.prevRank).toBeNull();
  });
});
