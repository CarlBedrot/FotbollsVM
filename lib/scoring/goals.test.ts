// lib/scoring/goals.test.ts
import { describe, it, expect } from 'vitest';
import { mostGoalsTeams, fewestGoalsTeams } from './goals';
import type { Match, Team } from '../domain/types';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
  { id: 't3', name: 'T3', group: 'A' },
];

function gm(id: string, home: string, away: string, hs: number, as: number): Match {
  return { id, stage: 'group', group: 'A', homeTeamId: home, awayTeamId: away, status: 'finished', homeScore: hs, awayScore: as };
}

const matches: Match[] = [
  gm('m1', 't1', 't2', 5, 0), // t1 scores 5
  gm('m2', 't2', 't3', 1, 0), // t2 scores 1, t3 scores 0
];

describe('mostGoalsTeams / fewestGoalsTeams', () => {
  it('finds the top scorer', () => {
    expect(mostGoalsTeams(teams, matches)).toEqual(['t1']);
  });
  it('finds the lowest scorer', () => {
    expect(fewestGoalsTeams(teams, matches)).toEqual(['t3']);
  });
  it('returns all teams on a tie', () => {
    const tied: Match[] = [gm('m1', 't1', 't2', 1, 1)]; // t3 has 0 (not in match)
    // t1=1, t2=1, t3=0 -> most: t1 & t2
    expect(mostGoalsTeams(teams, tied).sort()).toEqual(['t1', 't2']);
  });
  it('ignores non-group and unfinished matches', () => {
    const mixed: Match[] = [
      gm('m1', 't1', 't2', 9, 0),
      { id: 'ko', stage: 'final', group: null, homeTeamId: 't3', awayTeamId: 't1', status: 'finished', homeScore: 9, awayScore: 9 },
      { id: 'sched', stage: 'group', group: 'A', homeTeamId: 't3', awayTeamId: 't2', status: 'scheduled', homeScore: null, awayScore: null },
    ];
    expect(mostGoalsTeams(teams, mixed)).toEqual(['t1']); // knockout goals ignored
  });
});
