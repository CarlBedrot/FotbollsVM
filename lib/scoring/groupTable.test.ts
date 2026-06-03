// lib/scoring/groupTable.test.ts
import { describe, it, expect } from 'vitest';
import { computeGroupTable, isGroupComplete, groupWinners } from './groupTable';
import type { GroupId, Match, Team } from '../domain/types';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
  { id: 't3', name: 'T3', group: 'A' },
  { id: 't4', name: 'T4', group: 'A' },
];

function gm(id: string, home: string, away: string, hs: number, as: number): Match {
  return {
    id, stage: 'group', group: 'A',
    homeTeamId: home, awayTeamId: away,
    status: 'finished', homeScore: hs, awayScore: as,
  };
}

// Round robin: t1 wins all, t2 second, etc.
const matches: Match[] = [
  gm('m1', 't1', 't2', 2, 0),
  gm('m2', 't1', 't3', 2, 0),
  gm('m3', 't1', 't4', 2, 0),
  gm('m4', 't2', 't3', 1, 0),
  gm('m5', 't2', 't4', 1, 0),
  gm('m6', 't3', 't4', 1, 0),
];

describe('computeGroupTable', () => {
  it('orders by points then goal difference', () => {
    const table = computeGroupTable('A', teams, matches);
    expect(table.map((r) => r.teamId)).toEqual(['t1', 't2', 't3', 't4']);
    expect(table[0].points).toBe(9);
  });

  it('uses head-to-head when points, GD and GF are equal', () => {
    // Two teams level on pts/GD/GF; head-to-head decides.
    const hTeams: Team[] = [
      { id: 'a', name: 'A', group: 'B' },
      { id: 'b', name: 'B', group: 'B' },
    ];
    const hMatches: Match[] = [
      { id: 'h1', stage: 'group', group: 'B', homeTeamId: 'a', awayTeamId: 'b', status: 'finished', homeScore: 1, awayScore: 0 },
    ];
    const table = computeGroupTable('B', hTeams, hMatches);
    expect(table[0].teamId).toBe('a'); // a beat b head-to-head
  });
});

describe('isGroupComplete', () => {
  it('is true when all 6 matches are finished', () => {
    expect(isGroupComplete('A', teams, matches)).toBe(true);
  });
  it('is false when matches are missing', () => {
    expect(isGroupComplete('A', teams, matches.slice(0, 3))).toBe(false);
  });
});

describe('groupWinners', () => {
  it('returns the first-placed team only for complete groups', () => {
    const winners = groupWinners(['A'] as GroupId[], teams, matches);
    expect(winners.get('A')).toBe('t1');
  });
  it('omits incomplete groups', () => {
    const winners = groupWinners(['A'] as GroupId[], teams, matches.slice(0, 3));
    expect(winners.has('A')).toBe(false);
  });
});
