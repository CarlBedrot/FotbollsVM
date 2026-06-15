import { describe, it, expect } from 'vitest';
import { buildPointsTimeline, type MatchMeta } from './pointsTimeline';
import type { Match, Prediction, Team } from '../domain/types';

const team = (id: string, group: Team['group']): Team => ({ id, name: id, group });

const finished = (id: string, home: string, away: string, hs: number, as: number): Match => ({
  id, stage: 'group', group: 'A', homeTeamId: home, awayTeamId: away,
  status: 'finished', homeScore: hs, awayScore: as,
});

const meta = (...ids: string[]): MatchMeta => {
  const m: MatchMeta = {};
  ids.forEach((id, i) => { m[id] = { kickoff: `2026-06-1${i + 1}T19:00:00.000Z`, label: id }; });
  return m;
};

describe('buildPointsTimeline', () => {
  it('accumulates match points step by step in kickoff order', () => {
    const teams = [team('a1', 'A'), team('a2', 'A'), team('a3', 'A')];
    const matches = [finished('M2', 'a1', 'a3', 2, 0), finished('M1', 'a1', 'a2', 1, 0)];
    const predictions: Prediction[] = [{ userId: 'u1', matchPicks: { M1: '1', M2: '1' }, bonus: {} }];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1', 'M2'));

    expect(tl.steps.map((s) => s.matchId)).toEqual(['M1', 'M2']); // sorted by kickoff, not input order
    expect(tl.series).toEqual([{ userId: 'u1', points: [0, 1, 2] }]);
  });

  it('lights up a bonus as a step jump at the match that resolves it', () => {
    // 2-team group A → 1 match completes the group → group-winner bonus (4p) resolves.
    const teams = [team('a1', 'A'), team('a2', 'A')];
    const matches = [finished('M1', 'a1', 'a2', 3, 0)];
    const predictions: Prediction[] = [
      { userId: 'u1', matchPicks: { M1: '1' }, bonus: { group_winner_A: 'a1' } },
    ];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1'));

    // 1 match point + 4 group-winner points jump in together at step 1.
    expect(tl.series).toEqual([{ userId: 'u1', points: [0, 5] }]);
  });

  it('ignores unfinished matches and matches missing from meta', () => {
    const teams = [team('a1', 'A'), team('a2', 'A'), team('a3', 'A')];
    const matches: Match[] = [
      finished('M1', 'a1', 'a2', 1, 0),
      { id: 'M2', stage: 'group', group: 'A', homeTeamId: 'a1', awayTeamId: 'a3',
        status: 'scheduled', homeScore: null, awayScore: null },
    ];
    const predictions: Prediction[] = [{ userId: 'u1', matchPicks: { M1: '1', M2: '1' }, bonus: {} }];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1', 'M2'));

    expect(tl.steps).toHaveLength(1);
    expect(tl.series).toEqual([{ userId: 'u1', points: [0, 1] }]);
  });

  it('returns no steps and a lone zero point per user when nothing is finished', () => {
    const teams = [team('a1', 'A'), team('a2', 'A')];
    const matches: Match[] = [
      { id: 'M1', stage: 'group', group: 'A', homeTeamId: 'a1', awayTeamId: 'a2',
        status: 'scheduled', homeScore: null, awayScore: null },
    ];
    const predictions: Prediction[] = [{ userId: 'u1', matchPicks: { M1: '1' }, bonus: {} }];

    const tl = buildPointsTimeline({ teams, matches, predictions }, meta('M1'));

    expect(tl.steps).toEqual([]);
    expect(tl.series).toEqual([{ userId: 'u1', points: [0] }]);
  });
});
