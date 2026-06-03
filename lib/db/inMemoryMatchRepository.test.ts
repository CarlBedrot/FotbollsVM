import { describe, it, expect } from 'vitest';
import type { Match } from '../domain/types';
import { InMemoryMatchRepository } from './inMemoryMatchRepository';

const base: Match[] = [
  { id: 'm1', stage: 'group', group: 'A', homeTeamId: 'a', awayTeamId: 'b', status: 'scheduled', homeScore: null, awayScore: null },
];

describe('InMemoryMatchRepository', () => {
  it('returns copies (does not leak internal refs)', async () => {
    const repo = new InMemoryMatchRepository(base);
    const got = await repo.all();
    got[0].homeScore = 9;
    expect((await repo.all())[0].homeScore).toBeNull();
  });
  it('setResult marks the match finished with the score', async () => {
    const repo = new InMemoryMatchRepository([{ ...base[0] }]);
    await repo.setResult('m1', { homeScore: 2, awayScore: 1, source: 'manual', updatedBy: 'admin' });
    const m = (await repo.all())[0];
    expect(m.status).toBe('finished');
    expect(m.homeScore).toBe(2);
    expect(m.awayScore).toBe(1);
  });
  it('throws on unknown match', async () => {
    const repo = new InMemoryMatchRepository([{ ...base[0] }]);
    await expect(repo.setResult('nope', { homeScore: 0, awayScore: 0, source: 'manual', updatedBy: null })).rejects.toThrow();
  });
});
