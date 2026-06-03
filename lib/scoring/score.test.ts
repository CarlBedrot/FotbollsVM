// lib/scoring/score.test.ts
import { describe, it, expect } from 'vitest';
import { computeScores, rankScores } from './score';
import type { Match, Prediction, Team } from '../domain/types';

function gm(id: string, home: string, away: string, hs: number, as: number, group: 'A' = 'A'): Match {
  return { id, stage: 'group', group, homeTeamId: home, awayTeamId: away, status: 'finished', homeScore: hs, awayScore: as };
}

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
  { id: 't3', name: 'T3', group: 'A' },
  { id: 't4', name: 'T4', group: 'A' },
];

describe('computeScores', () => {
  it('awards 1 point per correct 1/X/2', () => {
    const matches = [gm('m1', 't1', 't2', 2, 0), gm('m2', 't3', 't4', 1, 1)];
    const pred: Prediction = { userId: 'u', matchPicks: { m1: '1', m2: 'X' }, bonus: {} };
    const [s] = computeScores({ teams, matches, predictions: [pred] });
    expect(s.matchPoints).toBe(2);
    expect(s.totalPoints).toBe(2);
  });

  it('does not award group-stage bonuses before the group is complete', () => {
    const matches = [gm('m1', 't1', 't2', 2, 0)]; // group A incomplete
    const pred: Prediction = { userId: 'u', matchPicks: {}, bonus: { group_winner_A: 't1', most_goals: 't1' } };
    const [s] = computeScores({ teams, matches, predictions: [pred] });
    expect(s.bonusPoints).toBe(0);
  });

  it('counts a duplicated finalist pick only once', () => {
    const matches: Match[] = [
      { id: 'f', stage: 'final', group: null, homeTeamId: 't1', awayTeamId: 't2', status: 'finished', homeScore: 1, awayScore: 0 },
    ];
    const pred: Prediction = { userId: 'u', matchPicks: {}, bonus: { finalist_1: 't1', finalist_2: 't1' } };
    const [s] = computeScores({ teams, matches, predictions: [pred] });
    expect(s.breakdown.finalistPoints).toBe(8); // not 16
  });
});

describe('rankScores', () => {
  it('ranks by total, then exact-result count, then submission time', () => {
    const matches = [gm('m1', 't1', 't2', 2, 0), gm('m2', 't3', 't4', 1, 1)];
    const preds: Prediction[] = [
      { userId: 'late', matchPicks: { m1: '1', m2: 'X' }, bonus: {} },   // 2 pts
      { userId: 'early', matchPicks: { m1: '1', m2: 'X' }, bonus: {} },  // 2 pts
    ];
    const scores = computeScores({ teams, matches, predictions: preds });
    const ranked = rankScores(scores, { early: { submittedAt: 1 }, late: { submittedAt: 2 } });
    expect(ranked.find((r) => r.userId === 'early')!.rank).toBe(1);
    expect(ranked.find((r) => r.userId === 'late')!.rank).toBe(2);
  });
});
