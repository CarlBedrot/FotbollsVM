import { describe, it, expect } from 'vitest';
import { InMemoryStandingsRepository } from './inMemoryStandingsRepository';
import type { Standing } from '../results/types';

const s: Standing = {
  userId: 'u1', rank: 1, prevRank: null, totalPoints: 5, matchPoints: 5, bonusPoints: 0,
  breakdown: { matchPoints: 5, groupWinnerPoints: 0, mostGoalsPoints: 0, fewestGoalsPoints: 0, finalistPoints: 0, bronzePoints: 0, championPoints: 0 },
};

describe('InMemoryStandingsRepository', () => {
  it('replaceAll then getAll round-trips', async () => {
    const repo = new InMemoryStandingsRepository();
    await repo.replaceAll([s]);
    expect(await repo.getAll()).toEqual([s]);
  });
  it('replaceAll overwrites previous', async () => {
    const repo = new InMemoryStandingsRepository();
    await repo.replaceAll([s]);
    await repo.replaceAll([]);
    expect(await repo.getAll()).toEqual([]);
  });
});
