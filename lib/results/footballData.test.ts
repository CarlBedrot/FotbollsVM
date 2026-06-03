// lib/results/footballData.test.ts
import { describe, it, expect } from 'vitest';
import type { Match } from '../domain/types';
import { proposalsFromApi, type ApiMatch } from './footballData';

const ourMatches: Match[] = [
  { id: 'G001', stage: 'group', group: 'A', homeTeamId: 'mexico', awayTeamId: 'south-korea', status: 'scheduled', homeScore: null, awayScore: null },
  { id: 'G002', stage: 'group', group: 'B', homeTeamId: 'usa', awayTeamId: 'paraguay', status: 'scheduled', homeScore: null, awayScore: null },
];
const labels: Record<string, { home: string; away: string; kickoff: string }> = {
  G001: { home: 'Mexico', away: 'South Korea', kickoff: '2026-06-11T19:00:00.000Z' },
  G002: { home: 'USA', away: 'Paraguay', kickoff: '2026-06-13T19:00:00.000Z' },
};

function api(date: string, home: string, away: string, hs: number | null, as: number | null, status = 'FINISHED'): ApiMatch {
  return { utcDate: date, status, homeTeam: { name: home }, awayTeam: { name: away }, score: { fullTime: { home: hs, away: as } } };
}

describe('proposalsFromApi', () => {
  it('matches finished api matches to our matches by date + team names', () => {
    const apiMatches = [api('2026-06-11T19:00:00Z', 'Mexico', 'South Korea', 2, 1)];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ matchId: 'G001', homeScore: 2, awayScore: 1, matchedBy: 'exact' });
  });

  it('uses the alias table for differing names (Korea Republic → South Korea)', () => {
    const apiMatches = [api('2026-06-11T19:00:00Z', 'Mexico', 'Korea Republic', 0, 0)];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals[0]).toMatchObject({ matchId: 'G001', matchedBy: 'alias' });
  });

  it('ignores non-finished api matches', () => {
    const apiMatches = [api('2026-06-11T19:00:00Z', 'Mexico', 'South Korea', null, null, 'SCHEDULED')];
    expect(proposalsFromApi(apiMatches, ourMatches, labels)).toHaveLength(0);
  });

  it('flags an api match it cannot map to any of our matches', () => {
    const apiMatches = [api('2099-01-01T00:00:00Z', 'Narnia', 'Atlantis', 1, 0)];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].matchedBy).toBe('unmatched');
    expect(proposals[0].matchId).toBe('');
  });
});
