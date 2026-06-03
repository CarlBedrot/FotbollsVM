// lib/results/recompute.test.ts
import { describe, it, expect } from 'vitest';
import type { Match, Team } from '../domain/types';
import { recomputeStandings } from './recompute';
import { InMemoryMatchRepository } from '../db/inMemoryMatchRepository';
import { InMemoryStandingsRepository } from '../db/inMemoryStandingsRepository';
import { InMemoryPredictionRepository } from '../db/inMemoryPredictionRepository';

const teams: Team[] = [
  { id: 't1', name: 'T1', group: 'A' },
  { id: 't2', name: 'T2', group: 'A' },
];
const matches: Match[] = [
  { id: 'm1', stage: 'group', group: 'A', homeTeamId: 't1', awayTeamId: 't2', status: 'finished', homeScore: 1, awayScore: 0 },
];

describe('recomputeStandings', () => {
  it('computes, persists, and reuses the prior standings as prevRank', async () => {
    const matchRepo = new InMemoryMatchRepository(matches);
    const standingsRepo = new InMemoryStandingsRepository();
    const predRepo = new InMemoryPredictionRepository();
    await predRepo.save({ userId: 'a', matchPicks: { m1: '1' }, bonus: {} }, '2026-06-01T00:00:00Z'); // 1p
    await predRepo.save({ userId: 'b', matchPicks: { m1: '2' }, bonus: {} }, '2026-06-02T00:00:00Z'); // 0p

    const first = await recomputeStandings({ teams, matchRepo, standingsRepo, predRepo });
    expect(first.find((s) => s.userId === 'a')!.rank).toBe(1);
    expect(first.find((s) => s.userId === 'a')!.prevRank).toBeNull();

    // run again — prevRank should now be filled from the persisted run
    const second = await recomputeStandings({ teams, matchRepo, standingsRepo, predRepo });
    expect(second.find((s) => s.userId === 'a')!.prevRank).toBe(1);
    expect((await standingsRepo.getAll()).length).toBe(2);
  });
});
