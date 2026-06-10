import { describe, it, expect } from 'vitest';
import { dayKeyInTz, buildDailyOverview } from './dailyPredictions';

const users = [
  { id: 'u1', displayName: 'Anna', color: '#111111', avatarUrl: null },
  { id: 'u2', displayName: 'Bo', color: '#222222', avatarUrl: 'http://x/b.png' },
  { id: 'u3', displayName: 'Cilla', color: '#333333', avatarUrl: null },
];

const matches = [
  { id: 'm_early', homeLabel: 'Sweden', awayLabel: 'Brazil', kickoff: '2026-06-12T16:00:00Z' },
  { id: 'm_late', homeLabel: 'Spain', awayLabel: 'Norway', kickoff: '2026-06-12T19:00:00Z' },
  { id: 'm_nextday', homeLabel: 'Italy', awayLabel: 'France', kickoff: '2026-06-12T23:30:00Z' },
];

const predictions = [
  { userId: 'u1', matchPicks: { m_early: 'X', m_late: '1' } as Record<string, '1' | 'X' | '2'> },
  { userId: 'u2', matchPicks: { m_early: '2', m_late: '1' } as Record<string, '1' | 'X' | '2'> },
  { userId: 'u3', matchPicks: { m_late: '2' } as Record<string, '1' | 'X' | '2'> }, // no m_early pick
];

describe('dayKeyInTz', () => {
  it('maps a UTC kickoff to the Stockholm calendar day', () => {
    expect(dayKeyInTz('2026-06-11T19:00:00Z')).toBe('2026-06-11'); // 21:00 CEST
  });

  it('rolls a late-UTC kickoff into the next Stockholm day', () => {
    expect(dayKeyInTz('2026-06-12T23:30:00Z')).toBe('2026-06-13'); // 01:30 CEST next day
  });
});

describe('buildDailyOverview', () => {
  const base = { matches, predictions, users, todayKey: '2026-06-12', revealed: true };

  it("keeps only today's matches, sorted by kickoff", () => {
    const o = buildDailyOverview(base);
    expect(o.matches.map((m) => m.matchId)).toEqual(['m_early', 'm_late']); // m_nextday excluded
  });

  it('tallies 1/X/2 counts per match', () => {
    const o = buildDailyOverview(base);
    const late = o.matches.find((m) => m.matchId === 'm_late')!;
    expect(late.counts).toEqual({ '1': 2, X: 0, '2': 1 });
    expect(late.total).toBe(3);
  });

  it('lists the voters under each outcome', () => {
    const o = buildDailyOverview(base);
    const late = o.matches.find((m) => m.matchId === 'm_late')!;
    expect(late.voters!['1'].map((v) => v.name)).toEqual(['Anna', 'Bo']);
    expect(late.voters!['2'].map((v) => v.name)).toEqual(['Cilla']);
    expect(late.voters!.X).toEqual([]);
  });

  it('does not count users who have no pick for a match', () => {
    const o = buildDailyOverview(base);
    const early = o.matches.find((m) => m.matchId === 'm_early')!;
    expect(early.total).toBe(2); // u3 has no m_early pick
    expect(early.counts).toEqual({ '1': 0, X: 1, '2': 1 });
  });

  it('hides counts and voters before the reveal but still lists the matches', () => {
    const o = buildDailyOverview({ ...base, revealed: false });
    expect(o.revealed).toBe(false);
    const late = o.matches.find((m) => m.matchId === 'm_late')!;
    expect(late.counts).toBeNull();
    expect(late.voters).toBeNull();
    expect(late.total).toBe(3); // count of who tipped is not secret
  });

  it('ignores a stored pick that is not 1/X/2 instead of crashing', () => {
    const o = buildDailyOverview({
      ...base,
      users: [...users, { id: 'u4', displayName: 'Dan', color: '#444444', avatarUrl: null }],
      predictions: [...predictions, { userId: 'u4', matchPicks: { m_late: 'Z' } as unknown as Record<string, '1' | 'X' | '2'> }],
    });
    const late = o.matches.find((m) => m.matchId === 'm_late')!;
    expect(late.total).toBe(3); // the bogus 'Z' pick is skipped, not counted
  });

  it('ignores predictions from unknown users', () => {
    const o = buildDailyOverview({ ...base, predictions: [...predictions, { userId: 'ghost', matchPicks: { m_late: '1' } as Record<string, '1' | 'X' | '2'> }] });
    const late = o.matches.find((m) => m.matchId === 'm_late')!;
    expect(late.total).toBe(3); // ghost not counted
  });
});
